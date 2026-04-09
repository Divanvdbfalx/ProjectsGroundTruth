# Entity: Cross-Site Experimentation

## Summary

Current experiments are single-site (eims_castle) with intra-site weather-source comparison (mix vs ncep-gfs) using temporal CV.

## Canonical ID

- `sub_cross_site_exp`
- Type: `subcategory`
- Parent: [Experimentation & Development](./cat_experiment.md)
- Category: [Experimentation & Development](./cat_experiment.md)
- Health: `red`

## Current State

- Current experiments are single-site (eims_castle) with intra-site weather-source comparison (mix vs ncep-gfs) using temporal CV. Canonical split artifacts exist and CV currently yields 2 folds per source. Latest results show CV can materially change winner selection versus single holdout (mix switched from baseline winner in holdout to xgboost winner in CV).

## Target State

- Generalized multi-site experimentation with consistent data contracts, source-level and fused-source benchmarking, and test-backed promotion criteria.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- `task_cross_site_exp_1` | Define cross-site metric pack | status=`todo` | priority=`critical`
- `task_cross_site_exp_2` | Build site abstraction layer | status=`todo` | priority=`high`

## Linked User Tasks (user/tasks.md)

- Current `src_user_tasks` CSV mirror does not include canonical entity IDs, so deterministic per-entity user-task linkage is unavailable.
- See [src_user_tasks](../sources/src_user_tasks.md) for the latest full task snapshot and derived rollups.

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
