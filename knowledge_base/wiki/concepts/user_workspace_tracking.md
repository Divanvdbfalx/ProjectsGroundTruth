# Concept: User Workspace Tracking

## Definition

A lightweight operator-facing planning system using markdown files (`current_context.md`, `tasks.md`, `journal.md`) with date/version conventions.

## Why It Matters

- Keeps day-to-day execution visible without changing canonical product graph JSON.
- Enables faster coordination between user planning and LLM-assisted operations.

## Evidence Across Sources

- User README defines date-based versioning and linked-entity rules.
- Current context file captures daily active focus and next action.
- Journal template exists but has not yet captured real session history.

## Linked Entities

- [Experimentation & Development](../entities/cat_experiment.md)
- [CODEX CLI Setup](../entities/sub_codex_cli.md)

## Open Questions

- Should `current_context.md` linked entity be normalized to canonical node IDs now?
- How often should journal entries be enforced for auditability?
