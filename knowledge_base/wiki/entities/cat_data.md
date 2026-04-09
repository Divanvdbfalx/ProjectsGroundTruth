# Entity: Data Management

## Summary

Inference data works; versioning and lineage are weak.

## Canonical ID

- `cat_data`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `red`

## Current State

- Inference data works; versioning and lineage are weak. The inference side is fed by API and scheduled execution modes from SAM-deployed infrastructure, and datalake access is supported by Athena tooling, but tighter lineage and environment-aware partitioning conventions are still needed.

## Target State

- Versioned and traceable data lifecycle.

## Children

- [Data Versioning](./sub_data_versioning.md) (`sub_data_versioning`)
- [Inference Datalake](./sub_inference_datalake.md) (`sub_inference_datalake`)
- [Training Data Storage](./sub_training_storage.md) (`sub_training_storage`)

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
