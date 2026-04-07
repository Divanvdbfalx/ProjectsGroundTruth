# Entity: Historical Performance Tracking

## Summary

Long-term performance history is fragmented.

## Canonical ID

- `sub_historical_perf`
- Type: `subcategory`
- Parent: [Performance & Evaluation](./cat_performance.md)
- Category: [Performance & Evaluation](./cat_performance.md)
- Health: `red`

## Current State

- Long-term performance history is fragmented.

## Target State

- Queryable longitudinal performance history.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- `task_historical_perf_1` | Backfill historical performance store | status=`todo` | priority=`critical`
- `task_historical_perf_2` | Create trend dashboards | status=`todo` | priority=`high`

## Linked User Tasks (user/tasks.md)

- `usr_task_edf_performance_analysis_1` | Do a performance analysis | status=`blocked` | priority=`high`

## Relationships

### Outgoing
- `enables` -> [Business Layer](./cat_business.md) | Performance tracking enables business value measurement.

### Incoming
- [Model Versioning](./sub_model_versioning.md) -> `enables` | Model versioning enables historical performance comparisons.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
