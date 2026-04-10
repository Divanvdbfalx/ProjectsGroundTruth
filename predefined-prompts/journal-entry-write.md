# Predefined Prompt: Journal Entry Write

## Goal
Draft a high-quality journal entry from task-state deltas and keep canonical task tracking aligned.

## Human Confirmation Rule (Mandatory)
- Before making any file edits, present the full draft plan/content to the user.
- Do not edit any file until the user explicitly confirms in-chat.
- If confirmation is not explicit, stop and ask for confirmation.

## Required Guardrails
- Treat product graph files as read-only unless explicitly asked to update them:
  - `knowledge_base/raw/sources/src_data_entities.json`
  - `knowledge_base/raw/sources/src_data_relationships.json`
- For journal/task flows, only update:
  - `knowledge_base/raw/sources/src_user_journal.md`
  - `knowledge_base/raw/sources/src_tasks.json`
- Every new journal entry must be reflected in task tracking by updating task statuses and relevant task fields in `knowledge_base/raw/sources/src_tasks.json`.
- Keep task and entity IDs stable.

## Snapshot Source Of Truth For Deltas
- Use non-canonical snapshot file in artifacts:
  - `artifacts/current_task_state_snapshot.json`
- This snapshot is the baseline for detecting task changes in the current session.

## Inputs
- `knowledge_base/raw/sources/src_tasks.json` (current canonical tasks)
- `artifacts/current_task_state_snapshot.json` (pre-session or last finalized snapshot)
- `knowledge_base/raw/sources/src_user_journal.md` (canonical journal)

## Instructions
1. Ensure a snapshot exists in artifacts:
   - `python local_tool/query.py snapshot-task-state --output artifacts/current_task_state_snapshot.json`
2. Perform work and update `knowledge_base/raw/sources/src_tasks.json` as needed.
3. Generate journal draft from snapshot diff:
   - `python local_tool/query.py journal-entry-kickoff --snapshot artifacts/current_task_state_snapshot.json --write-draft --draft-output artifacts/journal_entry_draft.md`
4. Review/edit `artifacts/journal_entry_draft.md` for accuracy and specificity.
5. Finalize:
   - `python local_tool/query.py journal-entry-finalize --draft artifacts/journal_entry_draft.md`
6. Confirm finalize refreshed snapshot at:
   - `artifacts/current_task_state_snapshot.json`

## Output Requirements
- Journal draft must include:
  - `Entry ID`
  - `Date/Time`
  - `Context Date`
  - `Context Version`
  - `Summary`
  - `Focus`
  - `Task Updates`
  - `Time Spent (h)`
  - `Blockers`
  - `Next Action`
- `Task Updates` must reference valid task IDs present in `src_tasks.json`.
- Entry must be append-ready for `src_user_journal.md`.

## Completion Checklist
- [ ] User explicitly confirmed draft before any file edits
- [ ] Snapshot exists at `artifacts/current_task_state_snapshot.json`
- [ ] `src_tasks.json` reflects intended task updates
- [ ] Draft created at `artifacts/journal_entry_draft.md`
- [ ] Finalize command run successfully
- [ ] Snapshot refreshed in `artifacts/current_task_state_snapshot.json`
