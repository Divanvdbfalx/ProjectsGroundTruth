# Concept: User Workspace Tracking

## Definition

A lightweight operator-facing planning system using user workspace sources (`src_user_current_context.md`, `src_user_tasks.md`, `src_user_journal.md`) with date/version conventions and a JSON companion for tasks.

## Why It Matters

- Keeps day-to-day execution visible without changing canonical product graph JSON.
- Enables faster coordination between user planning and LLM-assisted operations.

## Evidence Across Sources

- User README defines date-based versioning and linked-entity rules.
- Current context file captures daily active focus and next action but still references legacy linked IDs.
- Task source now mirrors ClickUp CSV export exactly (111 rows, 15 columns) with `src_user_tasks.json` as structured companion.
- Journal template exists but has not yet captured real session history.

## Linked Entities

- [Experimentation & Development](../entities/cat_experiment.md)
- [CODEX CLI Setup](../entities/sub_codex_cli.md)

## Open Questions

- Should `src_user_current_context.md` linked entity/task references be normalized to canonical entity IDs and current ClickUp task IDs?
- How often should journal entries be enforced for auditability?
