---
id: "sub_historical_perf"
record_type: "entity"
entity_type: "subcategory"
health: "red"
product_id: "prd_pzero"
category_id: "cat_performance"
parent_id: "cat_performance"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Historical Performance Tracking

- ID: `sub_historical_perf`
- Type: `subcategory`
- Health: `red`

## Current State
Long-term performance history is fragmented.

## Target State
Queryable longitudinal performance history.

## Parent
- [[entities/cat_performance|Performance & Evaluation]]

## Children
- None

## Linked Tasks
- [[tasks/task_historical_perf_1|Backfill historical performance store (todo, critical)]]
- [[tasks/task_historical_perf_2|Create trend dashboards (todo, high)]]

## Outgoing Relationships
- [[relationships/rel_perf_tracking_enables_business_value|rel_perf_tracking_enables_business_value]]: `enables` -> [[entities/cat_business|Business Layer]]

## Incoming Relationships
- [[relationships/rel_model_versioning_enables_perf_tracking|rel_model_versioning_enables_perf_tracking]]: [[entities/sub_model_versioning|Model Versioning]] -> `enables`

## Full Context
### category
Performance & Evaluation

### current_problem
No centralized historical warehouse.

### description
Trend analysis over models/releases/sites.

### impact
Regression/ROI visibility is weak.

### importance
Critical

### product
P-Zerø

### subcategory
Historical Performance Tracking

### target
Complete history with release markers.
