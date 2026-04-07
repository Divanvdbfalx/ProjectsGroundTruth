# Entity: Shapely Inspector

## Summary

Shapley Inspector is an upload-driven explainability UI that runs shap_inference_waterfall.py as a subprocess with isolated run directories under shapley_inspector/artifacts/shap_ui_runs/<timestamp>/.

## Canonical ID

- `sub_shapely_inspector`
- Type: `subcategory`
- Parent: [Tooling Ecosystem](./cat_tooling.md)
- Category: [Tooling Ecosystem](./cat_tooling.md)
- Health: `green`

## Current State

- Shapley Inspector is an upload-driven explainability UI that runs shap_inference_waterfall.py as a subprocess with isolated run directories under shapley_inspector/artifacts/shap_ui_runs/<timestamp>/. It accepts required pipeline pickle + meteo CSV and optional inference/background datasets, supports base/meta/end_to_end/lambda_faithful explanation levels, and outputs SHAP waterfall artifacts (combined or per-timestep), optional normalized time-series and average-waterfall plots, optional reconstructed inference-aligned CSVs, and strict-compare diagnostics with tolerance checks. Current implementation constraint: parser limits --model-type to xgb.

## Target State

- Integrate outputs into standard workflows.

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
