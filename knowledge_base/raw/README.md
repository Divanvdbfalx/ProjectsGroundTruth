# Raw Sources Layer

This is the source-of-truth layer for all agent operations in this repository.

## Rules

1. Add and update operational source material under `raw/sources/`.
2. Treat files in `raw/sources/` as canonical.
3. Do not create alternate authoritative stores for the same data.
4. Keep edits targeted and preserve existing schema and IDs unless explicitly asked to change them.

## Canonical Operational Files

- Product graph JSON:
  - `knowledge_base/raw/sources/src_data_entities.json`
  - `knowledge_base/raw/sources/src_data_relationships.json`
  - `knowledge_base/raw/sources/src_tasks.json`
- Unified task tracking JSON:
  - `knowledge_base/raw/sources/src_tasks.json`
- User journal markdown:
  - `knowledge_base/raw/sources/src_user_journal.md`

## Suggested Naming

Use stable, sortable IDs:

```text
YYYY-MM-DD_<short-slug>.md
YYYY-MM-DD_<short-slug>.pdf
YYYY-MM-DD_<short-slug>.txt
```
