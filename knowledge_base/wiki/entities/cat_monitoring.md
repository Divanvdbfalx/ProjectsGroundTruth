# Entity: Monitoring & Observability

## Summary

Dashboards exist but active response is weak.

## Canonical ID

- `cat_monitoring`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `red`

## Current State

- Dashboards exist but active response is weak.

## Target State

- Always-on monitoring with alerts and ownership.

## Children

- [Active Monitoring](./sub_active_monitoring.md) (`sub_active_monitoring`)
- [Alerts & Anomaly Detection](./sub_alerts_anomaly.md) (`sub_alerts_anomaly`)
- [Monitoring Dashboards](./sub_monitoring_dashboards.md) (`sub_monitoring_dashboards`)

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

## Linked User Tasks (user/tasks.md)

- None linked in user task register.

## Relationships

### Outgoing
- `enables` -> [Performance & Evaluation](./cat_performance.md) | Monitoring enables continuous performance awareness.

### Incoming
- None.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
