---
id: "sub_sam_repo"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_infra"
parent_id: "cat_infra"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Deployment Repository (AWS SAM)

- ID: `sub_sam_repo`
- Type: `subcategory`
- Health: `green`

## Current State
Currently the sylvan GitHub account with repositories for each site/customer

https://github.com/sylvan-falx. Deploy workflow uses `sam deploy --config-env dev` and `sam deploy --config-env prod`, with local developer emulation via `sam local invoke`; SAM config defines separate dev/prod stacks from the same parameterized template.

## Target State
Still need to decide between a unified repo for the deployment and repo per site.

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
The account/repositories/version control for the deployment framework. Known operational risks include runtime/config drift (for example Python version mismatch between Dockerfile and template metadata), cross-repo naming inconsistencies (`aurora` references in some config artifacts), and weak secret hygiene where API keys appear directly in documentation scripts.
