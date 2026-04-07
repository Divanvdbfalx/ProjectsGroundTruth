# Entity: Experimentation & Development

## Summary

Experimentation now has an active temporal-CV harness for site eims_castle (mix vs ncep-gfs), but architecture is split between the new experiments runner and a legacy production-style pipeline.

## Canonical ID

- `cat_experiment`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `red`

## Current State

- Experimentation now has an active temporal-CV harness for site eims_castle (mix vs ncep-gfs), but architecture is split between the new experiments runner and a legacy production-style pipeline. The benchmarking path is reproducible but still incomplete: train+valid drives selection while test is not integrated into runner decisions, some config keys are not consumed, and fold semantics differ between holdout and CV artifacts.

## Target State

- Unified and documented experimentation platform with strict temporal CV, explicit test-stage promotion, consistent artifact semantics, and repeatable cross-site model evaluation.

## Children

- [CODEX CLI Setup](./sub_codex_cli.md) (`sub_codex_cli`)
- [Cross-Site Experimentation](./sub_cross_site_exp.md) (`sub_cross_site_exp`)

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

## Linked User Tasks (user/tasks.md)

- `usr_task_epic_pzero_development_1` | Epic: Pzero development | status=`todo` | priority=`high`

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
