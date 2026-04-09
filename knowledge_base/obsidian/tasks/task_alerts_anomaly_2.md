---
id: "task_alerts_anomaly_2"
record_type: "task"
entity_id: "sub_alerts_anomaly"
status: "todo"
priority: "high"
source_json: "knowledge_base/raw/sources/src_data_tasks.json"
---
# Implement routing + acknowledgements

- ID: `task_alerts_anomaly_2`
- Status: `todo`
- Priority: `high`
- Linked Entity: [[entities/sub_alerts_anomaly|Alerts & Anomaly Detection]]

## Description
Route to owners with ack/escalation states.

## Full Context
### category
Monitoring & Observability

### expected_impact
Faster response times.

### problem
Alerts don't reliably reach owners.

### product
P-Zerø

### solution
Owner-based routing and ack flow.

### subcategory
Alerts & Anomaly Detection
