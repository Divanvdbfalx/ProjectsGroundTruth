# Knowledge Overview

## Scope

- Domain: P-Zerø product graph, operational dependencies, and user sprint execution context.
- Goals: Keep an incrementally maintained markdown wiki synchronized with canonical data and user planning artifacts.
- Decision Horizon: Active sprint execution plus medium-term platform maturity planning.

## Current Synthesis

- Canonical graph snapshot contains 38 entities, 6 relationships, and 16 product tasks.
- User task register now mirrors ClickUp CSV export with 111 rows (`Epic`=22, `User Story`=88, `Bug`=1).
- Derived status from auto-progress (`📚 Progress (Auto)`) is: `done`=81, `in_progress`=8, `todo`=22.
- Highest active streams by partial progress include training pipeline, deployment/platform rebuild, NTCSA delivery, forecast evaluation, and product health execution.
- Latest task-source synthesis: [src_user_tasks](./sources/src_user_tasks.md) and [sprint status 2026 04 08](./concepts/sprint_status_2026_04_08.md).

## Known Contradictions

- `src_user_current_context.md` linked entity `codex_cli_experimentation_platform` is not a canonical entity ID in `src_data_entities.json`.
- `src_user_current_context.md` linked task `usr_task_codex_cli_exp_import_clean_data_1` is a legacy ID not present in current ClickUp CSV task IDs.
- Current CSV source has no canonical `entity_id` field, so entity-to-user-task joins are ambiguous without an explicit mapping layer.

## Open Questions

- Should we introduce a `task_to_entity_map` source to restore deterministic entity-linked user task sections?
- Should `src_user_current_context.md` linked IDs be normalized to ClickUp Task IDs + canonical entity IDs?
- Should historical snapshots (`src_data_v0_0_1*`, `src_data_v0_0_2*`) be compared in a dedicated drift report?

## Next Sources To Ingest

- New journal entries once operational work resumes in `user/journal.md`.
- Any future data graph revisions under `data/` and versioned snapshots under `data/v0.0.*`.
