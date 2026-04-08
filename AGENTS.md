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

### Wiki Core Rules

1. Treat `knowledge_base/raw/` as immutable source-of-truth input.
2. Write all knowledge outputs to `knowledge_base/wiki/`.
3. Update `knowledge_base/wiki/index.md` for every new/renamed/deleted page.
4. Append an entry to `knowledge_base/wiki/log.md` for every ingest/query/lint operation.
5. Preserve cross-links between entities, concepts, source summaries, and analyses.
6. Flag contradictions explicitly instead of silently overwriting prior claims.

### Wiki Ingest Workflow

When asked to ingest a source from `knowledge_base/raw/sources/`:

1. Read source and optional manifest metadata.
2. Create/update `knowledge_base/wiki/sources/<source_id>.md`.
3. Update affected entity pages in `knowledge_base/wiki/entities/`.
4. Update affected concept pages in `knowledge_base/wiki/concepts/`.
5. Update `knowledge_base/wiki/overview.md` if global synthesis changed.
6. Update `knowledge_base/wiki/index.md`.
7. Append an ingest entry to `knowledge_base/wiki/log.md`.

### Wiki Query Workflow

When asked a question:

1. Read `knowledge_base/wiki/index.md` first to identify relevant pages.
2. Read the smallest necessary page set for synthesis.
3. Return an answer with page-level citations.
4. If the answer is durable, save it under `knowledge_base/wiki/analyses/`.
5. Add analysis page to `knowledge_base/wiki/index.md` and append a query entry to `knowledge_base/wiki/log.md`.

### Wiki Lint Workflow

When asked to lint/health-check:

1. Scan for contradictions across related pages.
2. Scan for stale claims superseded by newer source summaries.
3. Scan for orphan pages not linked in index or by peer pages.
4. Identify concepts/entities that are frequently referenced but missing pages.
5. Write results to `knowledge_base/wiki/reports/<date>_lint_report.md`.
6. Add report to `knowledge_base/wiki/index.md` and append lint entry to `knowledge_base/wiki/log.md`.

### Wiki Conventions

- Use Markdown links for all internal references.
- Keep claims concise and attributable.
- Keep timeline/context in `knowledge_base/wiki/log.md`.
- Prefer additive edits with explicit conflict notes over destructive rewrites.
- Use templates in `knowledge_base/schema/templates/` (`source_summary.md`, `entity_page.md`, `concept_page.md`, `analysis_note.md`, `lint_report.md`).

## Journal / Task Guardrail

When handling user workspace journaling/task prompts, treat product ground-truth JSON as read-only unless explicitly asked to update product graph data.

Mandatory rule: every new journal entry must be reflected in task tracking by updating task statuses (and relevant task fields such as `Updated` date/notes) in `knowledge_base/raw/sources/src_user_tasks.md`.

Allowed file targets for journal/task-only flows:

- `knowledge_base/raw/sources/src_user_*.md`
- `knowledge_base/wiki/sources/src_user_*.md`
- `knowledge_base/wiki/log.md`

## Recommended Working Sequence

1. Update canonical JSON.
2. Validate with query commands as needed (`summary`, `mindmap`, `mindmap-ui`).
3. Regenerate Obsidian markdown mirror (`export-md`).
4. Update docs if behavior/paths changed.
