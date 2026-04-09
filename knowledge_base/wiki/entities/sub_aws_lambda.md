# Entity: AWS Lambda Deployment

## Summary

AWS Lambda is sufficient for reliable and stable deployments.

## Canonical ID

- `sub_aws_lambda`
- Type: `subcategory`
- Parent: [Infrastructure & Deployment](./cat_infra.md)
- Category: [Infrastructure & Deployment](./cat_infra.md)
- Health: `green`

## Current State

- AWS Lambda is sufficient for reliable and stable deployments. Deployment currently uses SAM + CloudFormation with container-image Lambdas and explicit dev/prod stack separation; non-prod runtime is configured for more verbose logs and internal email routing behavior.

## Target State

- None

## Children

- None.

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
