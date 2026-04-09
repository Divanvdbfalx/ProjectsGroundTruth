# Entity: Active Monitoring

## Summary

Signals are not actively managed daily.

## Canonical ID

- `sub_active_monitoring`
- Type: `subcategory`
- Parent: [Monitoring & Observability](./cat_monitoring.md)
- Category: [Monitoring & Observability](./cat_monitoring.md)
- Health: `red`

## Current State

- Signals are not actively managed daily.

## Target State

- Owner-based active monitoring cadence.

## Children

- None.

## Linked Product Tasks (data/tasks.json)

- `task_active_monitoring_1` | Assign monitoring ownership rota | status=`todo` | priority=`critical`
- `task_active_monitoring_2` | Automate daily health digest | status=`todo` | priority=`high`

## Linked User Tasks (user/tasks.md)

- None linked in user task register.

## Relationships

### Outgoing
- None.

### Incoming
- None.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
