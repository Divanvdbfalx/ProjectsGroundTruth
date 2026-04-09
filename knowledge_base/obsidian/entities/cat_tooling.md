---
id: "cat_tooling"
record_type: "entity"
entity_type: "category"
health: "yellow"
product_id: "prd_pzero"
category_id: "cat_tooling"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Tooling Ecosystem

- ID: `cat_tooling`
- Type: `category`
- Health: `yellow`

## Current State
PZERO-tooling is actively used as an operations-focused Streamlit toolbox across the wind forecasting lifecycle: weather extraction, Athena datalake querying, submission QA, and SHAP-based prediction diagnostics. The tools are functional and cover core day-to-day workflows, but user experience, shared conventions, and configuration patterns still vary across apps.

## Target State
Standardized tooling interfaces and ownership.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_datalake_tools|Datalake Tools]]
- [[entities/sub_meteomatics|MeteoMatics Downloader]]
- [[entities/sub_shapely_inspector|Shapely Inspector]]
- [[entities/sub_tool_standardization|Tool Standardization]]

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
Inconsistent standards.

### description
Collection of lightweight operational utilities that support forecast data ingestion, data-quality validation, datalake exploration, submission behavior diagnostics, and model explainability. The ecosystem is intentionally modular and app-centric, with each tool solving a specific workflow step while sharing the same product context.

### impact
Maintenance overhead.

### importance
Medium

### product
P-Zerø

### target
Unified tool conventions.
