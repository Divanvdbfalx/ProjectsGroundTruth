# Persistent Wiki Knowledge Base

This directory implements a three-layer knowledge workflow:

1. `raw/` - immutable source documents.
2. `wiki/` - LLM-maintained markdown knowledge base.
3. `schema/` - rules and templates that control maintenance behavior.

No Obsidian setup is required for this structure.

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
  schema/
    AGENTS.md
    templates/
```

## Operating Pattern

1. Add source files to `raw/sources/` (and optional media to `raw/assets/`).
2. Ingest with an LLM using `schema/AGENTS.md`.
3. Keep `wiki/index.md` updated on every ingest/query/lint output.
4. Append all operations to `wiki/log.md` chronologically.

## Design Intent

- Knowledge is compiled and maintained over time, not re-derived each query.
- Cross-references, contradictions, and synthesis are persisted in markdown.
- The wiki is versionable and reviewable like code.
