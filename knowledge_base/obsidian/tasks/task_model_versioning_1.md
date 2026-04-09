---
id: "task_model_versioning_1"
record_type: "task"
entity_id: "sub_model_versioning"
status: "todo"
priority: "critical"
source_json: "knowledge_base/raw/sources/src_data_tasks.json"
---
# Create model registry spec

- ID: `task_model_versioning_1`
- Status: `todo`
- Priority: `critical`
- Linked Entity: [[entities/sub_model_versioning|Model Versioning]]

## Description
Store artifact URI, config hash, dataset version, metrics.

## Full Context
### category
Modeling & Training

### expected_impact
Safer deploy and rollback.

### problem
No standard model registry.

### product
P-Zerø

### solution
Registry schema + required fields.

### subcategory
Model Versioning
