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
- `local_tool/retrieval_engine.py`: chunking + embedding + retrieval + compact prompt builder
- `local_tool/build_retrieval_index.py`: preprocessing script to build/update retrieval index
- `local_tool/cache/retrieval_index.json`: generated retrieval index (non-canonical)
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

10. `build-index` (build retrieval index from canonical sources)
```bash
python local_tool/query.py build-index
```

11. `retrieve <query>` (return top relevant chunks only)
```bash
python local_tool/query.py retrieve "What are blocked high priority tasks?" --json
```

12. `build-prompt <query>` (build compact LLM prompt from retrieved chunks)
```bash
python local_tool/query.py build-prompt "What are blocked high priority tasks?" --json
```

13. `snapshot-task-state` (write non-canonical task-state snapshot in `artifacts/`)
```bash
python local_tool/query.py snapshot-task-state --output artifacts/current_task_state_snapshot.json
```

14. `journal-from-task-diff` (compare snapshot vs current tasks and append journal entry)
```bash
python local_tool/query.py journal-from-task-diff --snapshot artifacts/current_task_state_snapshot.json
```

15. `journal-entry-kickoff` (load snapshot + current tasks, inspect diff, preview draft in terminal)
```bash
python local_tool/query.py journal-entry-kickoff
```

16. `journal-entry-finalize` (validate edited draft, append to canonical journal, refresh task snapshot)
```bash
python local_tool/query.py journal-entry-finalize
```

Optional flags:
```bash
python local_tool/query.py export-tasks-table --no-xlsx
python local_tool/query.py export-tasks-table --output-csv artifacts/my_tasks.csv --output-xlsx artifacts/my_tasks.xlsx
python local_tool/query.py journal-from-task-diff --dry-run
python local_tool/query.py journal-from-task-diff --time-spent 1.0 --blockers "Waiting on EDF response"
python local_tool/query.py journal-entry-kickoff --write-draft --draft-output artifacts/journal_entry_draft.md
python local_tool/query.py journal-entry-finalize --draft artifacts/journal_entry_draft.md
```

Recommended journal workflow:

1. Create snapshot before edits:
```bash
python local_tool/query.py snapshot-task-state
```
2. Edit `knowledge_base/raw/sources/src_tasks.json`.
3. Kick off journal automation to preview draft from diffs (no file write):
```bash
python local_tool/query.py journal-entry-kickoff
```
4. Save draft only when you want to edit it:
```bash
python local_tool/query.py journal-entry-kickoff --write-draft --draft-output artifacts/journal_entry_draft.md
```
5. Inspect/edit draft at `artifacts/journal_entry_draft.md`.
6. Finalize and push entry to canonical journal, then refresh snapshot:
```bash
python local_tool/query.py journal-entry-finalize
```

## Token-Efficient Retrieval Rules

- Never pass full source files to the LLM.
- Always retrieve context from chunks only.
- Max chunk size: 500 tokens.
- Max retrieved chunks per query: 5.
- Max retrieved tokens per query: ~1500.
- Strip non-essential fields before sending prompt context.

## Agent API Flow

Server routes in `node_app/server.js`:

- `POST /api/agent/retrieve`: retrieval only (returns top chunks and token counts)
- `POST /api/agent/query`: retrieval + prompt construction + LLM answer

Flow:

1. Receive user query.
2. Call `python local_tool/query.py build-prompt "<query>" --json`.
3. Send only retrieved minimal prompt payload to LLM.
4. Return answer plus retrieval/token metadata.

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

### Creating a Journal Entry

Use this workflow:

1. `python local_tool/query.py snapshot-task-state`
2. Edit `knowledge_base/raw/sources/src_tasks.json`
3. `python local_tool/query.py journal-entry-kickoff`
4. `python local_tool/query.py journal-entry-kickoff --write-draft --draft-output artifacts/journal_entry_draft.md`
5. Inspect/edit draft at `artifacts/journal_entry_draft.md`
6. `python local_tool/query.py journal-entry-finalize --draft artifacts/journal_entry_draft.md`

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
6. Confirm retrieval stack files exist:
   - `local_tool/retrieval_engine.py`
   - `local_tool/build_retrieval_index.py`
   - `local_tool/query.py`
7. Confirm token constraints:
   - max 500 tokens per chunk
   - max 5 chunks retrieved per query
   - max ~1500 retrieved tokens total per query
8. Build/refresh retrieval index:
   - `python local_tool/build_retrieval_index.py`
9. For Q&A, use retrieval flow only:
   - `python local_tool/query.py retrieve "<query>" --json`
   - `python local_tool/query.py build-prompt "<query>" --json`
10. Before making changes, summarize the key guardrails you will follow in 8-12 bullets, including:
   - journal-entry + JSON task-status coupling rule
   - retrieval-only LLM context rule (never full files in prompt)
```
