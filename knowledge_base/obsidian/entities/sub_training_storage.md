---
id: "sub_training_storage"
record_type: "entity"
entity_type: "subcategory"
health: "yellow"
product_id: "prd_pzero"
category_id: "cat_data"
parent_id: "cat_data"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Training Data Storage

- ID: `sub_training_storage`
- Type: `subcategory`
- Health: `yellow`

## Current State
Training data is on the FALX AWS Main account, stored in S3 when training a model. The production and meteo data is currently split. This remains separate from inference datalake storage, which increases friction when tracing deployed inference behavior back to exact training snapshots and feature states.

## Target State
Version controlled datasets with easy linking between meteo and production data

## Parent
- [[entities/cat_data|Data Management]]

## Children
- None

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### description
Storage for training datasets. Requires stronger linkage to inference datalake partitions and deployment-environment metadata so training-to-inference reproducibility is auditable.
