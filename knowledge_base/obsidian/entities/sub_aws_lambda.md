---
id: "sub_aws_lambda"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_infra"
parent_id: "cat_infra"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# AWS Lambda Deployment

- ID: `sub_aws_lambda`
- Type: `subcategory`
- Health: `green`

## Current State
AWS Lambda is sufficient for reliable and stable deployments. Deployment currently uses SAM + CloudFormation with container-image Lambdas and explicit dev/prod stack separation; non-prod runtime is configured for more verbose logs and internal email routing behavior.

## Target State
None

## Parent
- [[entities/cat_infra|Infrastructure & Deployment]]

## Children
- None

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### description
The method used to deliver forecasts accurately and reliably to the customer/ESKOM/NTCSA. Invocation paths include API Gateway `POST /forecast` (API key protected) and Step Functions-triggered daily/weekly inference Lambda runs, with schedules currently requiring explicit enablement.
