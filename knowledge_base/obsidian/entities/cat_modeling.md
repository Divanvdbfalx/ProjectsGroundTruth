---
id: "cat_modeling"
record_type: "entity"
entity_type: "category"
health: "yellow"
product_id: "prd_pzero"
category_id: "cat_modeling"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Modeling & Training

- ID: `cat_modeling`
- Type: `category`
- Health: `yellow`

## Current State
Model training is operationalized as a stacked-ensemble workflow with parallel XGB and LGBM families, but lifecycle controls (feature activation discipline, version lineage, and standardized experiment governance) are still uneven.

## Target State
Governed and versioned model lifecycle.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_feature_engineering|Feature Engineering]]
- [[entities/sub_legacy_metalearner|Legacy Metalearner (XGBoost/LightGBM)]]
- [[entities/sub_model_versioning|Model Versioning]]
- [[entities/sub_weather_benchmark|Weather Data Benchmarking]]

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### category
Modeling & Training

### current_problem
Model artifacts not consistently versioned.

### description
End-to-end model training and forecasting lifecycle built around weather-model-specific base learners and a meta-learner ensemble, with shared preprocessing, time-ordered validation, diagnostics, artifact packaging, and deployment promotion flow.

### impact
Rollback and comparison risk.

### importance
Critical

### product
P-Zerø

### target
Model registry and reproducible training.
