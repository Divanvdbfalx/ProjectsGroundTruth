# Entity: CODEX CLI Setup

## Summary

Codex CLI experimentation flow is active around run_experiments.py and experiments/* for eims_castle.

## Canonical ID

- `sub_codex_cli`
- Type: `subcategory`
- Parent: [Experimentation & Development](./cat_experiment.md)
- Category: [Experimentation & Development](./cat_experiment.md)
- Health: `red`

## Current State

- Codex CLI experimentation flow is active around run_experiments.py and experiments/* for eims_castle. It currently runs temporal CV with expanding windows and evaluates baseline + ML models (linear regression, random forest, lightgbm, xgboost, mlp) with composite scoring. Tests are valid but depend on environment bootstrapping (PYTHONPATH=. pytest -q).

## Target State

- Reliable Codex CLI workflow with stable environment setup, reproducible run contracts, and automation-friendly interfaces for model search, diagnostics, and promotion decisions.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

## Linked User Tasks (user/tasks.md)

- `usr_task_pzero_complete_existing_tickets_1` | Complete existing Pzero development tickets | status=`todo` | priority=`high`
- `usr_task_pzero_align_platform_plan_rourke_1` | Chat with Rourke about platform concept and implementation plan | status=`todo` | priority=`medium`

## Relationships

### Outgoing
- None.

### Incoming
- None.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
