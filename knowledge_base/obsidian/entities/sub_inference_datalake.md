---
id: "sub_inference_datalake"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_data"
parent_id: "cat_data"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Inference Datalake

- ID: `sub_inference_datalake`
- Type: `subcategory`
- Health: `green`

## Current State
Inference datalake is operational and on the FALX AWS Infrastructure account, where it is partitioned and easily accessable by quering the datalake with the Datalake Tool. Data arrivals are tied to deployed inference execution modes (API and scheduler-driven runs), while scheduled daily/weekly triggers remain disabled until explicitly turned on.

## Target State
None

## Parent
- [[entities/cat_data|Data Management]]

## Children
- None

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- [[relationships/rel_datalake_tools_enables_inference_datalake|rel_datalake_tools_enables_inference_datalake]]: [[entities/sub_datalake_tools|Datalake Tools]] -> `enables`

## Full Context
### description
Inference data storage and access. This node is the operational sink for deployed forecasting outputs and needs to stay query-friendly for Athena-based QA, submission checks, and cross-environment (dev/prod) traceability.
