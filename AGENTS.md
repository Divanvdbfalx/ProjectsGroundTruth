# AGENTS.md

Repository-wide operating rules for human/LLM agents working in this project.

## Mission

Maintain a single canonical product knowledge system in raw source files under `knowledge_base/raw/sources/`.

## Canonical Sources

Do all product graph and task edits in these files:

- `knowledge_base/raw/sources/src_data_entities.json`
- `knowledge_base/raw/sources/src_data_relationships.json`
- `knowledge_base/raw/sources/src_tasks.json`
- `knowledge_base/raw/sources/src_user_journal.md`

Do not introduce alternate authoritative stores (wiki, mirror markdown, CSV/XLSX, or artifacts).

## Frontend / Tooling Contracts

- `node_app/` reads and writes canonical JSON under `knowledge_base/raw/sources/`.
- `local_tool/query.py` commands (`summary`, `mindmap`, `mindmap-ui`, `export-tasks-table`) must keep working from canonical JSON paths.
- `export-tasks-table` CSV/XLSX outputs are views only and are not canonical.
- Mindmap outputs in `artifacts/` are views only, never source-of-truth.

## Editing Rules

1. Keep IDs stable (`prd_*`, `cat_*`, `sub_*`, `task_*`, `rel_*`).
2. Preserve referential integrity:
   - relationship `from_id`/`to_id` must exist in entities
   - task `entity_id` must exist in entities
3. Keep `full_context` rich and structured for retrieval.
4. Prefer additive, targeted edits over broad rewrites.
5. If changing schema/shape, update docs and dependent tooling in the same change.

## Journal / Task Guardrail

When handling user workspace journaling/task prompts, treat product graph JSON (`src_data_entities.json`, `src_data_relationships.json`) as read-only unless explicitly asked to update product graph data.

Mandatory rule: every new journal entry must be reflected in task tracking by updating task statuses (and relevant task fields) in `knowledge_base/raw/sources/src_tasks.json`.

Allowed file targets for journal/task-only flows:

- `knowledge_base/raw/sources/src_user_journal.md`
- `knowledge_base/raw/sources/src_tasks.json`

## Recommended Working Sequence

1. Update canonical JSON.
2. Validate with query commands as needed (`summary`, `mindmap`, `mindmap-ui`).
3. Regenerate task table views when needed (`export-tasks-table`).
4. Update docs if behavior/paths changed.
