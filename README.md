# P-Zerø Product Health

Local, file-based product health map for P-Zerø.

## Next steps:

- Create repo
- Figure out how to integrate AI to help project manage P-Zerø
- Add clients/sites status
- Figure out how tasks will be included

## Ground Truth

The only source of truth is:

- `data/entities.json`
- `data/relationships.json`
- `data/tasks.json`

Generated artifacts (for example Mermaid outputs in `artifacts/`) are views, not authoritative data.

## Repository Layout

- `data/`: product graph + task ground truth JSON
- `local_tool/query.py`: CLI for querying and rendering views from ground truth
- `node_app/`: local UI editor for nodes and relationships
- `user/`: user-first context/task/journal tracking workspace
- `knowledge_base/`: persistent wiki scaffold (`raw/`, `wiki/`, `schema/`) for accumulated LLM-maintained knowledge

## CLI Usage

Run from repo root:

```bash
python local_tool/query.py summary
```

Available commands:

1. `summary`
```bash
python local_tool/query.py summary
```

2. `show <entity_id_or_name>`
```bash
python local_tool/query.py show sub_data_versioning
```

3. `blockers <entity_id_or_name>`
```bash
python local_tool/query.py blockers sub_experiment_framework
```

4. `priorities`
```bash
python local_tool/query.py priorities
```

5. `what-if <entity_id_or_name>`
```bash
python local_tool/query.py what-if sub_data_versioning
```

6. `bundle <entity_id_or_name>`
```bash
python local_tool/query.py bundle sub_data_versioning
```

7. `mindmap` (Mermaid output file)
```bash
python local_tool/query.py mindmap
```

8. `mindmap-ui` (standalone interactive HTML output)
```bash
python local_tool/query.py mindmap-ui
```

## Node Editor (Local)

Start the editor:

```bash
cd node_app
node server.js
```

Open:

```text
http://localhost:4311
```

Editor behavior:

- Edits nodes in `knowledge_base/raw/sources/src_data_entities.json`
- Edits relationships in `knowledge_base/raw/sources/src_data_relationships.json`
- Deletes a node and removes linked relationships/tasks
- Prompts to save when leaving a node with unsaved changes
- Node form is ordered for content-first editing:
  - Save button
  - Current State
  - Target State
  - Description
  - ID fields and metadata
- Node textareas for `Current State`, `Target State`, and `Description` are enlarged for long-form context editing

## Editing Rules

- Keep IDs stable (for example `sub_data_versioning`)
- Update only intended nodes/records; avoid broad accidental rewrites
- Keep `full_context.description` detailed enough for future LLM retrieval/use
- When adding relationships, verify `from_id` and `to_id` exist in `entities.json`

## Current Scope

This project is intentionally local and simple:

- no database
- no external API server for the data layer
- ground truth managed directly in JSON
