# Entity: Infrastructure & Deployment

## Summary

Serverless runtime for forecasting that happens in AWS Lambda instances.

## Canonical ID

- `cat_infra`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `green`

## Current State

- Serverless runtime for forecasting that happens in AWS Lambda instances. These instances are created from the site repos in the sylvan github account and uses AWS SAM to build and deploy to AWS Infrastructure account. Additional deployment context: developer mode runs local SAM emulation (`sam local invoke`) with event/env files; cloud deployment uses one parameterized SAM template with `DeploymentEnv` restricted to `dev` and `prod`; post-deploy runtime supports API (`POST /forecast`) plus scheduled daily and weekly inference paths through Step Functions to Lambda.

## Target State

- Unified and reliable deployment foundations.

## Children

- [AWS Lambda Deployment](./sub_aws_lambda.md) (`sub_aws_lambda`)
- [Deployment Repository (AWS SAM)](./sub_sam_repo.md) (`sub_sam_repo`)

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
