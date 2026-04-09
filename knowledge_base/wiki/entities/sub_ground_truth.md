# Entity: Ground Truth Integration

## Summary

Ground truth ingestion is working.

## Canonical ID

- `sub_ground_truth`
- Type: `subcategory`
- Parent: [Performance & Evaluation](./cat_performance.md)
- Category: [Performance & Evaluation](./cat_performance.md)
- Health: `green`

## Current State

- Ground truth ingestion is working.

## Target State

- Automated QA around ground truth quality.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

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
