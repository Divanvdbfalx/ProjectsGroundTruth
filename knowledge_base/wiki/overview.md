# Knowledge Overview

## Scope

- Domain: P-Zerø product graph, operational dependencies, and user sprint execution context.
- Goals: Keep an incrementally maintained markdown wiki synchronized with canonical data and user planning artifacts.
- Decision Horizon: Active sprint execution plus medium-term platform maturity planning.

## Current Synthesis

- Canonical graph snapshot contains 38 entities, 6 relationships, and 16 product tasks.
- User task register contains 11 rows with status mix: `blocked`=5, `todo`=4, `in_progress`=2.
- Experimentation track remains active through [sub_cross_site_exp](./entities/sub_cross_site_exp.md) and [sub_codex_cli](./entities/sub_codex_cli.md).
- Current in-progress user tasks:
  - `usr_task_codex_cli_exp_import_clean_data_1`: Import and clean data
  - `usr_task_template_1`: Define current session objective

## Known Contradictions

- `user/current_context.md` linked entity `codex_cli_experimentation_platform` is not a canonical entity ID in `data/entities.json`.
- Template task `usr_task_template_1` is still marked `in_progress`, which may distort sprint visibility.
- 5 user tasks are currently blocked; EDF follow-up cluster is a major blocked group.

## Open Questions

- What concrete unblock criteria should be attached to each EDF task?
- Should `user/current_context.md` linked IDs be normalized to canonical entity IDs now?
- Should historical snapshots (`data/v0.0.1`, `data/v0.0.2`) be compared and summarized in a dedicated drift report?

## Next Sources To Ingest

- New journal entries once operational work resumes in `user/journal.md`.
- Any future data graph revisions under `data/` and versioned snapshots under `data/v0.0.*`.
