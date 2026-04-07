# Entity: Business Layer

## Summary

Customers exist but pricing and payments are immature.

## Canonical ID

- `cat_business`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `red`

## Current State

- Customers exist but pricing and payments are immature.

## Target State

- Stable commercial operating system.

## Children

- [Contracts / SLAs](./sub_contracts_slas.md) (`sub_contracts_slas`)
- [Customers](./sub_customers.md) (`sub_customers`)
- [Payment System](./sub_payment.md) (`sub_payment`)
- [Pricing System](./sub_pricing.md) (`sub_pricing`)

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

## Linked User Tasks (user/tasks.md)

- `usr_task_epic_edf_follow_up_1` | Epic: Follow up with EDF | status=`blocked` | priority=`high`

## Relationships

### Outgoing
- `depends_on` -> [Performance & Evaluation](./cat_performance.md) | Business outcomes depend on measurable forecasting performance.

### Incoming
- [Historical Performance Tracking](./sub_historical_perf.md) -> `enables` | Performance tracking enables business value measurement.

## Related Sources

- [src_data_entities](../sources/src_data_entities.md)
- [src_data_tasks](../sources/src_data_tasks.md)
- [src_data_relationships](../sources/src_data_relationships.md)
- [src_user_tasks](../sources/src_user_tasks.md)
