---
id: "task_alerts_anomaly_1"
record_type: "task"
entity_id: "sub_alerts_anomaly"
status: "todo"
priority: "critical"
source_json: "knowledge_base/raw/sources/src_data_tasks.json"
---
# Set baseline anomaly thresholds

- ID: `task_alerts_anomaly_1`
- Status: `todo`
- Priority: `critical`
- Linked Entity: [[entities/sub_alerts_anomaly|Alerts & Anomaly Detection]]

## Description
Per-site/model thresholds and false-positive tracking.

## Full Context
### category
Monitoring & Observability

### expected_impact
Higher signal-to-noise in alerts.

### problem
Alerts are noisy or missing.

### product
P-Zerø

### solution
Calibrated thresholds.

### subcategory
Alerts & Anomaly Detection
