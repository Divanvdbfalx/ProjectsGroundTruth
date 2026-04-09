# Entity: Tooling Ecosystem

## Summary

PZERO-tooling is actively used as an operations-focused Streamlit toolbox across the wind forecasting lifecycle: weather extraction, Athena datalake querying, submission QA, and SHAP-based prediction diagnostics.

## Canonical ID

- `cat_tooling`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `yellow`

## Current State

- PZERO-tooling is actively used as an operations-focused Streamlit toolbox across the wind forecasting lifecycle: weather extraction, Athena datalake querying, submission QA, and SHAP-based prediction diagnostics. The tools are functional and cover core day-to-day workflows, but user experience, shared conventions, and configuration patterns still vary across apps.

## Target State

- Standardized tooling interfaces and ownership.

## Children

- [Datalake Tools](./sub_datalake_tools.md) (`sub_datalake_tools`)
- [MeteoMatics Downloader](./sub_meteomatics.md) (`sub_meteomatics`)
- [Shapely Inspector](./sub_shapely_inspector.md) (`sub_shapely_inspector`)
- [Tool Standardization](./sub_tool_standardization.md) (`sub_tool_standardization`)

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
