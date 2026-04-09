#!/usr/bin/env python
"""
Token-efficient local retrieval engine.

Design goals:
- Never pass full source files downstream.
- Keep chunks atomic and small (<= 500 tokens each).
- Retrieve at most 5 chunks and <= 1500 total tokens per request.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
SOURCES_DIR = ROOT / "knowledge_base" / "raw" / "sources"
INDEX_PATH = ROOT / "local_tool" / "cache" / "retrieval_index.json"

MAX_CHUNK_TOKENS = 500
DEFAULT_MAX_CHUNKS = 5
DEFAULT_MAX_TOTAL_TOKENS = 1500
EMBED_DIM = 256

TOKEN_RE = re.compile(r"[A-Za-z0-9_]+|[^\sA-Za-z0-9_]")


@dataclass
class Chunk:
    chunk_id: str
    text: str
    token_count: int
    metadata: Dict[str, Any]


def _tokenize(text: str) -> List[str]:
    return TOKEN_RE.findall(text)


def _token_count(text: str) -> int:
    return len(_tokenize(text))


def _truncate_to_tokens(text: str, max_tokens: int = MAX_CHUNK_TOKENS) -> str:
    tokens = _tokenize(text)
    if len(tokens) <= max_tokens:
        return text.strip()
    return " ".join(tokens[:max_tokens]).strip()


def _stable_hash(token: str) -> int:
    digest = hashlib.md5(token.encode("utf-8")).hexdigest()
    return int(digest, 16)


def embed_text(text: str, dim: int = EMBED_DIM) -> List[float]:
    """
    Lightweight deterministic embedding:
    hashed bag-of-words projected into a fixed-size vector.
    """
    vec = [0.0] * dim
    for token in _tokenize(text.lower()):
        idx = _stable_hash(token) % dim
        vec[idx] += 1.0

    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0:
        return vec
    return [v / norm for v in vec]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if len(a) != len(b):
        return 0.0
    return float(sum(x * y for x, y in zip(a, b)))


def _query_terms(text: str) -> List[str]:
    return [tok.lower() for tok in _tokenize(text) if re.match(r"^[A-Za-z0-9_]+$", tok)]


def _lexical_overlap_score(query: str, chunk_text: str) -> float:
    q_terms = set(_query_terms(query))
    if not q_terms:
        return 0.0
    c_terms = set(_query_terms(chunk_text))
    if not c_terms:
        return 0.0
    overlap = len(q_terms.intersection(c_terms))
    return overlap / max(len(q_terms), 1)


def _minimal_context_text(full_context: Any) -> str:
    if full_context is None:
        return ""
    if isinstance(full_context, str):
        return full_context.strip()
    if isinstance(full_context, dict):
        parts: List[str] = []
        for key, value in full_context.items():
            if value is None:
                continue
            if isinstance(value, (dict, list)):
                value_text = json.dumps(value, ensure_ascii=False, sort_keys=True)
            else:
                value_text = str(value)
            value_text = value_text.strip()
            if value_text:
                parts.append(f"{key}: {value_text}")
        return " | ".join(parts)
    if isinstance(full_context, list):
        return " | ".join(str(item).strip() for item in full_context if str(item).strip())
    return str(full_context).strip()


def _make_chunk(chunk_id: str, text: str, metadata: Dict[str, Any]) -> Chunk:
    compact = _truncate_to_tokens(text, MAX_CHUNK_TOKENS)
    return Chunk(
        chunk_id=chunk_id,
        text=compact,
        token_count=_token_count(compact),
        metadata=metadata,
    )


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def chunk_entities(entities: List[Dict[str, Any]]) -> List[Chunk]:
    chunks: List[Chunk] = []
    for entity in entities:
        entity_id = str(entity.get("id", "")).strip()
        if not entity_id:
            continue
        summary = (
            f"Entity {entity_id} | name={entity.get('name', '')} | type={entity.get('type', '')} "
            f"| health={entity.get('health', '')} | parent={entity.get('parent_id', '')} "
            f"| description={entity.get('description', '')}"
        )
        context = _minimal_context_text(entity.get("full_context"))
        text = summary if not context else f"{summary} | context={context}"
        chunks.append(
            _make_chunk(
                f"entity:{entity_id}",
                text,
                {"source_file": "src_data_entities.json", "type": "entity", "id": entity_id},
            )
        )
    return chunks


def chunk_relationships(relationships: List[Dict[str, Any]]) -> List[Chunk]:
    chunks: List[Chunk] = []
    for rel in relationships:
        rel_id = str(rel.get("id", "")).strip()
        if not rel_id:
            continue
        summary = (
            f"Relationship {rel_id} | type={rel.get('type', '')} | from={rel.get('from_id', '')} "
            f"| to={rel.get('to_id', '')} | description={rel.get('description', '')}"
        )
        context = _minimal_context_text(rel.get("full_context"))
        text = summary if not context else f"{summary} | context={context}"
        chunks.append(
            _make_chunk(
                f"relationship:{rel_id}",
                text,
                {"source_file": "src_data_relationships.json", "type": "relationship", "id": rel_id},
            )
        )
    return chunks


def _extract_task_list(raw_tasks_payload: Any) -> List[Dict[str, Any]]:
    if isinstance(raw_tasks_payload, list):
        return [item for item in raw_tasks_payload if isinstance(item, dict)]
    if isinstance(raw_tasks_payload, dict) and isinstance(raw_tasks_payload.get("tasks"), list):
        return [item for item in raw_tasks_payload["tasks"] if isinstance(item, dict)]
    return []


def chunk_tasks(raw_tasks_payload: Any) -> List[Chunk]:
    chunks: List[Chunk] = []
    for task in _extract_task_list(raw_tasks_payload):
        task_id = str(task.get("id", "")).strip() or str(task.get("Task ID", "")).strip()
        if not task_id:
            continue
        title = str(task.get("title", "")).strip() or str(task.get("Task Name", "")).strip()
        status = str(task.get("status", "")).strip() or str(task.get("Status", "")).strip()
        priority = str(task.get("priority", "")).strip() or str(task.get("Priority", "")).strip()
        entity = str(task.get("entity_id", "")).strip() or str(task.get("Linked Entity", "")).strip()
        description = (
            str(task.get("description", "")).strip()
            or str(task.get("Notes", "")).strip()
            or str(task.get("Ground-Truth Task", "")).strip()
        )
        summary = (
            f"Task {task_id} | title={title} | status={status} "
            f"| priority={priority} | entity={entity} "
            f"| description={description}"
        )
        context = _minimal_context_text(task.get("full_context"))
        text = summary if not context else f"{summary} | context={context}"
        chunks.append(
            _make_chunk(
                f"task:{task_id}",
                text,
                {"source_file": "src_tasks.json", "type": "task", "id": task_id},
            )
        )
    return chunks


def chunk_journal(journal_text: str) -> List[Chunk]:
    chunks: List[Chunk] = []
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", journal_text) if p.strip()]
    for idx, para in enumerate(paragraphs):
        # Keep one paragraph per chunk for atomic journaling context.
        chunk_id = f"journal:p{idx + 1}"
        text = _truncate_to_tokens(para, MAX_CHUNK_TOKENS)
        chunks.append(
            _make_chunk(
                chunk_id,
                text,
                {"source_file": "src_user_journal.md", "type": "journal", "paragraph": idx + 1},
            )
        )
    return chunks


def build_chunks_from_sources() -> List[Chunk]:
    entities = _load_json(SOURCES_DIR / "src_data_entities.json")
    relationships = _load_json(SOURCES_DIR / "src_data_relationships.json")
    tasks_payload = _load_json(SOURCES_DIR / "src_tasks.json")
    journal_text = (SOURCES_DIR / "src_user_journal.md").read_text(encoding="utf-8")

    chunks: List[Chunk] = []
    chunks.extend(chunk_entities(entities if isinstance(entities, list) else []))
    chunks.extend(chunk_relationships(relationships if isinstance(relationships, list) else []))
    chunks.extend(chunk_tasks(tasks_payload))
    chunks.extend(chunk_journal(journal_text))
    return chunks


def save_index(index_path: Path = INDEX_PATH) -> Dict[str, Any]:
    chunks = build_chunks_from_sources()
    payload_chunks: List[Dict[str, Any]] = []
    for chunk in chunks:
        payload_chunks.append(
            {
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "token_count": chunk.token_count,
                "metadata": chunk.metadata,
                "embedding": embed_text(chunk.text),
            }
        )

    payload = {
        "version": 1,
        "embed_dim": EMBED_DIM,
        "max_chunk_tokens": MAX_CHUNK_TOKENS,
        "chunks": payload_chunks,
    }
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload


def load_index(index_path: Path = INDEX_PATH) -> Dict[str, Any]:
    if not index_path.exists():
        return save_index(index_path)
    return json.loads(index_path.read_text(encoding="utf-8"))


def _iter_ranked(
    query: str,
    query_embedding: List[float],
    indexed_chunks: Iterable[Dict[str, Any]],
) -> List[Tuple[float, Dict[str, Any]]]:
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for item in indexed_chunks:
        emb = item.get("embedding")
        if not isinstance(emb, list):
            continue
        text = str(item.get("text", ""))
        cosine = _cosine_similarity(query_embedding, [float(v) for v in emb])
        lexical = _lexical_overlap_score(query, text)
        score = (0.7 * cosine) + (0.3 * lexical)
        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        item_type = str(metadata.get("type", "")).lower()
        q_terms = set(_query_terms(query))
        if {"task", "tasks", "priority", "status", "blocked", "todo", "done"} & q_terms:
            if item_type == "task":
                score += 0.2
            elif item_type == "journal":
                score += 0.08
        scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored


def retrieve(
    query: str,
    max_chunks: int = DEFAULT_MAX_CHUNKS,
    max_total_tokens: int = DEFAULT_MAX_TOTAL_TOKENS,
    index_path: Path = INDEX_PATH,
) -> Dict[str, Any]:
    max_chunks = max(1, min(max_chunks, DEFAULT_MAX_CHUNKS))
    index = load_index(index_path)
    chunks = index.get("chunks") if isinstance(index, dict) else []
    if not isinstance(chunks, list):
        chunks = []

    q_emb = embed_text(query)
    ranked = _iter_ranked(query, q_emb, chunks)
    query_term_set = set(_query_terms(query))
    prefer_task_like = bool({"task", "tasks", "priority", "status", "blocked", "todo", "done"} & query_term_set)

    selected: List[Dict[str, Any]] = []
    total_tokens = 0
    primary_ranked: List[Tuple[float, Dict[str, Any]]] = []
    secondary_ranked: List[Tuple[float, Dict[str, Any]]] = []
    for pair in ranked:
        _, item = pair
        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        item_type = str(metadata.get("type", "")).lower()
        if prefer_task_like and item_type not in {"task", "journal"}:
            secondary_ranked.append(pair)
        else:
            primary_ranked.append(pair)

    for score, item in primary_ranked + secondary_ranked:
        token_count = int(item.get("token_count", 0))
        if token_count <= 0:
            continue
        if len(selected) >= max_chunks:
            break
        if total_tokens + token_count > max_total_tokens:
            continue

        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        selected.append(
            {
                "chunk_id": str(item.get("chunk_id", "")),
                "text": str(item.get("text", "")),
                "token_count": token_count,
                "score": round(float(score), 6),
                "source_file": str(metadata.get("source_file", "")),
                "type": str(metadata.get("type", "")),
                "id": str(metadata.get("id", "")),
            }
        )
        total_tokens += token_count

    return {
        "query": query,
        "max_chunks": max_chunks,
        "max_total_tokens": max_total_tokens,
        "retrieved_tokens": total_tokens,
        "chunks": selected,
    }


def build_minimal_prompt(query: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Build a compact prompt payload:
    - no raw file dumps
    - only retrieved snippets
    - minimal schema to reduce token overhead
    """
    compact_items: List[Dict[str, str]] = []
    for chunk in chunks:
        compact_items.append(
            {
                "id": str(chunk.get("chunk_id", "")),
                "type": str(chunk.get("type", "")),
                "src": str(chunk.get("source_file", "")),
                "text": str(chunk.get("text", "")),
            }
        )

    payload = {
        "instruction": "Answer using only RelevantData. If insufficient, say what is missing.",
        "query": query,
        "RelevantData": compact_items,
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
