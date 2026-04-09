# Entity: Training Data Storage

## Summary

Training data is on the FALX AWS Main account, stored in S3 when training a model.

## Canonical ID

- `sub_training_storage`
- Type: `subcategory`
- Parent: [Data Management](./cat_data.md)
- Category: [Data Management](./cat_data.md)
- Health: `yellow`

## Current State

- Training data is on the FALX AWS Main account, stored in S3 when training a model. The production and meteo data is currently split. This remains separate from inference datalake storage, which increases friction when tracing deployed inference behavior back to exact training snapshots and feature states.

## Target State

- Version controlled datasets with easy linking between meteo and production data

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
