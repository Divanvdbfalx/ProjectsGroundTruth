# AGENTS.md

Repository-wide operating rules for human/LLM agents working in this project.

## Mission

Maintain a dual-format product knowledge system:

- Canonical runtime/edit format: JSON
- Read/browse format (Obsidian): Markdown

The mindmap frontend and editor must remain operational while markdown remains synchronized for knowledge browsing.

## Canonical Sources

Do all product graph edits in these JSON files:

- `knowledge_base/raw/sources/src_data_entities.json`
- `knowledge_base/raw/sources/src_data_relationships.json`
- `knowledge_base/raw/sources/src_data_tasks.json`

Do not treat generated markdown as canonical.

User workspace markdown sources currently live at:

- `knowledge_base/raw/sources/src_user_current_context.md`
- `knowledge_base/raw/sources/src_user_tasks.md`
- `knowledge_base/raw/sources/src_user_journal.md`
- `knowledge_base/raw/sources/src_user_readme.md`

Historical snapshots live in `archive/`.

## Markdown Mirror (Obsidian)

Generated Obsidian-compatible mirror:

- `knowledge_base/obsidian/index.md`
- `knowledge_base/obsidian/entities/*.md`
- `knowledge_base/obsidian/tasks/*.md`
- `knowledge_base/obsidian/relationships/*.md`

Regenerate after any JSON change:

```bash
python local_tool/query.py export-md
```

## Frontend / Tooling Contracts

- `node_app/` reads and writes canonical JSON under `knowledge_base/raw/sources/`.
- `local_tool/query.py` commands (`summary`, `mindmap`, `mindmap-ui`, etc.) must keep working from current canonical JSON paths.
- Mindmap outputs in `artifacts/` are views only, never source-of-truth.

## Editing Rules

1. Keep IDs stable (`prd_*`, `cat_*`, `sub_*`, `task_*`, `rel_*`).
2. Preserve referential integrity:
   - relationship `from_id`/`to_id` must exist in entities
   - task `entity_id` must exist in entities
3. Keep `full_context` rich and structured for retrieval.
4. Prefer additive, targeted edits over broad rewrites.
5. If changing schema/shape, update docs and dependent tooling in the same change.

## Knowledge Base Rules

- `knowledge_base/raw/` is source input storage.
- `knowledge_base/wiki/` is maintained synthesis and analysis.
- `knowledge_base/schema/AGENTS.md` governs wiki ingest/query/lint behavior and should be followed for wiki maintenance tasks.

## Journal / Task Guardrail

When handling user workspace journaling/task prompts, treat product ground-truth JSON as read-only unless explicitly asked to update product graph data.

Allowed file targets for journal/task-only flows:

- `knowledge_base/raw/sources/src_user_*.md`
- `knowledge_base/wiki/sources/src_user_*.md`
- `knowledge_base/wiki/log.md`

## Recommended Working Sequence

1. Update canonical JSON.
2. Validate with query commands as needed (`summary`, `mindmap`, `mindmap-ui`).
3. Regenerate Obsidian markdown mirror (`export-md`).
4. Update docs if behavior/paths changed.
