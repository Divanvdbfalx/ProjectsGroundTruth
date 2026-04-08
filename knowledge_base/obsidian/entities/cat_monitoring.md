---
id: "cat_monitoring"
record_type: "entity"
entity_type: "category"
health: "red"
product_id: "prd_pzero"
category_id: "cat_monitoring"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Monitoring & Observability

- ID: `cat_monitoring`
- Type: `category`
- Health: `red`

## Current State
Dashboards exist but active response is weak.

## Target State
Always-on monitoring with alerts and ownership.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_active_monitoring|Active Monitoring]]
- [[entities/sub_alerts_anomaly|Alerts & Anomaly Detection]]
- [[entities/sub_monitoring_dashboards|Monitoring Dashboards]]

## Linked Tasks
- None

## Outgoing Relationships
- [[relationships/rel_monitoring_enables_perf_awareness|rel_monitoring_enables_perf_awareness]]: `enables` -> [[entities/cat_performance|Performance & Evaluation]]

## Incoming Relationships
- None

## Full Context
### category
Monitoring & Observability

### current_problem
Signals are underused.

### description
Operational visibility and anomaly response.

### impact
Delayed incident detection.

### importance
Critical

### product
P-Zerø

### target
Proactive alerting and triage loops.
