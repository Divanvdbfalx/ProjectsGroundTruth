---
id: "sub_shapely_inspector"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_tooling"
parent_id: "cat_tooling"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Shapely Inspector

- ID: `sub_shapely_inspector`
- Type: `subcategory`
- Health: `green`

## Current State
Shapley Inspector is an upload-driven explainability UI that runs shap_inference_waterfall.py as a subprocess with isolated run directories under shapley_inspector/artifacts/shap_ui_runs/<timestamp>/. It accepts required pipeline pickle + meteo CSV and optional inference/background datasets, supports base/meta/end_to_end/lambda_faithful explanation levels, and outputs SHAP waterfall artifacts (combined or per-timestep), optional normalized time-series and average-waterfall plots, optional reconstructed inference-aligned CSVs, and strict-compare diagnostics with tolerance checks. Current implementation constraint: parser limits --model-type to xgb.

## Target State
Integrate outputs into standard workflows.

## Parent
- [[entities/cat_tooling|Tooling Ecosystem]]

## Children
- None

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### category
Tooling Ecosystem

### current_problem
Workflow integration gaps.

### description
Model explainability and reconstruction-validation tool for forecast pipelines. It generates interpretable SHAP artifacts and consistency checks against inference outputs so operators can diagnose prediction behavior, investigate feature contribution patterns, and validate end-to-end model reconstruction assumptions.

### impact
Slower diagnostics in some paths.

### importance
Medium

### product
P-Zerø

### subcategory
Shapely Inspector

### target
Standardized diagnostics output.
