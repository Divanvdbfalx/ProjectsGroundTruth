---
id: "cat_data"
record_type: "entity"
entity_type: "category"
health: "red"
product_id: "prd_pzero"
category_id: "cat_data"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Data Management

- ID: `cat_data`
- Type: `category`
- Health: `red`

## Current State
Inference data works; versioning and lineage are weak. The inference side is fed by API and scheduled execution modes from SAM-deployed infrastructure, and datalake access is supported by Athena tooling, but tighter lineage and environment-aware partitioning conventions are still needed.

## Target State
Versioned and traceable data lifecycle.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_data_versioning|Data Versioning]]
- [[entities/sub_inference_datalake|Inference Datalake]]
- [[entities/sub_training_storage|Training Data Storage]]

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### category
Data Management

### current_problem
No robust dataset versioning or lineage.

### description
Data storage, versioning, and lineage across model lifecycle. Scope includes inference datalake outputs from API and scheduled inference jobs, training data storage, and the governance controls required to trace data end-to-end across dev/prod operations.

### impact
Experimentation and reproducibility blocked.

### importance
Critical

### product
P-Zerø

### target
Immutable, traceable dataset lifecycle.
