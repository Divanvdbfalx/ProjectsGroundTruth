# P-Zerø Product Health

Local, file-based product health map for P-Zerø.

## Ground Truth

Canonical operational sources:

- `knowledge_base/raw/sources/src_data_entities.json`
- `knowledge_base/raw/sources/src_data_relationships.json`
- `knowledge_base/raw/sources/src_tasks.json`
- `knowledge_base/raw/sources/src_user_journal.md`

Generated artifacts (for example Mermaid outputs in `artifacts/`, CSV/XLSX exports, and UI-rendered views) are non-canonical.

## Repository Layout

- `knowledge_base/raw/sources/`: canonical agent interaction surface
- `local_tool/query.py`: CLI for querying and rendering views from canonical JSON
- `node_app/`: local UI editor for entities/relationships/tasks backed by canonical JSON

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

9. `export-tasks-table` (tabular task view for CSV/Excel consumers)
```bash
python local_tool/query.py export-tasks-table
```

Optional flags:
```bash
python local_tool/query.py export-tasks-table --no-xlsx
python local_tool/query.py export-tasks-table --output-csv artifacts/my_tasks.csv --output-xlsx artifacts/my_tasks.xlsx
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
- Uses `knowledge_base/raw/sources/src_tasks.json` for task operations

## Editing Rules

- Keep IDs stable (for example `sub_data_versioning`)
- Preserve referential integrity across entities, relationships, and tasks
- Update only intended records; avoid broad accidental rewrites
- Keep `full_context.description` detailed enough for future retrieval

## Journal and Tasks

For journal updates:

1. Add the entry to `knowledge_base/raw/sources/src_user_journal.md`.
2. In the same change, update impacted task status/metadata in `knowledge_base/raw/sources/src_tasks.json`.
3. Do not modify `src_data_entities.json` or `src_data_relationships.json` unless explicitly requested.

## New Chat Bootstrap Prompt

Use this prompt in a fresh chat to initialize an agent with repo rules before making changes:

```text
Initialize yourself for this repository before doing any edits.

1. Read and follow `/Users/divanvanderbank/Falx/repos/ProjectsGroundTruth/AGENTS.md` as the primary rules file.
2. Read `/Users/divanvanderbank/Falx/repos/ProjectsGroundTruth/knowledge_base/README.md` for knowledge-base structure and operating pattern.
3. Confirm the canonical product ground-truth files are:
   - `knowledge_base/raw/sources/src_data_entities.json`
   - `knowledge_base/raw/sources/src_data_relationships.json`
   - `knowledge_base/raw/sources/src_tasks.json`
4. Confirm canonical task tracking source is `knowledge_base/raw/sources/src_tasks.json` and journal source is `knowledge_base/raw/sources/src_user_journal.md`.
5. Confirm agent-editable operational scope is raw sources only (`knowledge_base/raw/sources/`).
6. Before making changes, summarize the key guardrails you will follow in 8-12 bullets, including the journal-entry + JSON task-status coupling rule.
```
