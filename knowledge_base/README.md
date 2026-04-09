# Knowledge Base

This directory is intentionally slimmed down for agent interaction with canonical raw sources only.

1. `raw/` - canonical source documents and operational files.

## Directory Layout

```text
knowledge_base/
  raw/
    sources/
```

## Operating Pattern

1. Keep product graph canonical in:
   - `knowledge_base/raw/sources/src_data_entities.json`
   - `knowledge_base/raw/sources/src_data_relationships.json`
   - `knowledge_base/raw/sources/src_tasks.json`
2. Keep task tracking canonical in:
   - `knowledge_base/raw/sources/src_tasks.json`
3. Keep journal source in:
   - `knowledge_base/raw/sources/src_user_journal.md`
4. Use repository root `AGENTS.md` as the operating policy for edits.

## Design Intent

- Keep a single authoritative operational layer for agents.
- Avoid parallel data stores for the same facts.
