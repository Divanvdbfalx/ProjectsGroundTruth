# Entity: Modeling & Training

## Summary

Model training is operationalized as a stacked-ensemble workflow with parallel XGB and LGBM families, but lifecycle controls (feature activation discipline, version lineage, and...

## Canonical ID

- `cat_modeling`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `yellow`

## Current State

- Model training is operationalized as a stacked-ensemble workflow with parallel XGB and LGBM families, but lifecycle controls (feature activation discipline, version lineage, and standardized experiment governance) are still uneven.

## Target State

- Governed and versioned model lifecycle.

## Children

- [Feature Engineering](./sub_feature_engineering.md) (`sub_feature_engineering`)
- [Legacy Metalearner (XGBoost/LightGBM)](./sub_legacy_metalearner.md) (`sub_legacy_metalearner`)
- [Model Versioning](./sub_model_versioning.md) (`sub_model_versioning`)
- [Weather Data Benchmarking](./sub_weather_benchmark.md) (`sub_weather_benchmark`)

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
