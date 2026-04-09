# Raw Sources Layer

This is the immutable source-of-truth layer for knowledge ingestion.

## Rules

1. Add new source material only under `raw/sources/`.
2. Add downloaded images/files under `raw/assets/` when needed.
3. Add or update source metadata manifests under `raw/manifests/`.
4. Do not edit source content during wiki maintenance workflows.
5. Wiki pages must cite raw-source provenance.

## Canonical Operational Files

- Product graph JSON:
  - `knowledge_base/raw/sources/src_data_entities.json`
  - `knowledge_base/raw/sources/src_data_relationships.json`
  - `knowledge_base/raw/sources/src_tasks.json`
- Unified task tracking JSON:
  - `knowledge_base/raw/sources/src_tasks.json`
- User journal markdown:
  - `knowledge_base/raw/sources/src_user_journal.md`

## Suggested Source Naming

Use stable, sortable IDs:

```text
YYYY-MM-DD_<short-slug>.md
YYYY-MM-DD_<short-slug>.pdf
YYYY-MM-DD_<short-slug>.txt
```

## Suggested Manifest Fields

- `source_id`
- `title`
- `date_added`
- `origin`
- `author`
- `file_path`
- `notes`
