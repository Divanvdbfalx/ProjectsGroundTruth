# Entity: Inference Datalake

## Summary

Inference datalake is operational and on the FALX AWS Infrastructure account, where it is partitioned and easily accessable by quering the datalake with the Datalake Tool.

## Canonical ID

- `sub_inference_datalake`
- Type: `subcategory`
- Parent: [Data Management](./cat_data.md)
- Category: [Data Management](./cat_data.md)
- Health: `green`

## Current State

- Inference datalake is operational and on the FALX AWS Infrastructure account, where it is partitioned and easily accessable by quering the datalake with the Datalake Tool. Data arrivals are tied to deployed inference execution modes (API and scheduler-driven runs), while scheduled daily/weekly triggers remain disabled until explicitly turned on.

## Target State

- None

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
- [Datalake Tools](./sub_datalake_tools.md) -> `enables` | Tool provides frontend to easily access and navigate the inferene and meteo data

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
