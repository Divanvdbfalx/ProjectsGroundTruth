# Entity: Feature Engineering

## Summary

Feature engineering capability is broad in code but partially active in runtime.

## Canonical ID

- `sub_feature_engineering`
- Type: `subcategory`
- Parent: [Modeling & Training](./cat_modeling.md)
- Category: [Modeling & Training](./cat_modeling.md)
- Health: `green`

## Current State

- Feature engineering capability is broad in code but partially active in runtime. Implemented blocks include time features, cyclical encodings, Fourier terms, wind-vector decomposition (u/v), lag features, rolling statistics, and interaction features. In current LGBM/XGB training scripts, many transforms in transform() are intentionally disabled/commented, so the effective feature set is primarily cleaned/resampled meteo inputs from settings plus explicit downstream additions where configured.

## Target State

- Keep expanding tested features.

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
