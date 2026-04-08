---
id: "task_data_versioning_2"
record_type: "task"
entity_id: "sub_data_versioning"
status: "todo"
priority: "critical"
source_json: "knowledge_base/raw/sources/src_data_tasks.json"
---
# Attach dataset version to training runs

- ID: `task_data_versioning_2`
- Status: `todo`
- Priority: `critical`
- Linked Entity: [[entities/sub_data_versioning|Data Versioning]]

## Description
Require version IDs in training metadata.

## Full Context
### category
Data Management

### expected_impact
End-to-end traceability.

### problem
Model runs cannot be traced to exact data.

### product
P-Zerø

### solution
Validation gate in training config.

### subcategory
Data Versioning
