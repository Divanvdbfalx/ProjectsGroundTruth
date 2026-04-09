# Entity: Data Versioning

## Summary

Version control for datasets in the AWS platform.

## Canonical ID

- `sub_data_versioning`
- Type: `subcategory`
- Parent: [Data Management](./cat_data.md)
- Category: [Data Management](./cat_data.md)
- Health: `red`

## Current State

- Version control for datasets in the AWS platform. Training datasets get overwritten when training a new model and old datasets are lost.

## Target State

- Immutable versioned dataset snapshots in AWS with dates and possible concatenation of datasets to create a more complete training data set.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- `task_data_versioning_1` | Enforce immutable dataset snapshots | status=`todo` | priority=`critical`
- `task_data_versioning_2` | Attach dataset version to training runs | status=`todo` | priority=`critical`

## Linked User Tasks (user/tasks.md)

- None linked in user task register.

## Relationships

### Outgoing
- `blocks` -> [Model Versioning](./sub_model_versioning.md) | Data versioning blocks trustworthy model versioning.

### Incoming
- None.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
