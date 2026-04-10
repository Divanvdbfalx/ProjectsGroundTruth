#!/usr/bin/env python
import argparse
import csv
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from retrieval_engine import (
    DEFAULT_MAX_CHUNKS,
    DEFAULT_MAX_TOTAL_TOKENS,
    INDEX_PATH,
    build_minimal_prompt,
    retrieve,
    save_index,
)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
KB_RAW_SOURCES_DIR = ROOT / "knowledge_base" / "raw" / "sources"
CANONICAL_TASKS_PATH = KB_RAW_SOURCES_DIR / "src_tasks.json"
CANONICAL_JOURNAL_PATH = KB_RAW_SOURCES_DIR / "src_user_journal.md"
DEFAULT_TASK_SNAPSHOT_PATH = ROOT / "artifacts" / "current_task_state_snapshot.json"
DEFAULT_JOURNAL_DRAFT_PATH = ROOT / "artifacts" / "journal_entry_draft.md"
INIT_DOC = ROOT / "INIT.md"
AGENTS_DOC = ROOT / "AGENTS.md"
README_DOC = ROOT / "README.md"
DATA_FILE_ALIASES = {
    "entities.json": "src_data_entities.json",
    "relationships.json": "src_data_relationships.json",
    "tasks.json": "src_tasks.json",
}
STATUS_FIELDS = ("Status", "status")
JOURNAL_REQUIRED_PREFIXES = (
    "Entry ID:",
    "Date/Time:",
    "Context Date:",
    "Context Version:",
    "Summary:",
    "Focus:",
    "Task Updates:",
    "Time Spent (h):",
    "Blockers:",
    "Next Action:",
)


def _now_local() -> datetime:
    return datetime.now().astimezone()


def _resolve_repo_relative_or_abs(path: str) -> Path:
    candidate = Path(path)
    return candidate.resolve() if candidate.is_absolute() else (ROOT / candidate).resolve()


def _read_tasks_payload(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _extract_tasks(raw_tasks_payload: Any) -> List[Dict[str, Any]]:
    if isinstance(raw_tasks_payload, list):
        return [item for item in raw_tasks_payload if isinstance(item, dict)]
    if isinstance(raw_tasks_payload, dict) and isinstance(raw_tasks_payload.get("tasks"), list):
        return [item for item in raw_tasks_payload["tasks"] if isinstance(item, dict)]
    return []


def _task_id(task: Dict[str, Any]) -> str:
    return str(task.get("Task ID", "")).strip() or str(task.get("id", "")).strip()


def _task_title(task: Dict[str, Any]) -> str:
    return str(task.get("Task Name", "")).strip() or str(task.get("title", "")).strip()


def _task_status(task: Dict[str, Any]) -> str:
    for key in STATUS_FIELDS:
        value = str(task.get(key, "")).strip()
        if value:
            return value
    return ""


def _tasks_map(tasks: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    mapped: Dict[str, Dict[str, Any]] = {}
    for task in tasks:
        task_id = _task_id(task)
        if task_id:
            mapped[task_id] = task
    return mapped


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _short_value(value: Any, limit: int = 96) -> str:
    text = _safe_str(value)
    if not text:
        return "''"
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def _diff_task_fields(before: Dict[str, Any], after: Dict[str, Any]) -> List[Dict[str, Any]]:
    changed: List[Dict[str, Any]] = []
    keys = sorted(set(before.keys()) | set(after.keys()))
    for key in keys:
        before_val = before.get(key)
        after_val = after.get(key)
        if before_val != after_val:
            changed.append({"field": key, "before": before_val, "after": after_val})
    return changed


def _next_journal_entry_id(journal_text: str, date_yyyymmdd: str) -> str:
    pattern = re.compile(rf"Entry ID:\s*jrnl_{re.escape(date_yyyymmdd)}_(\d+)")
    indices = [int(match.group(1)) for match in pattern.finditer(journal_text)]
    next_idx = max(indices) + 1 if indices else 1
    return f"jrnl_{date_yyyymmdd}_{next_idx:02d}"


def _next_context_version(journal_text: str, context_date: str) -> str:
    pattern = re.compile(rf"Context Version:\s*{re.escape(context_date)}\.(\d+)")
    versions = [int(match.group(1)) for match in pattern.finditer(journal_text)]
    next_idx = max(versions) + 1 if versions else 1
    return f"{context_date}.{next_idx}"


def _render_task_update_line(diff_payload: Dict[str, Any]) -> str:
    parts: List[str] = []

    for item in diff_payload["status_changes"]:
        title = item.get("title") or item["task_id"]
        parts.append(
            f"`{item['task_id']}` ({title}) status: `{_short_value(item['before'])}` -> `{_short_value(item['after'])}`"
        )

    for item in diff_payload["field_changes"]:
        title = item.get("title") or item["task_id"]
        field_parts = []
        for field_change in item["changes"]:
            field_name = field_change["field"]
            before = _short_value(field_change["before"])
            after = _short_value(field_change["after"])
            field_parts.append(f"{field_name}: `{before}` -> `{after}`")
        parts.append(f"`{item['task_id']}` ({title}) fields updated: " + "; ".join(field_parts))

    for item in diff_payload["added"]:
        title = item.get("title") or item["task_id"]
        status = item.get("status") or "unknown"
        parts.append(f"Added task `{item['task_id']}` ({title}) with status `{status}`")

    for item in diff_payload["removed"]:
        title = item.get("title") or item["task_id"]
        status = item.get("status") or "unknown"
        parts.append(f"Removed task `{item['task_id']}` ({title}) previously in status `{status}`")

    if not parts:
        return "No task deltas were detected between snapshot and current task state."
    return " | ".join(parts)


def _build_task_diff(snapshot_tasks: Dict[str, Dict[str, Any]], current_tasks: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    status_changes: List[Dict[str, Any]] = []
    field_changes: List[Dict[str, Any]] = []
    added: List[Dict[str, Any]] = []
    removed: List[Dict[str, Any]] = []

    snapshot_ids = set(snapshot_tasks.keys())
    current_ids = set(current_tasks.keys())

    for task_id in sorted(snapshot_ids - current_ids):
        task = snapshot_tasks[task_id]
        removed.append(
            {
                "task_id": task_id,
                "title": _task_title(task),
                "status": _task_status(task),
            }
        )

    for task_id in sorted(current_ids - snapshot_ids):
        task = current_tasks[task_id]
        added.append(
            {
                "task_id": task_id,
                "title": _task_title(task),
                "status": _task_status(task),
            }
        )

    for task_id in sorted(snapshot_ids & current_ids):
        before = snapshot_tasks[task_id]
        after = current_tasks[task_id]

        before_status = _task_status(before)
        after_status = _task_status(after)
        if before_status != after_status:
            status_changes.append(
                {
                    "task_id": task_id,
                    "title": _task_title(after) or _task_title(before),
                    "before": before_status,
                    "after": after_status,
                }
            )

        changed_fields = _diff_task_fields(before, after)
        non_status_changes = [change for change in changed_fields if change["field"] not in STATUS_FIELDS]
        if non_status_changes:
            field_changes.append(
                {
                    "task_id": task_id,
                    "title": _task_title(after) or _task_title(before),
                    "changes": non_status_changes,
                }
            )

    return {
        "status_changes": status_changes,
        "field_changes": field_changes,
        "added": added,
        "removed": removed,
        "counts": {
            "status_changes": len(status_changes),
            "field_changes": len(field_changes),
            "added": len(added),
            "removed": len(removed),
        },
    }


def _build_snapshot_payload(tasks_path: Path) -> Dict[str, Any]:
    raw_payload = _read_tasks_payload(tasks_path)
    tasks = _extract_tasks(raw_payload)
    tasks_by_id = _tasks_map(tasks)
    now = _now_local()
    return {
        "snapshot_type": "current_task_state",
        "generated_at": now.isoformat(),
        "generated_at_local": now.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "source_tasks_path": str(tasks_path),
        "task_count": len(tasks_by_id),
        "tasks_by_id": tasks_by_id,
    }


def _write_snapshot_file(tasks_path: Path, output_path: Path) -> Dict[str, Any]:
    snapshot_payload = _build_snapshot_payload(tasks_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(snapshot_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return snapshot_payload


def cmd_snapshot_task_state(tasks_path: str, output: str, as_json: bool) -> None:
    resolved_tasks_path = _resolve_repo_relative_or_abs(tasks_path)
    resolved_output_path = _resolve_repo_relative_or_abs(output)

    snapshot_payload = _write_snapshot_file(resolved_tasks_path, resolved_output_path)

    if as_json:
        print(
            json.dumps(
                {
                    "ok": True,
                    "snapshot_path": str(resolved_output_path),
                    "task_count": snapshot_payload["task_count"],
                    "generated_at": snapshot_payload["generated_at"],
                },
                ensure_ascii=False,
            )
        )
        return

    print(f"Wrote task snapshot to {resolved_output_path} ({snapshot_payload['task_count']} tasks)")


def _prepare_journal_entry_from_diff(
    snapshot_path: Path,
    tasks_path: Path,
    journal_path: Path,
    summary: Optional[str],
    focus: Optional[str],
    time_spent: str,
    blockers: str,
    next_action: str,
) -> Dict[str, Any]:
    snapshot_payload = json.loads(snapshot_path.read_text(encoding="utf-8"))
    snapshot_tasks = snapshot_payload.get("tasks_by_id")
    if not isinstance(snapshot_tasks, dict):
        raise SystemExit(f"Invalid snapshot format in {snapshot_path}: missing tasks_by_id object.")
    snapshot_tasks = {str(key): value for key, value in snapshot_tasks.items() if isinstance(value, dict)}

    raw_current_payload = _read_tasks_payload(tasks_path)
    current_tasks = _tasks_map(_extract_tasks(raw_current_payload))
    diff_payload = _build_task_diff(snapshot_tasks, current_tasks)

    now = _now_local()
    context_date = now.strftime("%Y-%m-%d")
    date_key = now.strftime("%Y%m%d")
    journal_text = journal_path.read_text(encoding="utf-8") if journal_path.exists() else ""
    entry_id = _next_journal_entry_id(journal_text, date_key)
    context_version = _next_context_version(journal_text, context_date)

    summary_line = summary or (
        "Captured task-state delta from snapshot: "
        f"{diff_payload['counts']['status_changes']} status changes, "
        f"{diff_payload['counts']['field_changes']} non-status field changes, "
        f"{diff_payload['counts']['added']} additions, "
        f"{diff_payload['counts']['removed']} removals."
    )
    focus_line = focus or "Task status and parameter delta tracking from non-canonical snapshot."
    task_updates_line = _render_task_update_line(diff_payload)

    entry_lines = [
        f"Entry ID: {entry_id}  ",
        f"Date/Time: {now.strftime('%Y-%m-%d %H:%M %Z')}  ",
        f"Context Date: {context_date}  ",
        f"Context Version: {context_version}  ",
        f"Summary: {summary_line}  ",
        f"Focus: {focus_line}  ",
        f"Task Updates: {task_updates_line}  ",
        f"Time Spent (h): {time_spent}  ",
        f"Blockers: {blockers}  ",
        f"Next Action: {next_action}",
    ]

    return {
        "snapshot_path": str(snapshot_path),
        "tasks_path": str(tasks_path),
        "journal_path": str(journal_path),
        "entry_id": entry_id,
        "context_version": context_version,
        "diff": diff_payload,
        "entry_text": "\n".join(entry_lines),
    }


def _extract_entry_text_from_draft(draft_text: str) -> str:
    start_marker = "<!-- JOURNAL_ENTRY_START -->"
    end_marker = "<!-- JOURNAL_ENTRY_END -->"
    start_idx = draft_text.find(start_marker)
    end_idx = draft_text.find(end_marker)
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        body = draft_text[start_idx + len(start_marker) : end_idx].strip()
        if body:
            return body

    lines = [line.rstrip() for line in draft_text.splitlines()]
    start_line = next((idx for idx, line in enumerate(lines) if line.startswith("Entry ID:")), None)
    if start_line is None:
        return ""
    return "\n".join(lines[start_line:]).strip()


def _validate_journal_entry_text(entry_text: str) -> List[str]:
    errors: List[str] = []
    lines = [line.strip() for line in entry_text.splitlines() if line.strip()]
    for prefix in JOURNAL_REQUIRED_PREFIXES:
        if not any(line.startswith(prefix) for line in lines):
            errors.append(f"Missing required field line with prefix '{prefix}'")
    return errors


def cmd_journal_entry_kickoff(
    snapshot_path: str,
    tasks_path: str,
    journal_path: str,
    draft_output: str,
    summary: Optional[str],
    focus: Optional[str],
    time_spent: str,
    blockers: str,
    next_action: str,
    write_draft: bool,
    as_json: bool,
) -> None:
    resolved_snapshot_path = _resolve_repo_relative_or_abs(snapshot_path)
    resolved_tasks_path = _resolve_repo_relative_or_abs(tasks_path)
    resolved_journal_path = _resolve_repo_relative_or_abs(journal_path)
    resolved_draft_output = _resolve_repo_relative_or_abs(draft_output)

    prepared = _prepare_journal_entry_from_diff(
        snapshot_path=resolved_snapshot_path,
        tasks_path=resolved_tasks_path,
        journal_path=resolved_journal_path,
        summary=summary,
        focus=focus,
        time_spent=time_spent,
        blockers=blockers,
        next_action=next_action,
    )

    draft_lines = [
        "# Journal Entry Draft",
        "",
        "Review and edit this entry, then run:",
        f"`python local_tool/query.py journal-entry-finalize --draft {resolved_draft_output}`",
        "",
        "<!-- JOURNAL_ENTRY_START -->",
        prepared["entry_text"],
        "<!-- JOURNAL_ENTRY_END -->",
        "",
        "## Diff Summary",
        f"- status_changes: {prepared['diff']['counts']['status_changes']}",
        f"- field_changes: {prepared['diff']['counts']['field_changes']}",
        f"- added: {prepared['diff']['counts']['added']}",
        f"- removed: {prepared['diff']['counts']['removed']}",
    ]
    draft_text = "\n".join(draft_lines).rstrip() + "\n"
    if write_draft:
        resolved_draft_output.parent.mkdir(parents=True, exist_ok=True)
        resolved_draft_output.write_text(draft_text, encoding="utf-8")

    payload = {
        "ok": True,
        "write_draft": write_draft,
        "draft_path": str(resolved_draft_output) if write_draft else None,
        "entry_id": prepared["entry_id"],
        "context_version": prepared["context_version"],
        "diff": prepared["diff"]["counts"],
        "entry_text": prepared["entry_text"],
    }
    if as_json:
        print(json.dumps(payload, ensure_ascii=False))
        return
    if write_draft:
        print(f"Wrote journal draft to {resolved_draft_output}")
        print(
            "Review/edit the draft, then finalize with: "
            f"python local_tool/query.py journal-entry-finalize --draft {resolved_draft_output}"
        )
    else:
        print("Journal entry draft preview (not saved):\n")
        print(prepared["entry_text"])
        print("\nTo save draft for editing:")
        print(f"python local_tool/query.py journal-entry-kickoff --write-draft --draft-output {resolved_draft_output}")


def cmd_journal_entry_finalize(
    draft_path: str,
    journal_path: str,
    tasks_path: str,
    snapshot_output: str,
    as_json: bool,
) -> None:
    resolved_draft_path = _resolve_repo_relative_or_abs(draft_path)
    resolved_journal_path = _resolve_repo_relative_or_abs(journal_path)
    resolved_tasks_path = _resolve_repo_relative_or_abs(tasks_path)
    resolved_snapshot_output = _resolve_repo_relative_or_abs(snapshot_output)

    draft_text = resolved_draft_path.read_text(encoding="utf-8")
    entry_text = _extract_entry_text_from_draft(draft_text)
    if not entry_text:
        raise SystemExit(f"Could not find journal entry body in draft: {resolved_draft_path}")

    validation_errors = _validate_journal_entry_text(entry_text)
    if validation_errors:
        raise SystemExit("Draft validation failed:\n- " + "\n- ".join(validation_errors))

    if resolved_journal_path.exists():
        existing = resolved_journal_path.read_text(encoding="utf-8").rstrip()
        updated = f"{existing}\n\n---\n\n{entry_text}\n" if existing else f"{entry_text}\n"
    else:
        updated = f"{entry_text}\n"
    resolved_journal_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_journal_path.write_text(updated, encoding="utf-8")

    snapshot_payload = _write_snapshot_file(resolved_tasks_path, resolved_snapshot_output)

    payload = {
        "ok": True,
        "journal_path": str(resolved_journal_path),
        "snapshot_path": str(resolved_snapshot_output),
        "snapshot_task_count": snapshot_payload["task_count"],
    }
    if as_json:
        print(json.dumps(payload, ensure_ascii=False))
        return
    print(f"Finalized journal entry into {resolved_journal_path}")
    print(f"Updated task snapshot at {resolved_snapshot_output} ({snapshot_payload['task_count']} tasks)")


def cmd_journal_from_task_diff(
    snapshot_path: str,
    tasks_path: str,
    journal_path: str,
    summary: Optional[str],
    focus: Optional[str],
    time_spent: str,
    blockers: str,
    next_action: str,
    dry_run: bool,
    as_json: bool,
) -> None:
    resolved_snapshot_path = _resolve_repo_relative_or_abs(snapshot_path)
    resolved_tasks_path = _resolve_repo_relative_or_abs(tasks_path)
    resolved_journal_path = _resolve_repo_relative_or_abs(journal_path)

    snapshot_payload = json.loads(resolved_snapshot_path.read_text(encoding="utf-8"))
    snapshot_tasks = snapshot_payload.get("tasks_by_id")
    if not isinstance(snapshot_tasks, dict):
        raise SystemExit(f"Invalid snapshot format in {resolved_snapshot_path}: missing tasks_by_id object.")
    snapshot_tasks = {str(key): value for key, value in snapshot_tasks.items() if isinstance(value, dict)}

    raw_current_payload = _read_tasks_payload(resolved_tasks_path)
    current_tasks = _tasks_map(_extract_tasks(raw_current_payload))
    diff_payload = _build_task_diff(snapshot_tasks, current_tasks)

    now = _now_local()
    context_date = now.strftime("%Y-%m-%d")
    date_key = now.strftime("%Y%m%d")
    journal_text = resolved_journal_path.read_text(encoding="utf-8") if resolved_journal_path.exists() else ""
    entry_id = _next_journal_entry_id(journal_text, date_key)
    context_version = _next_context_version(journal_text, context_date)

    summary_line = summary or (
        "Captured task-state delta from snapshot: "
        f"{diff_payload['counts']['status_changes']} status changes, "
        f"{diff_payload['counts']['field_changes']} non-status field changes, "
        f"{diff_payload['counts']['added']} additions, "
        f"{diff_payload['counts']['removed']} removals."
    )
    focus_line = focus or "Task status and parameter delta tracking from non-canonical snapshot."
    task_updates_line = _render_task_update_line(diff_payload)

    entry_lines = [
        f"Entry ID: {entry_id}  ",
        f"Date/Time: {now.strftime('%Y-%m-%d %H:%M %Z')}  ",
        f"Context Date: {context_date}  ",
        f"Context Version: {context_version}  ",
        f"Summary: {summary_line}  ",
        f"Focus: {focus_line}  ",
        f"Task Updates: {task_updates_line}  ",
        f"Time Spent (h): {time_spent}  ",
        f"Blockers: {blockers}  ",
        f"Next Action: {next_action}",
    ]
    entry_text = "\n".join(entry_lines)

    if as_json:
        print(
            json.dumps(
                {
                    "ok": True,
                    "dry_run": dry_run,
                    "snapshot_path": str(resolved_snapshot_path),
                    "tasks_path": str(resolved_tasks_path),
                    "journal_path": str(resolved_journal_path),
                    "entry_id": entry_id,
                    "context_version": context_version,
                    "diff": diff_payload["counts"],
                    "entry_text": entry_text,
                },
                ensure_ascii=False,
            )
        )
        return

    if dry_run:
        print("Dry run only. Journal entry preview:\n")
        print(entry_text)
        return

    if resolved_journal_path.exists():
        existing = resolved_journal_path.read_text(encoding="utf-8").rstrip()
        if existing:
            updated = f"{existing}\n\n---\n\n{entry_text}\n"
        else:
            updated = f"{entry_text}\n"
    else:
        updated = f"{entry_text}\n"
    resolved_journal_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_journal_path.write_text(updated, encoding="utf-8")

    print(f"Appended journal entry {entry_id} to {resolved_journal_path}")
    print(
        "Diff summary: "
        f"status_changes={diff_payload['counts']['status_changes']}, "
        f"field_changes={diff_payload['counts']['field_changes']}, "
        f"added={diff_payload['counts']['added']}, "
        f"removed={diff_payload['counts']['removed']}"
    )


def resolve_data_path(name: str) -> Path:
    candidates: List[Path] = []

    legacy_path = DATA_DIR / name
    candidates.append(legacy_path)
    if legacy_path.exists():
        return legacy_path

    alias = DATA_FILE_ALIASES.get(name)
    if alias:
        canonical_path = KB_RAW_SOURCES_DIR / alias
        candidates.append(canonical_path)
        if canonical_path.exists():
            return canonical_path

    joined = ", ".join(str(path) for path in candidates)
    raise FileNotFoundError(f"Could not find required data file '{name}'. Checked: {joined}")


def load_json(name: str) -> List[Dict[str, Any]]:
    payload = json.loads(resolve_data_path(name).read_text(encoding="utf-8"))
    if name == "tasks.json" and isinstance(payload, dict):
        tasks = payload.get("tasks")
        if isinstance(tasks, list):
            product_tasks = [
                task
                for task in tasks
                if isinstance(task, dict)
                and isinstance(task.get("id"), str)
                and isinstance(task.get("entity_id"), str)
                and isinstance(task.get("title"), str)
            ]
            return product_tasks
    if isinstance(payload, list):
        return payload
    raise ValueError(f"Unexpected JSON shape for '{name}'. Expected a list.")


def load_all() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    entities = load_json("entities.json")
    relationships = load_json("relationships.json")
    tasks = load_json("tasks.json")
    return entities, relationships, tasks


def index_entities(entities: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {e["id"]: e for e in entities}


def find_entity(entities: List[Dict[str, Any]], key: str) -> Dict[str, Any]:
    key_lower = key.lower()
    for e in entities:
        if e["id"] == key or e["name"].lower() == key_lower:
            return e
    raise SystemExit(f"Entity not found: {key}")


def cmd_summary(entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> None:
    by_health = {"green": 0, "yellow": 0, "red": 0, "blue": 0}
    for e in entities:
        by_health[e["health"]] = by_health.get(e["health"], 0) + 1

    red_subs = [e for e in entities if e["type"] == "subcategory" and e["health"] == "red"]
    print("=== P-Zerø Local Ground Truth Summary ===")
    print(f"Entities: {len(entities)} | Relationships: {len(relationships)} | Tasks: {len(tasks)}")
    print(
        f"Health: green={by_health['green']} yellow={by_health['yellow']} "
        f"red={by_health['red']} blue={by_health['blue']}"
    )
    print("Red subcategories:")
    for e in sorted(red_subs, key=lambda x: x["name"]):
        print(f"- {e['id']}: {e['name']}")


def cmd_show(entity: Dict[str, Any], relationships: List[Dict[str, Any]], tasks: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    print(json.dumps(entity, indent=2, ensure_ascii=False))
    print("\nRelationships:")
    linked = [r for r in relationships if r["from_id"] == entity["id"] or r["to_id"] == entity["id"]]
    if not linked:
        print("- none")
    for r in linked:
        src = entity_index.get(r["from_id"], {"name": r["from_id"]})["name"]
        dst = entity_index.get(r["to_id"], {"name": r["to_id"]})["name"]
        print(f"- {r['type']}: {src} -> {dst} | {r['description']}")

    print("\nTasks:")
    linked_tasks = [t for t in tasks if t["entity_id"] == entity["id"]]
    if not linked_tasks:
        print("- none")
    for t in linked_tasks:
        print(f"- [{t['priority']}] {t['title']} ({t['status']})")


def cmd_blockers(entity: Dict[str, Any], relationships: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    blockers = [r for r in relationships if r["to_id"] == entity["id"] and r["type"] == "blocks"]
    if not blockers:
        print(f"No explicit blockers found for {entity['name']}.")
        return
    print(f"Blockers for {entity['name']}:")
    for r in blockers:
        src = entity_index.get(r["from_id"], {"name": r["from_id"]})["name"]
        print(f"- {src}: {r['description']}")


def cmd_priorities(entities: List[Dict[str, Any]], tasks: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    red_ids = {e["id"] for e in entities if e["type"] == "subcategory" and e["health"] == "red"}
    selected = [t for t in tasks if t["entity_id"] in red_ids]
    selected.sort(key=lambda t: (order.get(t["priority"], 99), t["entity_id"], t["title"]))

    print("Priority tasks for RED subcategories:")
    for t in selected:
        entity_name = entity_index.get(t["entity_id"], {"name": t["entity_id"]})["name"]
        print(f"- [{t['priority']}] {entity_name}: {t['title']}")


def cmd_what_if(entity: Dict[str, Any], relationships: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    outgoing = [r for r in relationships if r["from_id"] == entity["id"]]
    if not outgoing:
        print(f"No explicit downstream effects found for {entity['name']}.")
        return
    print(f"If we fix {entity['name']}, likely downstream improvements:")
    for r in outgoing:
        dst = entity_index.get(r["to_id"], {"name": r["to_id"]})["name"]
        print(f"- ({r['type']}) {dst}: {r['description']}")


def cmd_bundle(entity: Dict[str, Any], relationships: List[Dict[str, Any]], tasks: List[Dict[str, Any]], entities: List[Dict[str, Any]]) -> None:
    related_rel = [r for r in relationships if r["from_id"] == entity["id"] or r["to_id"] == entity["id"]]
    related_ids = {r["from_id"] for r in related_rel} | {r["to_id"] for r in related_rel}
    related_ids.discard(entity["id"])
    related_entities = [e for e in entities if e["id"] in related_ids]
    related_tasks = [t for t in tasks if t["entity_id"] == entity["id"]]

    payload = {
        "entity": entity,
        "related_entities": related_entities,
        "relationships": related_rel,
        "tasks": related_tasks,
    }
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def _mermaid_quote(text: str) -> str:
    return '"' + text.replace('"', '\\"') + '"'


def _entity_label(entity: Dict[str, Any]) -> str:
    return f"{entity['name']} [{entity['health'].upper()}]"


def _task_label(task: Dict[str, Any]) -> str:
    return f"[{task['priority'].upper()}] {task['title']} ({task['status']})"


def cmd_mindmap(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output: str,
) -> None:
    entity_index = index_entities(entities)
    children: Dict[str, List[Dict[str, Any]]] = {}
    tasks_by_entity: Dict[str, List[Dict[str, Any]]] = {}
    by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for entity in entities:
        parent = entity.get("parent_id")
        if not parent:
            continue
        children.setdefault(parent, []).append(entity)

    for task in tasks:
        tasks_by_entity.setdefault(task["entity_id"], []).append(task)
        priority = task.get("priority", "")
        by_priority[priority] = by_priority.get(priority, 0) + 1

    for group in children.values():
        group.sort(key=lambda e: e["name"])
    for group in tasks_by_entity.values():
        group.sort(key=lambda t: (t["priority"], t["title"]))

    root_entities = [e for e in entities if e["type"] == "product"]
    if not root_entities:
        raise SystemExit("No product entity found to use as mindmap root.")
    root = root_entities[0]

    lines: List[str] = []
    lines.append("mindmap")
    lines.append(f"  root(({root['name']}))")

    for category in children.get(root["id"], []):
        lines.append(f"    {_mermaid_quote(_entity_label(category))}")
        for subcategory in children.get(category["id"], []):
            lines.append(f"      {_mermaid_quote(_entity_label(subcategory))}")
            sub_tasks = tasks_by_entity.get(subcategory["id"], [])
            if sub_tasks:
                lines.append(f"        {_mermaid_quote(f'Tasks ({len(sub_tasks)})')}")
                for task in sub_tasks:
                    lines.append(f"          {_mermaid_quote(_task_label(task))}")

    lines.append(f"    {_mermaid_quote(f'Cross-Entity Relationships ({len(relationships)})')}")
    for rel in relationships:
        src = entity_index.get(rel["from_id"], {"name": rel["from_id"]})["name"]
        dst = entity_index.get(rel["to_id"], {"name": rel["to_id"]})["name"]
        rel_text = f"{src} --{rel['type']}--> {dst}"
        lines.append(f"      {_mermaid_quote(rel_text)}")

    totals = (
        f"Totals: entities={len(entities)}, tasks={len(tasks)}, "
        f"critical={by_priority['critical']}, high={by_priority['high']}, "
        f"medium={by_priority['medium']}, low={by_priority['low']}"
    )
    lines.append(f"    {_mermaid_quote(totals)}")

    output_path = (ROOT / output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote Mermaid mindmap to {output_path}")


def cmd_mindmap_ui(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output: str,
) -> None:
    payload = {
        "entities": entities,
        "relationships": relationships,
        "tasks": tasks,
    }
    data_json = json.dumps(payload, ensure_ascii=False)
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>P-Zerø Data Mindmap</title>
  <style>
    :root {{
      --bg: #0b1320;
      --panel: #111d31;
      --text: #e8eef8;
      --muted: #9fb2cf;
      --line: #2a3a55;
      --green: #28c76f;
      --yellow: #ffb020;
      --red: #ea5455;
      --link-blocks: #f66;
      --link-enables: #4cc38a;
      --link-impacts: #6fb5ff;
      --link-depends: #ffb86b;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: radial-gradient(circle at 20% 10%, #13213a 0%, var(--bg) 52%);
      color: var(--text);
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      height: 100vh;
      overflow: hidden;
    }}
    .layout {{
      display: grid;
      grid-template-columns: 1fr 340px;
      height: 100vh;
    }}
    .canvas-wrap {{
      position: relative;
      border-right: 1px solid var(--line);
    }}
    .controls {{
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 20;
      display: flex;
      gap: 8px;
      align-items: center;
      background: rgba(10, 18, 30, 0.84);
      border: 1px solid #2d4263;
      border-radius: 10px;
      padding: 8px 10px;
      color: var(--muted);
      font-size: 12px;
    }}
    .controls button {{
      border: 1px solid #36537c;
      background: #1a2b45;
      color: var(--text);
      border-radius: 8px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    }}
    .controls button:hover {{
      background: #223a5f;
    }}
    svg {{
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }}
    svg.dragging {{
      cursor: grabbing;
    }}
    .node {{
      cursor: pointer;
      transition: opacity 120ms ease;
    }}
    .node circle {{
      stroke: #0f1726;
      stroke-width: 1.2;
    }}
    .node.task circle {{
      stroke-width: 0.9;
    }}
    .node text {{
      fill: var(--text);
      font-size: 11px;
      paint-order: stroke;
      stroke: #0a1321;
      stroke-width: 2;
      stroke-linejoin: round;
      pointer-events: none;
    }}
    .edge {{
      stroke: #3b5b83;
      stroke-width: 1.2;
      fill: none;
      opacity: 0.5;
    }}
    .edge.rel {{
      stroke-width: 1.8;
      stroke-dasharray: 5 4;
      opacity: 0.9;
      cursor: pointer;
    }}
    .side {{
      background: linear-gradient(180deg, rgba(17,29,49,0.96), rgba(9,16,28,0.96));
      padding: 14px;
      overflow: auto;
    }}
    .side h2 {{
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }}
    .meta {{
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 10px;
    }}
    .section-title {{
      font-size: 11px;
      letter-spacing: 0.05em;
      color: #87a0c7;
      text-transform: uppercase;
      margin-top: 12px;
      margin-bottom: 4px;
    }}
    .text {{
      color: var(--text);
      font-size: 13px;
      line-height: 1.35;
      margin: 0;
    }}
    .chip {{
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
      border: 1px solid transparent;
    }}
    .chip.green {{ color: #0d2b18; background: #6be49b; border-color: #59d88c; }}
    .chip.yellow {{ color: #3f2a02; background: #ffd27a; border-color: #f5c363; }}
    .chip.red {{ color: #3b0d0f; background: #ff9d9d; border-color: #f48b8b; }}
    .tooltip {{
      position: absolute;
      pointer-events: none;
      z-index: 50;
      max-width: 320px;
      background: rgba(12, 21, 36, 0.95);
      border: 1px solid #355177;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      color: var(--text);
      display: none;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    }}
  </style>
</head>
<body>
  <div class="layout">
    <div class="canvas-wrap">
      <div class="controls">
        <button id="resetView">Reset View</button>
        <span>Drag to pan, scroll to zoom, hover nodes for descriptions</span>
      </div>
      <div class="tooltip" id="tooltip"></div>
      <svg id="map" viewBox="-1300 -900 2600 1800" aria-label="P-Zerø mindmap">
        <g id="viewport"></g>
      </svg>
    </div>
    <aside class="side" id="detail"></aside>
  </div>

  <script>
    const DATA = {data_json};
    const svg = document.getElementById("map");
    const viewport = document.getElementById("viewport");
    const detail = document.getElementById("detail");
    const tooltip = document.getElementById("tooltip");
    const resetBtn = document.getElementById("resetView");

    const healthColor = {{ green: "#28c76f", yellow: "#ffb020", red: "#ea5455" }};
    const relColor = {{
      blocks: "var(--link-blocks)",
      enables: "var(--link-enables)",
      impacts: "var(--link-impacts)",
      depends_on: "var(--link-depends)"
    }};

    const entitiesById = Object.fromEntries(DATA.entities.map(e => [e.id, e]));
    const tasksByEntity = DATA.tasks.reduce((acc, t) => {{
      if (!acc[t.entity_id]) acc[t.entity_id] = [];
      acc[t.entity_id].push(t);
      return acc;
    }}, {{}});
    Object.values(tasksByEntity).forEach(arr => arr.sort((a, b) => (a.priority + a.title).localeCompare(b.priority + b.title)));

    const root = DATA.entities.find(e => e.type === "product");
    const categories = DATA.entities.filter(e => e.parent_id === root.id).sort((a, b) => a.name.localeCompare(b.name));
    const subcatsByCategory = {{}};
    categories.forEach(cat => {{
      subcatsByCategory[cat.id] = DATA.entities.filter(e => e.parent_id === cat.id).sort((a, b) => a.name.localeCompare(b.name));
    }});

    function mkEl(name, attrs = {{}}, parent = null) {{
      const el = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      if (parent) parent.appendChild(el);
      return el;
    }}

    function polar(r, deg) {{
      const rad = deg * Math.PI / 180;
      return {{ x: Math.cos(rad) * r, y: Math.sin(rad) * r }};
    }}

    const nodes = [];
    const treeEdges = [];
    const positions = {{}};
    const nodeMeta = {{}};
    const interaction = {{ x: 0, y: 0, scale: 1 }};

    function addNode(meta, x, y, r) {{
      positions[meta.id] = {{ x, y }};
      nodeMeta[meta.id] = meta;
      nodes.push({{ ...meta, x, y, r }});
    }}

    addNode({{ id: root.id, kind: "entity", entityType: root.type, name: root.name, health: root.health, description: root.full_context?.description || "", current_state: root.current_state || "", target_state: root.target_state || "", raw: root }}, 0, 0, 24);

    const catRadius = 360;
    const catStep = 360 / Math.max(1, categories.length);
    categories.forEach((cat, idx) => {{
      const catAngle = -90 + idx * catStep;
      const pCat = polar(catRadius, catAngle);
      addNode({{ id: cat.id, kind: "entity", entityType: cat.type, name: cat.name, health: cat.health, description: cat.full_context?.description || "", current_state: cat.current_state || "", target_state: cat.target_state || "", raw: cat }}, pCat.x, pCat.y, 16);
      treeEdges.push({{ from: root.id, to: cat.id }});

      const subs = subcatsByCategory[cat.id] || [];
      const arc = Math.min(80, 18 * Math.max(2, subs.length));
      const subRadius = 290;
      subs.forEach((sub, sIdx) => {{
        const subAngle = subs.length === 1 ? catAngle : catAngle - arc / 2 + (arc * sIdx / (subs.length - 1));
        const pSub = {{ x: pCat.x + polar(subRadius, subAngle).x, y: pCat.y + polar(subRadius, subAngle).y }};
        addNode({{ id: sub.id, kind: "entity", entityType: sub.type, name: sub.name, health: sub.health, description: sub.full_context?.description || "", current_state: sub.current_state || "", target_state: sub.target_state || "", raw: sub }}, pSub.x, pSub.y, 11);
        treeEdges.push({{ from: cat.id, to: sub.id }});

        const tList = tasksByEntity[sub.id] || [];
        const tArc = Math.min(70, 22 * Math.max(2, tList.length));
        const tRadius = 160;
        tList.forEach((task, tIdx) => {{
          const tAngle = tList.length === 1 ? subAngle : subAngle - tArc / 2 + (tArc * tIdx / (tList.length - 1));
          const pTask = {{ x: pSub.x + polar(tRadius, tAngle).x, y: pSub.y + polar(tRadius, tAngle).y }};
          const taskId = "task:" + task.id;
          addNode({{
            id: taskId,
            kind: "task",
            entityType: "task",
            name: task.title,
            health: null,
            priority: task.priority,
            status: task.status,
            description: task.description || "",
            current_state: "",
            target_state: "",
            raw: task
          }}, pTask.x, pTask.y, 7);
          treeEdges.push({{ from: sub.id, to: taskId }});
        }});
      }});
    }});

    function relPath(a, b) {{
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const curve = 0.22;
      const cx = mx - dy * curve;
      const cy = my + dx * curve;
      return `M ${{a.x}} ${{a.y}} Q ${{cx}} ${{cy}} ${{b.x}} ${{b.y}}`;
    }}

    function colorForNode(n) {{
      if (n.kind === "task") return "#6fa8ff";
      return healthColor[n.health] || "#adbcd6";
    }}

    function el(tag, className, text) {{
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }}

    function formatTitle(meta) {{
      if (meta.kind === "task") return meta.name;
      return meta.name;
    }}

    function clearDetails() {{
      detail.innerHTML = "";
    }}

    function updateDetails(meta, relInfo = null) {{
      clearDetails();
      if (relInfo) {{
        detail.appendChild(el("h2", "", "Relationship"));
        const m = el("div", "meta", `${{relInfo.type}}`);
        detail.appendChild(m);
        detail.appendChild(el("div", "section-title", "From"));
        detail.appendChild(el("p", "text", relInfo.fromName));
        detail.appendChild(el("div", "section-title", "To"));
        detail.appendChild(el("p", "text", relInfo.toName));
        detail.appendChild(el("div", "section-title", "Description"));
        detail.appendChild(el("p", "text", relInfo.description || "No description."));
        return;
      }}

      detail.appendChild(el("h2", "", formatTitle(meta)));
      const metaLine = [];
      if (meta.entityType) metaLine.push(meta.entityType);
      if (meta.kind === "task") {{
        metaLine.push(meta.priority || "n/a");
        metaLine.push(meta.status || "n/a");
      }}
      detail.appendChild(el("div", "meta", metaLine.join(" | ")));

      if (meta.health) {{
        const chip = el("span", "chip " + meta.health, meta.health.toUpperCase());
        detail.appendChild(chip);
      }}
      if (meta.description) {{
        detail.appendChild(el("div", "section-title", "Description"));
        detail.appendChild(el("p", "text", meta.description));
      }}
      if (meta.current_state) {{
        detail.appendChild(el("div", "section-title", "Current State"));
        detail.appendChild(el("p", "text", meta.current_state));
      }}
      if (meta.target_state) {{
        detail.appendChild(el("div", "section-title", "Target State"));
        detail.appendChild(el("p", "text", meta.target_state));
      }}
      const ctx = meta.raw?.full_context;
      if (ctx) {{
        detail.appendChild(el("div", "section-title", "Context"));
        Object.entries(ctx).forEach(([k, v]) => {{
          if (typeof v !== "string" || !v) return;
          detail.appendChild(el("p", "text", `${{k}}: ${{v}}`));
        }});
      }}
    }}

    function showTooltip(evt, html) {{
      tooltip.innerHTML = html;
      tooltip.style.display = "block";
      tooltip.style.left = `${{evt.clientX + 12}}px`;
      tooltip.style.top = `${{evt.clientY + 12}}px`;
    }}

    function hideTooltip() {{
      tooltip.style.display = "none";
    }}

    function render() {{
      viewport.innerHTML = "";
      treeEdges.forEach(edge => {{
        const a = positions[edge.from];
        const b = positions[edge.to];
        mkEl("path", {{
          d: `M ${{a.x}} ${{a.y}} L ${{b.x}} ${{b.y}}`,
          class: "edge"
        }}, viewport);
      }});

      DATA.relationships.forEach(rel => {{
        const a = positions[rel.from_id];
        const b = positions[rel.to_id];
        if (!a || !b) return;
        const line = mkEl("path", {{
          d: relPath(a, b),
          class: "edge rel",
          stroke: relColor[rel.type] || "#c0c8d5"
        }}, viewport);
        line.addEventListener("mousemove", evt => {{
          const fromName = entitiesById[rel.from_id]?.name || rel.from_id;
          const toName = entitiesById[rel.to_id]?.name || rel.to_id;
          showTooltip(evt, `<strong>${{rel.type}}</strong><br/>${{fromName}} → ${{toName}}`);
        }});
        line.addEventListener("mouseleave", hideTooltip);
        line.addEventListener("mouseenter", () => {{
          updateDetails(null, {{
            type: rel.type,
            fromName: entitiesById[rel.from_id]?.name || rel.from_id,
            toName: entitiesById[rel.to_id]?.name || rel.to_id,
            description: rel.description || ""
          }});
        }});
      }});

      nodes.forEach(n => {{
        const g = mkEl("g", {{
          class: `node ${{n.kind}}`,
          transform: `translate(${{n.x}}, ${{n.y}})`
        }}, viewport);

        mkEl("circle", {{
          r: n.r,
          fill: colorForNode(n)
        }}, g);

        const label = n.kind === "task"
          ? `[${{(n.priority || "").toUpperCase()}}] ${{n.name}}`
          : n.name;
        mkEl("text", {{
          x: n.r + 5,
          y: 4
        }}, g).textContent = label.length > 56 ? label.slice(0, 56) + "…" : label;

        g.addEventListener("mouseenter", evt => {{
          const summary = n.description || n.current_state || "No description.";
          showTooltip(evt, `<strong>${{n.name}}</strong><br/>${{summary}}`);
          updateDetails(n);
        }});
        g.addEventListener("mousemove", evt => {{
          tooltip.style.left = `${{evt.clientX + 12}}px`;
          tooltip.style.top = `${{evt.clientY + 12}}px`;
        }});
        g.addEventListener("mouseleave", hideTooltip);
      }});

      updateDetails(nodeMeta[root.id]);
      applyTransform();
    }}

    function applyTransform() {{
      viewport.setAttribute("transform", `translate(${{interaction.x}}, ${{interaction.y}}) scale(${{interaction.scale}})`);
    }}

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    svg.addEventListener("mousedown", evt => {{
      dragging = true;
      svg.classList.add("dragging");
      startX = evt.clientX;
      startY = evt.clientY;
      baseX = interaction.x;
      baseY = interaction.y;
    }});
    window.addEventListener("mouseup", () => {{
      dragging = false;
      svg.classList.remove("dragging");
    }});
    window.addEventListener("mousemove", evt => {{
      if (!dragging) return;
      interaction.x = baseX + (evt.clientX - startX);
      interaction.y = baseY + (evt.clientY - startY);
      applyTransform();
    }});
    svg.addEventListener("wheel", evt => {{
      evt.preventDefault();
      const factor = evt.deltaY < 0 ? 1.08 : 0.92;
      interaction.scale = Math.max(0.35, Math.min(2.4, interaction.scale * factor));
      applyTransform();
    }}, {{ passive: false }});

    resetBtn.addEventListener("click", () => {{
      interaction.x = 0;
      interaction.y = 0;
      interaction.scale = 1;
      applyTransform();
    }});

    render();
  </script>
</body>
</html>
"""
    output_path = (ROOT / output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    print(f"Wrote interactive mindmap to {output_path}")


def _write_markdown(path: Path, lines: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _wiki_link(path_without_extension: str, label: str) -> str:
    return f"[[{path_without_extension}|{label}]]"


def _as_text(value: Any, default: str = "None") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _yaml_value(value: Any) -> str:
    if value is None:
        return "null"
    text = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def _render_frontmatter(fields: Dict[str, Any]) -> List[str]:
    lines = ["---"]
    for key, value in fields.items():
        lines.append(f"{key}: {_yaml_value(value)}")
    lines.append("---")
    return lines


def _append_context(lines: List[str], context: Any) -> None:
    if not isinstance(context, dict) or not context:
        lines.append("None")
        return

    for key in sorted(context.keys()):
        value = context[key]
        lines.append(f"### {key}")
        lines.append(_as_text(value))
        lines.append("")

    if lines[-1] == "":
        lines.pop()


def cmd_export_md(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output: str,
) -> None:
    out_dir = (ROOT / output).resolve()
    entities_dir = out_dir / "entities"
    tasks_dir = out_dir / "tasks"
    rels_dir = out_dir / "relationships"
    entities_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir.mkdir(parents=True, exist_ok=True)
    rels_dir.mkdir(parents=True, exist_ok=True)

    entity_index = index_entities(entities)
    tasks_by_entity: Dict[str, List[Dict[str, Any]]] = {}
    outgoing: Dict[str, List[Dict[str, Any]]] = {}
    incoming: Dict[str, List[Dict[str, Any]]] = {}
    children: Dict[str, List[Dict[str, Any]]] = {}
    type_order = {"product": 0, "category": 1, "subcategory": 2}

    for task in tasks:
        tasks_by_entity.setdefault(task["entity_id"], []).append(task)
    for rel in relationships:
        outgoing.setdefault(rel["from_id"], []).append(rel)
        incoming.setdefault(rel["to_id"], []).append(rel)
    for entity in entities:
        parent = entity.get("parent_id")
        if parent:
            children.setdefault(parent, []).append(entity)

    for group in tasks_by_entity.values():
        group.sort(key=lambda item: (item.get("priority", ""), item.get("title", "")))
    for group in outgoing.values():
        group.sort(key=lambda item: item.get("id", ""))
    for group in incoming.values():
        group.sort(key=lambda item: item.get("id", ""))
    for group in children.values():
        group.sort(key=lambda item: item.get("name", ""))

    sorted_entities = sorted(
        entities,
        key=lambda item: (type_order.get(item.get("type", ""), 99), item.get("name", "")),
    )
    sorted_tasks = sorted(tasks, key=lambda item: (item.get("priority", ""), item.get("title", "")))
    sorted_relationships = sorted(relationships, key=lambda item: item.get("id", ""))

    for entity in sorted_entities:
        entity_id = entity["id"]
        entity_name = entity["name"]
        parent_id = entity.get("parent_id")
        parent = entity_index.get(parent_id) if parent_id else None
        entity_tasks = tasks_by_entity.get(entity_id, [])
        outgoing_rels = outgoing.get(entity_id, [])
        incoming_rels = incoming.get(entity_id, [])
        child_entities = children.get(entity_id, [])

        lines: List[str] = []
        lines.extend(
            _render_frontmatter(
                {
                    "id": entity_id,
                    "record_type": "entity",
                    "entity_type": entity.get("type", ""),
                    "health": entity.get("health", ""),
                    "product_id": entity.get("product_id"),
                    "category_id": entity.get("category_id"),
                    "parent_id": entity.get("parent_id"),
                    "source_json": "knowledge_base/raw/sources/src_data_entities.json",
                }
            )
        )
        lines.append(f"# {entity_name}")
        lines.append("")
        lines.append(f"- ID: `{entity_id}`")
        lines.append(f"- Type: `{_as_text(entity.get('type'))}`")
        lines.append(f"- Health: `{_as_text(entity.get('health'))}`")
        lines.append("")
        lines.append("## Current State")
        lines.append(_as_text(entity.get("current_state")))
        lines.append("")
        lines.append("## Target State")
        lines.append(_as_text(entity.get("target_state")))
        lines.append("")
        lines.append("## Parent")
        if parent:
            parent_link = _wiki_link(f"entities/{parent['id']}", parent["name"])
            lines.append(f"- {parent_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Children")
        if child_entities:
            for child in child_entities:
                child_link = _wiki_link(f"entities/{child['id']}", child["name"])
                lines.append(f"- {child_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Linked Tasks")
        if entity_tasks:
            for task in entity_tasks:
                label = f"{task['title']} ({task.get('status', 'unknown')}, {task.get('priority', 'unknown')})"
                task_link = _wiki_link(f"tasks/{task['id']}", label)
                lines.append(f"- {task_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Outgoing Relationships")
        if outgoing_rels:
            for rel in outgoing_rels:
                dst = entity_index.get(rel["to_id"], {"id": rel["to_id"], "name": rel["to_id"]})
                rel_link = _wiki_link(f"relationships/{rel['id']}", rel["id"])
                dst_link = _wiki_link(f"entities/{dst['id']}", dst["name"])
                lines.append(f"- {rel_link}: `{rel['type']}` -> {dst_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Incoming Relationships")
        if incoming_rels:
            for rel in incoming_rels:
                src = entity_index.get(rel["from_id"], {"id": rel["from_id"], "name": rel["from_id"]})
                rel_link = _wiki_link(f"relationships/{rel['id']}", rel["id"])
                src_link = _wiki_link(f"entities/{src['id']}", src["name"])
                lines.append(f"- {rel_link}: {src_link} -> `{rel['type']}`")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Full Context")
        _append_context(lines, entity.get("full_context"))

        _write_markdown(entities_dir / f"{entity_id}.md", lines)

    for task in sorted_tasks:
        task_id = task["id"]
        entity = entity_index.get(task["entity_id"], {"id": task["entity_id"], "name": task["entity_id"]})

        lines = []
        lines.extend(
            _render_frontmatter(
                {
                    "id": task_id,
                    "record_type": "task",
                    "entity_id": task.get("entity_id"),
                    "status": task.get("status"),
                    "priority": task.get("priority"),
                    "source_json": "knowledge_base/raw/sources/src_tasks.json",
                }
            )
        )
        lines.append(f"# {task.get('title', task_id)}")
        lines.append("")
        lines.append(f"- ID: `{task_id}`")
        lines.append(f"- Status: `{_as_text(task.get('status'))}`")
        lines.append(f"- Priority: `{_as_text(task.get('priority'))}`")
        entity_link = _wiki_link(f"entities/{entity['id']}", entity["name"])
        lines.append(f"- Linked Entity: {entity_link}")
        lines.append("")
        lines.append("## Description")
        lines.append(_as_text(task.get("description")))
        lines.append("")
        lines.append("## Full Context")
        _append_context(lines, task.get("full_context"))
        _write_markdown(tasks_dir / f"{task_id}.md", lines)

    for rel in sorted_relationships:
        rel_id = rel["id"]
        src = entity_index.get(rel["from_id"], {"id": rel["from_id"], "name": rel["from_id"]})
        dst = entity_index.get(rel["to_id"], {"id": rel["to_id"], "name": rel["to_id"]})

        lines = []
        lines.extend(
            _render_frontmatter(
                {
                    "id": rel_id,
                    "record_type": "relationship",
                    "relationship_type": rel.get("type"),
                    "from_id": rel.get("from_id"),
                    "to_id": rel.get("to_id"),
                    "source_json": "knowledge_base/raw/sources/src_data_relationships.json",
                }
            )
        )
        lines.append(f"# {rel_id}")
        lines.append("")
        lines.append(f"- Type: `{_as_text(rel.get('type'))}`")
        from_link = _wiki_link(f"entities/{src['id']}", src["name"])
        to_link = _wiki_link(f"entities/{dst['id']}", dst["name"])
        lines.append(f"- From: {from_link}")
        lines.append(f"- To: {to_link}")
        lines.append("")
        lines.append("## Description")
        lines.append(_as_text(rel.get("description")))
        lines.append("")
        lines.append("## Full Context")
        _append_context(lines, rel.get("full_context"))
        _write_markdown(rels_dir / f"{rel_id}.md", lines)

    root = next((entity for entity in sorted_entities if entity.get("type") == "product"), None)
    index_lines = [
        "# Product Ground Truth (Obsidian Mirror)",
        "",
        "This folder is generated from canonical JSON ground truth and is safe to open as an Obsidian vault.",
        "",
        "## Canonical JSON Sources",
        "- `knowledge_base/raw/sources/src_data_entities.json`",
        "- `knowledge_base/raw/sources/src_data_relationships.json`",
        "- `knowledge_base/raw/sources/src_tasks.json`",
        "",
        "## Regeneration Command",
        "```bash",
        "python local_tool/query.py export-md",
        "```",
        "",
        "Do not treat these generated markdown files as canonical runtime input for the editor/frontend.",
        "",
        "## Counts",
        f"- Entities: {len(sorted_entities)}",
        f"- Relationships: {len(sorted_relationships)}",
        f"- Tasks: {len(sorted_tasks)}",
        "",
        "## Root Product",
    ]
    if root:
        root_link = _wiki_link(f"entities/{root['id']}", root["name"])
        index_lines.append(f"- {root_link}")
    else:
        index_lines.append("- None")
    index_lines.extend(
        [
            "",
            "## Entity Notes",
        ]
    )
    for entity in sorted_entities:
        entity_link = _wiki_link(f"entities/{entity['id']}", entity["name"])
        index_lines.append(f"- {entity_link}")
    index_lines.extend(["", "## Task Notes"])
    for task in sorted_tasks:
        task_link = _wiki_link(f"tasks/{task['id']}", task["title"])
        index_lines.append(f"- {task_link}")
    index_lines.extend(["", "## Relationship Notes"])
    for rel in sorted_relationships:
        label = f"{rel['id']} ({rel.get('type', '')})"
        rel_link = _wiki_link(f"relationships/{rel['id']}", label)
        index_lines.append(f"- {rel_link}")
    _write_markdown(out_dir / "index.md", index_lines)

    readme_lines = [
        "# Obsidian Ground-Truth Mirror",
        "",
        "This directory is generated so the product ground truth can be browsed in Obsidian.",
        "",
        "- Canonical runtime/edit data remains JSON in `knowledge_base/raw/sources/`.",
        "- Frontend/editor continues to use JSON.",
        "- Regenerate this markdown mirror after JSON changes.",
        "",
        "## Generate",
        "```bash",
        "python local_tool/query.py export-md",
        "```",
        "",
        "## Open in Obsidian",
        "Open this folder (`knowledge_base/obsidian`) as a vault.",
        "",
        "Start at:",
        "- `index.md`",
    ]
    _write_markdown(out_dir / "README.md", readme_lines)
    print(f"Wrote Obsidian markdown mirror to {out_dir}")


def _task_export_context_keys(tasks: List[Dict[str, Any]]) -> List[str]:
    keys = set()
    for task in tasks:
        context = task.get("full_context")
        if isinstance(context, dict):
            for key in context.keys():
                keys.add(str(key))
    return sorted(keys)


def _task_export_rows(
    tasks: List[Dict[str, Any]],
    entity_index: Dict[str, Dict[str, Any]],
    context_keys: List[str],
) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    sorted_tasks = sorted(
        tasks,
        key=lambda item: (
            priority_order.get(str(item.get("priority", "")).lower(), 99),
            str(item.get("status", "")),
            str(item.get("title", "")),
            str(item.get("id", "")),
        ),
    )

    for task in sorted_tasks:
        entity_id = str(task.get("entity_id", ""))
        entity = entity_index.get(entity_id, {})
        context = task.get("full_context")
        if not isinstance(context, dict):
            context = {}

        row: Dict[str, str] = {
            "task_id": str(task.get("id", "")),
            "title": str(task.get("title", "")),
            "status": str(task.get("status", "")),
            "priority": str(task.get("priority", "")),
            "entity_id": entity_id,
            "entity_name": str(entity.get("name", "")),
            "entity_type": str(entity.get("type", "")),
            "entity_health": str(entity.get("health", "")),
            "description": str(task.get("description", "")),
            "full_context_json": json.dumps(context, ensure_ascii=False, sort_keys=True),
        }
        for key in context_keys:
            row[f"context_{key}"] = str(context.get(key, ""))
        rows.append(row)
    return rows


def cmd_export_tasks_table(
    entities: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output_csv: str,
    output_xlsx: Optional[str],
) -> None:
    entity_index = index_entities(entities)
    context_keys = _task_export_context_keys(tasks)
    rows = _task_export_rows(tasks, entity_index, context_keys)

    columns = [
        "task_id",
        "title",
        "status",
        "priority",
        "entity_id",
        "entity_name",
        "entity_type",
        "entity_health",
        "description",
        "full_context_json",
    ] + [f"context_{key}" for key in context_keys]

    csv_path = (ROOT / output_csv).resolve()
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote tasks CSV export to {csv_path}")

    if output_xlsx:
        xlsx_path = (ROOT / output_xlsx).resolve()
        xlsx_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            from openpyxl import Workbook  # type: ignore
        except ImportError:
            print("Skipped XLSX export (openpyxl not installed). CSV is Excel-compatible.")
            return

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "tasks"
        sheet.append(columns)
        for row in rows:
            sheet.append([row.get(column, "") for column in columns])
        workbook.save(xlsx_path)
        print(f"Wrote tasks XLSX export to {xlsx_path}")


def cmd_build_index(output: Optional[str]) -> None:
    index_path = Path(output).resolve() if output else INDEX_PATH
    payload = save_index(index_path)
    chunk_count = len(payload.get("chunks", [])) if isinstance(payload, dict) else 0
    print(f"Wrote retrieval index to {index_path} ({chunk_count} chunks)")


def cmd_retrieve(
    query: str,
    max_chunks: int,
    max_total_tokens: int,
    index_path: Optional[str],
    as_json: bool,
) -> None:
    effective_chunks = min(max(1, max_chunks), DEFAULT_MAX_CHUNKS)
    effective_tokens = max(1, max_total_tokens)
    resolved_index = Path(index_path).resolve() if index_path else INDEX_PATH
    payload = retrieve(
        query=query,
        max_chunks=effective_chunks,
        max_total_tokens=effective_tokens,
        index_path=resolved_index,
    )
    if as_json:
        print(json.dumps(payload, ensure_ascii=False))
        return

    print(f"Query: {payload.get('query', '')}")
    print(
        f"Retrieved {len(payload.get('chunks', []))} chunks "
        f"({payload.get('retrieved_tokens', 0)} tokens total)"
    )
    for item in payload.get("chunks", []):
        print(
            f"- {item.get('chunk_id', '')} [{item.get('type', '')}] "
            f"{item.get('source_file', '')} score={item.get('score', 0)} "
            f"tokens={item.get('token_count', 0)}"
        )
        print(f"  {item.get('text', '')}")


def cmd_build_prompt(
    query: str,
    max_chunks: int,
    max_total_tokens: int,
    index_path: Optional[str],
    as_json: bool,
) -> None:
    resolved_index = Path(index_path).resolve() if index_path else INDEX_PATH
    retrieved = retrieve(
        query=query,
        max_chunks=min(max(1, max_chunks), DEFAULT_MAX_CHUNKS),
        max_total_tokens=max(1, max_total_tokens),
        index_path=resolved_index,
    )
    prompt = build_minimal_prompt(query, retrieved.get("chunks", []))
    if as_json:
        print(
            json.dumps(
                {
                    "query": query,
                    "retrieved_tokens": retrieved.get("retrieved_tokens", 0),
                    "chunk_count": len(retrieved.get("chunks", [])),
                    "prompt": prompt,
                    "chunks": retrieved.get("chunks", []),
                },
                ensure_ascii=False,
            )
        )
        return
    print(prompt)


def cmd_initialize(as_json: bool) -> None:
    docs = {
        "INIT.md": INIT_DOC,
        "AGENTS.md": AGENTS_DOC,
        "README.md": README_DOC,
    }
    missing: List[str] = []
    summaries: List[Dict[str, Any]] = []
    for name, path in docs.items():
        if not path.exists():
            missing.append(name)
            continue
        content = path.read_text(encoding="utf-8")
        summaries.append(
            {
                "file": name,
                "path": str(path),
                "chars": len(content),
                "lines": len(content.splitlines()),
            }
        )

    checks = {
        "has_raw_scope": "raw sources only" in (INIT_DOC.read_text(encoding="utf-8").lower() if INIT_DOC.exists() else ""),
        "has_retrieval_rule": "never pass full source files to the llm"
        in (AGENTS_DOC.read_text(encoding="utf-8").lower() if AGENTS_DOC.exists() else ""),
        "has_token_limits": "max retrieved chunks per query: 5" in (README_DOC.read_text(encoding="utf-8").lower() if README_DOC.exists() else ""),
    }

    payload = {
        "ok": not missing and all(checks.values()),
        "missing_files": missing,
        "documents": summaries,
        "checks": checks,
    }

    if as_json:
        print(json.dumps(payload, ensure_ascii=False))
        return

    if missing:
        print(f"Initialization failed. Missing docs: {', '.join(missing)}")
        return

    print("Initialization documents loaded:")
    for summary in summaries:
        print(f"- {summary['file']}: {summary['lines']} lines ({summary['chars']} chars)")
    print("Rule checks:")
    for key, value in checks.items():
        print(f"- {key}: {'ok' if value else 'missing'}")
    print("Ready." if payload["ok"] else "Ready with warnings.")


def main() -> None:
    parser = argparse.ArgumentParser(description="P-Zerø local product health query tool")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("summary")

    show_p = sub.add_parser("show")
    show_p.add_argument("entity")

    blockers_p = sub.add_parser("blockers")
    blockers_p.add_argument("entity")

    sub.add_parser("priorities")

    what_if_p = sub.add_parser("what-if")
    what_if_p.add_argument("entity")

    bundle_p = sub.add_parser("bundle")
    bundle_p.add_argument("entity")

    mindmap_p = sub.add_parser("mindmap")
    mindmap_p.add_argument(
        "--output",
        default="artifacts/data_mindmap.mmd",
        help="Output Mermaid file path relative to repo root.",
    )

    mindmap_ui_p = sub.add_parser("mindmap-ui")
    mindmap_ui_p.add_argument(
        "--output",
        default="artifacts/data_mindmap_interactive.html",
        help="Output interactive HTML path relative to repo root.",
    )

    export_md_p = sub.add_parser("export-md")
    export_md_p.add_argument(
        "--output",
        default="knowledge_base/obsidian",
        help="Output directory for Obsidian markdown mirror (relative to repo root).",
    )

    export_tasks_table_p = sub.add_parser("export-tasks-table")
    export_tasks_table_p.add_argument(
        "--output-csv",
        default="artifacts/tasks_export.csv",
        help="Output CSV file path relative to repo root.",
    )
    export_tasks_table_p.add_argument(
        "--output-xlsx",
        default="artifacts/tasks_export.xlsx",
        help="Output XLSX file path relative to repo root (requires openpyxl).",
    )
    export_tasks_table_p.add_argument(
        "--no-xlsx",
        action="store_true",
        help="Disable XLSX export even when openpyxl is installed.",
    )

    snapshot_task_state_p = sub.add_parser("snapshot-task-state")
    snapshot_task_state_p.add_argument(
        "--tasks-path",
        default=str(CANONICAL_TASKS_PATH),
        help="Path to source tasks JSON (default: canonical src_tasks.json).",
    )
    snapshot_task_state_p.add_argument(
        "--output",
        default=str(DEFAULT_TASK_SNAPSHOT_PATH),
        help="Output snapshot path (non-canonical artifact).",
    )
    snapshot_task_state_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    journal_from_diff_p = sub.add_parser("journal-from-task-diff")
    journal_from_diff_p.add_argument(
        "--snapshot",
        default=str(DEFAULT_TASK_SNAPSHOT_PATH),
        help="Snapshot JSON created by snapshot-task-state.",
    )
    journal_from_diff_p.add_argument(
        "--tasks-path",
        default=str(CANONICAL_TASKS_PATH),
        help="Path to current tasks JSON (default: canonical src_tasks.json).",
    )
    journal_from_diff_p.add_argument(
        "--journal-path",
        default=str(CANONICAL_JOURNAL_PATH),
        help="Path to journal markdown (default: canonical src_user_journal.md).",
    )
    journal_from_diff_p.add_argument(
        "--summary",
        default=None,
        help="Optional summary override.",
    )
    journal_from_diff_p.add_argument(
        "--focus",
        default=None,
        help="Optional focus override.",
    )
    journal_from_diff_p.add_argument(
        "--time-spent",
        default="0.5",
        help="Time spent field value for generated journal entry.",
    )
    journal_from_diff_p.add_argument(
        "--blockers",
        default="None noted.",
        help="Blockers field value for generated journal entry.",
    )
    journal_from_diff_p.add_argument(
        "--next-action",
        default="Continue task execution and refresh snapshot before the next journal update.",
        help="Next Action field value for generated journal entry.",
    )
    journal_from_diff_p.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview generated journal entry without writing to journal.",
    )
    journal_from_diff_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    journal_kickoff_p = sub.add_parser("journal-entry-kickoff")
    journal_kickoff_p.add_argument(
        "--snapshot",
        default=str(DEFAULT_TASK_SNAPSHOT_PATH),
        help="Snapshot JSON created by snapshot-task-state.",
    )
    journal_kickoff_p.add_argument(
        "--tasks-path",
        default=str(CANONICAL_TASKS_PATH),
        help="Path to current tasks JSON (default: canonical src_tasks.json).",
    )
    journal_kickoff_p.add_argument(
        "--journal-path",
        default=str(CANONICAL_JOURNAL_PATH),
        help="Path to canonical journal markdown.",
    )
    journal_kickoff_p.add_argument(
        "--draft-output",
        default=str(DEFAULT_JOURNAL_DRAFT_PATH),
        help="Path to writable draft markdown file.",
    )
    journal_kickoff_p.add_argument(
        "--write-draft",
        action="store_true",
        help="Write draft file; if omitted, kickoff only prints draft preview.",
    )
    journal_kickoff_p.add_argument(
        "--summary",
        default=None,
        help="Optional summary override.",
    )
    journal_kickoff_p.add_argument(
        "--focus",
        default=None,
        help="Optional focus override.",
    )
    journal_kickoff_p.add_argument(
        "--time-spent",
        default="0.5",
        help="Time spent field value for generated draft entry.",
    )
    journal_kickoff_p.add_argument(
        "--blockers",
        default="None noted.",
        help="Blockers field value for generated draft entry.",
    )
    journal_kickoff_p.add_argument(
        "--next-action",
        default="Continue task execution and finalize this entry after review.",
        help="Next Action field value for generated draft entry.",
    )
    journal_kickoff_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    journal_finalize_p = sub.add_parser("journal-entry-finalize")
    journal_finalize_p.add_argument(
        "--draft",
        default=str(DEFAULT_JOURNAL_DRAFT_PATH),
        help="Draft markdown path produced by journal-entry-kickoff.",
    )
    journal_finalize_p.add_argument(
        "--journal-path",
        default=str(CANONICAL_JOURNAL_PATH),
        help="Path to canonical journal markdown.",
    )
    journal_finalize_p.add_argument(
        "--tasks-path",
        default=str(CANONICAL_TASKS_PATH),
        help="Path to current tasks JSON (default: canonical src_tasks.json).",
    )
    journal_finalize_p.add_argument(
        "--snapshot-output",
        default=str(DEFAULT_TASK_SNAPSHOT_PATH),
        help="Snapshot file to refresh after finalizing journal entry.",
    )
    journal_finalize_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    build_index_p = sub.add_parser("build-index")
    build_index_p.add_argument(
        "--output",
        default=None,
        help="Optional explicit retrieval index output path.",
    )

    retrieve_p = sub.add_parser("retrieve")
    retrieve_p.add_argument("query", help="Natural language query")
    retrieve_p.add_argument(
        "--max-chunks",
        type=int,
        default=DEFAULT_MAX_CHUNKS,
        help=f"Maximum retrieved chunks (hard-capped at {DEFAULT_MAX_CHUNKS}).",
    )
    retrieve_p.add_argument(
        "--max-tokens",
        type=int,
        default=DEFAULT_MAX_TOTAL_TOKENS,
        help="Maximum total tokens across all retrieved chunks.",
    )
    retrieve_p.add_argument(
        "--index-path",
        default=None,
        help="Optional path to retrieval index JSON.",
    )
    retrieve_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    prompt_p = sub.add_parser("build-prompt")
    prompt_p.add_argument("query", help="Natural language query")
    prompt_p.add_argument(
        "--max-chunks",
        type=int,
        default=DEFAULT_MAX_CHUNKS,
        help=f"Maximum retrieved chunks (hard-capped at {DEFAULT_MAX_CHUNKS}).",
    )
    prompt_p.add_argument(
        "--max-tokens",
        type=int,
        default=DEFAULT_MAX_TOTAL_TOKENS,
        help="Maximum total tokens across all retrieved chunks.",
    )
    prompt_p.add_argument(
        "--index-path",
        default=None,
        help="Optional path to retrieval index JSON.",
    )
    prompt_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    init_p = sub.add_parser("initialize")
    init_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )

    args = parser.parse_args()

    if args.cmd == "build-index":
        cmd_build_index(args.output)
        return
    if args.cmd == "retrieve":
        cmd_retrieve(args.query, args.max_chunks, args.max_tokens, args.index_path, args.json)
        return
    if args.cmd == "build-prompt":
        cmd_build_prompt(args.query, args.max_chunks, args.max_tokens, args.index_path, args.json)
        return
    if args.cmd == "initialize":
        cmd_initialize(args.json)
        return
    if args.cmd == "snapshot-task-state":
        cmd_snapshot_task_state(args.tasks_path, args.output, args.json)
        return
    if args.cmd == "journal-from-task-diff":
        cmd_journal_from_task_diff(
            snapshot_path=args.snapshot,
            tasks_path=args.tasks_path,
            journal_path=args.journal_path,
            summary=args.summary,
            focus=args.focus,
            time_spent=args.time_spent,
            blockers=args.blockers,
            next_action=args.next_action,
            dry_run=args.dry_run,
            as_json=args.json,
        )
        return
    if args.cmd == "journal-entry-kickoff":
        cmd_journal_entry_kickoff(
            snapshot_path=args.snapshot,
            tasks_path=args.tasks_path,
            journal_path=args.journal_path,
            draft_output=args.draft_output,
            summary=args.summary,
            focus=args.focus,
            time_spent=args.time_spent,
            blockers=args.blockers,
            next_action=args.next_action,
            write_draft=args.write_draft,
            as_json=args.json,
        )
        return
    if args.cmd == "journal-entry-finalize":
        cmd_journal_entry_finalize(
            draft_path=args.draft,
            journal_path=args.journal_path,
            tasks_path=args.tasks_path,
            snapshot_output=args.snapshot_output,
            as_json=args.json,
        )
        return

    entities, relationships, tasks = load_all()
    entity_index = index_entities(entities)

    if args.cmd == "summary":
        cmd_summary(entities, relationships, tasks)
        return
    if args.cmd == "priorities":
        cmd_priorities(entities, tasks, entity_index)
        return
    if args.cmd == "mindmap":
        cmd_mindmap(entities, relationships, tasks, args.output)
        return
    if args.cmd == "mindmap-ui":
        cmd_mindmap_ui(entities, relationships, tasks, args.output)
        return
    if args.cmd == "export-md":
        cmd_export_md(entities, relationships, tasks, args.output)
        return
    if args.cmd == "export-tasks-table":
        output_xlsx = None if args.no_xlsx else args.output_xlsx
        cmd_export_tasks_table(entities, tasks, args.output_csv, output_xlsx)
        return

    entity = find_entity(entities, args.entity)

    if args.cmd == "show":
        cmd_show(entity, relationships, tasks, entity_index)
    elif args.cmd == "blockers":
        cmd_blockers(entity, relationships, entity_index)
    elif args.cmd == "what-if":
        cmd_what_if(entity, relationships, entity_index)
    elif args.cmd == "bundle":
        cmd_bundle(entity, relationships, tasks, entities)


if __name__ == "__main__":
    main()
