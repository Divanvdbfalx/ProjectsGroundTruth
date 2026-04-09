# Entity: Weather Data Benchmarking

## Summary

Weather benchmarking is implemented through per-weather-model base learners trained in parallel for each configured source.

## Canonical ID

- `sub_weather_benchmark`
- Type: `subcategory`
- Parent: [Modeling & Training](./cat_modeling.md)
- Category: [Modeling & Training](./cat_modeling.md)
- Health: `green`

## Current State

- Weather benchmarking is implemented through per-weather-model base learners trained in parallel for each configured source. Each source logs model-specific metrics (MAE, RMSE, nMAE, nRMSE, R2, penalty), and lag-correlation diagnostics provide pre-training signal comparisons. The meta-learner then benchmarks combined value by learning weighted/nonlinear combinations of base outputs. Practical caveat: ClearML captures detailed per-model metrics, while metrics.csv is currently focused mainly on final ensemble summaries.

## Target State

- Automated benchmark scorecards.

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
