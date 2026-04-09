---
id: "sub_legacy_metalearner"
record_type: "entity"
entity_type: "subcategory"
health: "yellow"
product_id: "prd_pzero"
category_id: "cat_modeling"
parent_id: "cat_modeling"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Legacy Metalearner (XGBoost/LightGBM)

- ID: `sub_legacy_metalearner`
- Type: `subcategory`
- Health: `yellow`

## Current State
The active training flow is a stacked ensemble: for each configured weather source (for example mix, ncep-gfs) a base learner is trained, then a meta-learner is trained on base predictions to produce final site forecasts. Two parallel model families (XGB and LGBM) implement the same workflow and output conventions. Preprocessing is consistent across families: production and meteo are timezone-normalized and resampled, meteo intervals are left-aligned, merged rows with missing values are dropped, a common overlap window is enforced across weather sources, and train/validation uses a time-ordered 80/20 split. Wind-speed anomaly detection is run in configured rounds, with behavior controlled by anomaly_handling_mode (visualize-only or remove-for-training).

## Target State
Governed and benchmarked lifecycle.

## Parent
- [[entities/cat_modeling|Modeling & Training]]

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
Modeling & Training

### current_problem
Upgrade path is unclear.

### description
Legacy metalearner node captures the current operational stacked-ensemble architecture and its historical evolution. The repo contains earlier generations under older/ (v0.0.0 and v0.0.1) with prior XGBoost and polynomial power-curve paths, while top-level scripts represent a cleaner operational evolution with URI-based I/O, stronger artifact handling, standardized model-family suffixing, and integration into deployment/test flows.

### impact
Maintainability risk.

### importance
High

### product
P-Zerø

### subcategory
Legacy Metalearner (XGBoost/LightGBM)

### target
Controlled evolution.
