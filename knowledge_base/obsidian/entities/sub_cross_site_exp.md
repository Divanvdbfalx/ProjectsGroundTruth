---
id: "sub_cross_site_exp"
record_type: "entity"
entity_type: "subcategory"
health: "red"
product_id: "prd_pzero"
category_id: "cat_experiment"
parent_id: "cat_experiment"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Cross-Site Experimentation

- ID: `sub_cross_site_exp`
- Type: `subcategory`
- Health: `red`

## Current State
Current experiments are single-site (eims_castle) with intra-site weather-source comparison (mix vs ncep-gfs) using temporal CV. Canonical split artifacts exist and CV currently yields 2 folds per source. Latest results show CV can materially change winner selection versus single holdout (mix switched from baseline winner in holdout to xgboost winner in CV).

## Target State
Generalized multi-site experimentation with consistent data contracts, source-level and fused-source benchmarking, and test-backed promotion criteria.

## Parent
- [[entities/cat_experiment|Experimentation & Development]]

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
Experimentation & Development

### current_problem
Cross-site generalization is not yet implemented; active runner does not consume test split for model selection and several roadmap capabilities (source fusion, stacking/residual layers, expanded lag/rolling diagnostics) are pending.

### description
Temporal CV experiment flow currently benchmarked on eims_castle with source-specific tracks for mix and ncep-gfs. Data splits are pre-materialized (train/valid/test), OOF predictions and fold metrics are persisted, and summary ranking is available per source.

### impact
Findings are strong for local source comparison but cannot yet provide robust multi-site transferability claims.

### product
P-Zerø

### subcategory
Cross-Site Experimentation

### target
Scalable cross-site experimentation layer with unified fold semantics, explicit test-stage evaluation, and comparable multi-site performance diagnostics.
