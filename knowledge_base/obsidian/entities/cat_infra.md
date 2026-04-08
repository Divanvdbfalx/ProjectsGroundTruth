---
id: "cat_infra"
record_type: "entity"
entity_type: "category"
health: "green"
product_id: "prd_pzero"
category_id: "cat_infra"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Infrastructure & Deployment

- ID: `cat_infra`
- Type: `category`
- Health: `green`

## Current State
Serverless runtime for forecasting that happens in AWS Lambda instances. These instances are created from the site repos in the sylvan github account and uses AWS SAM to build and deploy to AWS Infrastructure account. Additional deployment context: developer mode runs local SAM emulation (`sam local invoke`) with event/env files; cloud deployment uses one parameterized SAM template with `DeploymentEnv` restricted to `dev` and `prod`; post-deploy runtime supports API (`POST /forecast`) plus scheduled daily and weekly inference paths through Step Functions to Lambda.

## Target State
Unified and reliable deployment foundations.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_aws_lambda|AWS Lambda Deployment]]
- [[entities/sub_sam_repo|Deployment Repository (AWS SAM)]]

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### description
The method used to deliver forecasts accurately and reliably to the customer/ESKOM/NTCSA. Strengths include clear dev/prod stack separation, shared IaC template usage across environments, image-based Lambda packaging for heavy Python dependencies, and multiple invocation patterns in one stack. Current limitations include only two deployment environments, schedule triggers disabled by default, manual deployment flow, and configuration inconsistencies that increase operational risk.
