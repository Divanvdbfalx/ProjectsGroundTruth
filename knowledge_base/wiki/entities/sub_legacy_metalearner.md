# Entity: Legacy Metalearner (XGBoost/LightGBM)

## Summary

The active training flow is a stacked ensemble: for each configured weather source (for example mix, ncep-gfs) a base learner is trained, then a meta-learner is trained on base predictions to produce final site forecasts.

## Canonical ID

- `sub_legacy_metalearner`
- Type: `subcategory`
- Parent: [Modeling & Training](./cat_modeling.md)
- Category: [Modeling & Training](./cat_modeling.md)
- Health: `yellow`

## Current State

- The active training flow is a stacked ensemble: for each configured weather source (for example mix, ncep-gfs) a base learner is trained, then a meta-learner is trained on base predictions to produce final site forecasts. Two parallel model families (XGB and LGBM) implement the same workflow and output conventions. Preprocessing is consistent across families: production and meteo are timezone-normalized and resampled, meteo intervals are left-aligned, merged rows with missing values are dropped, a common overlap window is enforced across weather sources, and train/validation uses a time-ordered 80/20 split. Wind-speed anomaly detection is run in configured rounds, with behavior controlled by anomaly_handling_mode (visualize-only or remove-for-training).

## Target State

- Governed and benchmarked lifecycle.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

## Linked User Tasks (user/tasks.md)

- None linked in user task register.

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
