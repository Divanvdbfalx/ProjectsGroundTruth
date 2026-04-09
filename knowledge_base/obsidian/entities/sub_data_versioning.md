---
id: "sub_data_versioning"
record_type: "entity"
entity_type: "subcategory"
health: "red"
product_id: "prd_pzero"
category_id: "cat_data"
parent_id: "cat_data"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Data Versioning

- ID: `sub_data_versioning`
- Type: `subcategory`
- Health: `red`

## Current State
Version control for datasets in the AWS platform. Training datasets get overwritten when training a new model and old datasets are lost.

## Target State
Immutable versioned dataset snapshots in AWS with dates and possible concatenation of datasets to create a more complete training data set.

## Parent
- [[entities/cat_data|Data Management]]

## Children
- None

## Linked Tasks
- None

## Outgoing Relationships
- [[relationships/rel_data_versioning_blocks_model_versioning|rel_data_versioning_blocks_model_versioning]]: `blocks` -> [[entities/sub_model_versioning|Model Versioning]]

## Incoming Relationships
- None

## Full Context
### description
Version control for datasets in the AWS platform, which is curre
