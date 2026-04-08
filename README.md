# P-Zerø Product Health

Local, file-based product health map for P-Zerø.

## Next steps:

- Create repo
- Figure out how to integrate AI to help project manage P-Zerø
- Add clients/sites status
- Figure out how tasks will be included

## Ground Truth

The only source of truth is:

- `knowledge_base/raw/sources/src_data_entities.json`
- `knowledge_base/raw/sources/src_data_relationships.json`
- `knowledge_base/raw/sources/src_data_tasks.json`

Generated artifacts (for example Mermaid outputs in `artifacts/`) are views, not authoritative data.

## Repository Layout

- `knowledge_base/raw/sources/`: canonical product graph + task ground truth JSON
- `knowledge_base/obsidian/`: generated Obsidian markdown mirror of product ground truth
- `local_tool/query.py`: CLI for querying and rendering views from ground truth
- `node_app/`: local UI editor for nodes and relationships
- `archive/`: historical snapshots (including former `data/` and `user/` layouts)
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

9. `export-md` (Obsidian markdown mirror from canonical JSON)
```bash
python local_tool/query.py export-md
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
- When adding relationships, verify `from_id` and `to_id` exist in `src_data_entities.json`

## Current Scope

This project is intentionally local and simple:

- no database
- no external API server for the data layer
- ground truth managed directly in JSON

## Prompt Examples (Journal -> Tasks)

Use these prompts with Codex to keep user workspace markdown sources and the wiki in sync.

### 1) Add a journal entry only

```text
Add this to today's journal:
- Summary: Spoke to <person> about <topic>
- Focus: <focus area>
- Task Updates: <what changed>
- Time Spent (h): <hours>
- Blockers: <blockers>
- Next Action: <next step>

Requirements:
- Add a timestamp in SAST.
- Update `knowledge_base/raw/sources/src_user_journal.md`.
- Update knowledge_base/wiki/sources/src_user_journal.md summary.
- Append knowledge_base/wiki/log.md.
- Do not change tasks unless I explicitly ask.
```

### 2) Add journal entry and update tasks from it

```text
Process this work log and update my workspace:
<paste notes>

Requirements:
- First add a timestamped journal entry for today.
- Then update `knowledge_base/raw/sources/src_user_tasks.md` statuses and Updated dates based only on the notes.
- If a task is blocked, include the blocker reason in Notes.
- Sync corresponding knowledge base source files.
- Keep task IDs stable and keep table format unchanged.
- Do not edit product ground truth files.
```

### 3) Mark follow-up blocked from journal evidence

```text
Journal update:
I emailed <name> requesting updated data for <sites>. No response yet.

Please:
1. Add this as a timestamped journal entry in `knowledge_base/raw/sources/src_user_journal.md`.
2. Move related follow-up tasks to blocked.
3. Set Updated=today for changed tasks.
4. Update `knowledge_base/raw/sources/src_user_current_context.md` only if active in_progress focus changed.
5. Sync knowledge base journal/task source summaries.
6. Do not edit product ground truth context.
```

## Guardrail: Do Not Update Product Ground Truth from Journal/Task Prompts

When handling journal and user task maintenance prompts, treat product graph ground truth as read-only.

Never modify:

- `knowledge_base/raw/sources/src_data_entities.json`
- `knowledge_base/raw/sources/src_data_relationships.json`
- `knowledge_base/raw/sources/src_data_tasks.json`

Allowed for these flows:

- `knowledge_base/raw/sources/src_user_*.md`
- `knowledge_base/wiki/sources/src_user_*.md`
- `knowledge_base/wiki/log.md`
