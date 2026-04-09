---
id: "sub_weather_benchmark"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_modeling"
parent_id: "cat_modeling"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Weather Data Benchmarking

- ID: `sub_weather_benchmark`
- Type: `subcategory`
- Health: `green`

## Current State
Weather benchmarking is implemented through per-weather-model base learners trained in parallel for each configured source. Each source logs model-specific metrics (MAE, RMSE, nMAE, nRMSE, R2, penalty), and lag-correlation diagnostics provide pre-training signal comparisons. The meta-learner then benchmarks combined value by learning weighted/nonlinear combinations of base outputs. Practical caveat: ClearML captures detailed per-model metrics, while metrics.csv is currently focused mainly on final ensemble summaries.

## Target State
Automated benchmark scorecards.

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
Cadence not fully automated.

### description
Benchmarking node represents implicit competitive evaluation of weather data providers via model performance, not only static data QA. It measures source-level predictive contribution and incremental value in the stacked ensemble, enabling evidence-based weather-source selection and blend strategy decisions at site level.

### impact
Source choice speed reduced.

### importance
High

### product
P-Zerø

### subcategory
Weather Data Benchmarking

### target
Automated benchmarking loop.
