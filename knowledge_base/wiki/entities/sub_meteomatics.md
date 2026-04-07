# Entity: MeteoMatics Downloader

## Summary

Meteomatics Extractor is operational as the weather-input preparation tool.

## Canonical ID

- `sub_meteomatics`
- Type: `subcategory`
- Parent: [Tooling Ecosystem](./cat_tooling.md)
- Category: [Tooling Ecosystem](./cat_tooling.md)
- Health: `green`

## Current State

- Meteomatics Extractor is operational as the weather-input preparation tool. It allows in-app editing of YAML extraction settings (project, history range, resolution, timezone, models, features), supports both polygon and single-point extraction modes, authenticates via MM_USERNAME/MM_PASSWORD, chunks API requests by feature groups and date window limits, writes one CSV per weather model to data/{project}_{model}_meteo_data.csv, and can skip or overwrite existing outputs. It also loads generated files for normalized multi-model time-series plotting inside the UI.

## Target State

- Maintain reliability and standards alignment.

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
