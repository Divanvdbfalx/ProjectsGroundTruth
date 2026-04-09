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
7. Confirm token-discipline constraints:
   - max 500 tokens per chunk
   - max 5 retrieved chunks per query
   - max ~1500 retrieved tokens total per query
8. Build or refresh retrieval index before retrieval-heavy workflows:
   - `python local_tool/build_retrieval_index.py`
9. For agent Q&A flow, use retrieval commands instead of full-file reads:
   - `python local_tool/query.py retrieve "<query>" --json`
   - `python local_tool/query.py build-prompt "<query>" --json`
10. If asked to add a journal entry, follow this mandatory workflow:
   - Treat product graph JSON files (`src_data_entities.json`, `src_data_relationships.json`) as read-only unless explicitly instructed otherwise.
   - Add the entry to `knowledge_base/raw/sources/src_user_journal.md`.
   - In the same change, update `knowledge_base/raw/sources/src_tasks.json`:
     - Update status for impacted tasks.
     - Update relevant task metadata fields present in the JSON task schema.
     - Add or adjust follow-up tasks if the journal entry introduces new actionable work.
   - Keep journal/task-only edits within allowed targets:
     - `knowledge_base/raw/sources/src_user_journal.md`
     - `knowledge_base/raw/sources/src_tasks.json`
   - Do not modify canonical product data JSON files for journal-only requests.
11. Before making changes, summarize the key guardrails you will follow in 8-12 bullets, including:
   - journal-entry + JSON task-status coupling rule
   - retrieval-only LLM context rule (never full files in prompt)
