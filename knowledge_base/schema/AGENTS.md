# Wiki Maintainer Schema (Codex/LLM)

This schema defines how an LLM should maintain the persistent wiki in `knowledge_base/wiki/`.

## Core Rules

1. Treat `knowledge_base/raw/` as immutable source-of-truth input.
2. Write all knowledge outputs to `knowledge_base/wiki/`.
3. Update `wiki/index.md` for every new/renamed/deleted page.
4. Append an entry to `wiki/log.md` for every ingest/query/lint operation.
5. Preserve cross-links between entities, concepts, source summaries, and analyses.
6. Flag contradictions explicitly instead of silently overwriting prior claims.

## Ingest Workflow

When asked to ingest a source from `raw/sources/`:

1. Read source and optional manifest metadata.
2. Create/update `wiki/sources/<source_id>.md`.
3. Update affected entity pages in `wiki/entities/`.
4. Update affected concept pages in `wiki/concepts/`.
5. Update `wiki/overview.md` if global synthesis changed.
6. Update `wiki/index.md`.
7. Append an ingest entry to `wiki/log.md`.

## Query Workflow

When asked a question:

1. Read `wiki/index.md` first to identify relevant pages.
2. Read the smallest necessary page set for synthesis.
3. Return an answer with page-level citations.
4. If the answer is durable, save it under `wiki/analyses/`.
5. Add analysis page to `wiki/index.md` and append a query entry to `wiki/log.md`.

## Lint Workflow

When asked to lint/health-check:

1. Scan for contradictions across related pages.
2. Scan for stale claims superseded by newer source summaries.
3. Scan for orphan pages not linked in index or by peer pages.
4. Identify concepts/entities that are frequently referenced but missing pages.
5. Write results to `wiki/reports/<date>_lint_report.md`.
6. Add report to `wiki/index.md` and append lint entry to `wiki/log.md`.

## Conventions

- Use Markdown links for all internal references.
- Keep claims concise and attributable.
- Keep timeline/context in `wiki/log.md`, not in scattered ad hoc notes.
- Prefer additive edits with explicit conflict notes over destructive rewrites.

## Templates

Use templates in `knowledge_base/schema/templates/`:

- `source_summary.md`
- `entity_page.md`
- `concept_page.md`
- `analysis_note.md`
- `lint_report.md`
