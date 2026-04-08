---
id: "sub_feature_engineering"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_modeling"
parent_id: "cat_modeling"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Feature Engineering

- ID: `sub_feature_engineering`
- Type: `subcategory`
- Health: `green`

## Current State
Feature engineering capability is broad in code but partially active in runtime. Implemented blocks include time features, cyclical encodings, Fourier terms, wind-vector decomposition (u/v), lag features, rolling statistics, and interaction features. In current LGBM/XGB training scripts, many transforms in transform() are intentionally disabled/commented, so the effective feature set is primarily cleaned/resampled meteo inputs from settings plus explicit downstream additions where configured.

## Target State
Keep expanding tested features.

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
Needs ongoing drift checks.

### description
Feature engineering layer transforms raw meteo and site signals into model-ready predictors, while diagnostics support feature understanding through lag-correlation analysis, feature-vs-production plots, and feature-importance outputs. Current operational emphasis is reliability and comparability over maximal feature complexity, with richer transforms available for controlled reactivation during experimentation.

### impact
Core driver of accuracy.

### importance
Critical

### product
P-Zerø

### subcategory
Feature Engineering

### target
Scalable and explainable feature pipeline.
