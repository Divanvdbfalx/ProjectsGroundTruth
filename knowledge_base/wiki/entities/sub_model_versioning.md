# Entity: Model Versioning

## Summary

Versioning is artifact-centric and model-family-aware but not yet a full registry.

## Canonical ID

- `sub_model_versioning`
- Type: `subcategory`
- Parent: [Modeling & Training](./cat_modeling.md)
- Category: [Modeling & Training](./cat_modeling.md)
- Health: `red`

## Current State

- Versioning is artifact-centric and model-family-aware but not yet a full registry. Outputs are suffixed by family (_xgb, _lgbm), stored in site-scoped artifact folders (models, plots, metrics), and uploaded to suffixed S3 paths. Pipeline binaries are exported with site+family naming conventions, environment snapshots are tracked via pip freeze artifacts, and SHAP background datasets/metadata are versioned as separate artifacts. Promotion to dev is explicit through push_to_dev.py by copying selected family artifacts to dev_uri with optional API validation, and older/ provides historical code snapshots.

## Target State

- Formal model registry.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- `task_model_versioning_1` | Create model registry spec | status=`todo` | priority=`critical`
- `task_model_versioning_2` | Gate deploys on model registry entry | status=`todo` | priority=`high`

## Linked User Tasks (user/tasks.md)

- None linked in user task register.

## Relationships

### Outgoing
- `enables` -> [Historical Performance Tracking](./sub_historical_perf.md) | Model versioning enables historical performance comparisons.

### Incoming
- [Data Versioning](./sub_data_versioning.md) -> `blocks` | Data versioning blocks trustworthy model versioning.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
