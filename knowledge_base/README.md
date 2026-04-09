# Persistent Wiki Knowledge Base

This directory implements a dual-purpose knowledge workflow:

1. `raw/` - canonical source documents (including runtime JSON ground truth).
2. `wiki/` - LLM-maintained markdown knowledge base.
3. `obsidian/` - generated markdown mirror of canonical JSON for Obsidian browsing.
4. `schema/` - rules and templates that control maintenance behavior.

Open `knowledge_base/obsidian/` as an Obsidian vault if you want graph-style note browsing.

## Directory Layout

```text
knowledge_base/
  raw/
    sources/
    assets/
    manifests/
  wiki/
    index.md
    log.md
    overview.md
    entities/
    concepts/
    sources/
    analyses/
    reports/
  obsidian/
    index.md
    entities/
    tasks/
    relationships/
  schema/
    templates/
```

## Operating Pattern

1. Add source files to `raw/sources/` (and optional media to `raw/assets/`).
2. Ingest with an LLM using repository root `AGENTS.md`.
3. Keep `wiki/index.md` updated on every ingest/query/lint output.
4. Append all operations to `wiki/log.md` chronologically.
5. Keep product graph canonical in:
   - `knowledge_base/raw/sources/src_data_entities.json`
   - `knowledge_base/raw/sources/src_data_relationships.json`
   - `knowledge_base/raw/sources/src_tasks.json`
6. Keep task tracking canonical in:
   - `knowledge_base/raw/sources/src_tasks.json`
7. Keep journal source in:
   - `knowledge_base/raw/sources/src_user_journal.md`
8. Regenerate Obsidian mirror after product JSON changes:

```bash
python local_tool/query.py export-md
```

## Design Intent

- Knowledge is compiled and maintained over time, not re-derived each query.
- Cross-references, contradictions, and synthesis are persisted in markdown.
- The wiki is versionable and reviewable like code.
