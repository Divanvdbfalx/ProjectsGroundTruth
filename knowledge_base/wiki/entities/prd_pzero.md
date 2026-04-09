# Entity: P-Zerø

## Summary

P-Zerø is operational end-to-end: training uses a stacked-ensemble workflow (parallel XGB/LGBM families), inference is deployed on AWS Lambda via SAM/CloudFormation with dev/prod environments plus local SAM emulation, outputs are queryable through inference datalake tooling, and operators have dedicated utilities for weather extraction, Athena QA, submission diagnostics, and SHAP explainability.

## Canonical ID

- `prd_pzero`
- Type: `product`
- Health: `yellow`

## Current State

- P-Zerø is operational end-to-end: training uses a stacked-ensemble workflow (parallel XGB/LGBM families), inference is deployed on AWS Lambda via SAM/CloudFormation with dev/prod environments plus local SAM emulation, outputs are queryable through inference datalake tooling, and operators have dedicated utilities for weather extraction, Athena QA, submission diagnostics, and SHAP explainability. Product maturity is still uneven: critical controls for immutable data/model lineage, standardized experiment and tool conventions, schedule activation and automation discipline, deployment/config consistency, and full commercial/operational governance are not yet uniformly enforced across the lifecycle.

## Target State

- Reproducible, observable, and commercially scalable forecasting platform.

## Children

- [Business Layer](./cat_business.md) (`cat_business`)
- [Data Management](./cat_data.md) (`cat_data`)
- [Documentation & Knowledge](./cat_docs.md) (`cat_docs`)
- [Experimentation & Development](./cat_experiment.md) (`cat_experiment`)
- [Infrastructure & Deployment](./cat_infra.md) (`cat_infra`)
- [Modeling & Training](./cat_modeling.md) (`cat_modeling`)
- [Monitoring & Observability](./cat_monitoring.md) (`cat_monitoring`)
- [Performance & Evaluation](./cat_performance.md) (`cat_performance`)
- [Tooling Ecosystem](./cat_tooling.md) (`cat_tooling`)

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

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
