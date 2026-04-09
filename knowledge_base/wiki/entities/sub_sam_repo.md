# Entity: Deployment Repository (AWS SAM)

## Summary

Currently the sylvan GitHub account with repositories for each site/customer https://github.com/sylvan-falx.

## Canonical ID

- `sub_sam_repo`
- Type: `subcategory`
- Parent: [Infrastructure & Deployment](./cat_infra.md)
- Category: [Infrastructure & Deployment](./cat_infra.md)
- Health: `green`

## Current State

- Currently the sylvan GitHub account with repositories for each site/customer

https://github.com/sylvan-falx. Deploy workflow uses `sam deploy --config-env dev` and `sam deploy --config-env prod`, with local developer emulation via `sam local invoke`; SAM config defines separate dev/prod stacks from the same parameterized template.

## Target State

- Still need to decide between a unified repo for the deployment and repo per site.

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
