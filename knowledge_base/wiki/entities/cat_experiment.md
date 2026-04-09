# Entity: Experimentation & Development

## Summary

Experimentation now has an active temporal-CV harness for site eims_castle (mix vs ncep-gfs), but architecture is split between the new experiments runner and a legacy production-style pipeline.

## Canonical ID

- `cat_experiment`
- Type: `category`
- Parent: [P-Zerø](./prd_pzero.md)
- Health: `red`

## Current State

- Experimentation is transitioning from single-site validation to a governed multi-site platform. The active stream is cross-site data ingestion and cleanup, followed by standardized evaluation protocol definition. Near-term execution is focused on closing open Codex CLI and Pzero implementation tickets and aligning phased delivery with stakeholders. Platform hardening is still in progress: cross-site metric standards and site abstraction are not yet complete, so behavior remains partly fragmented across runner and legacy paths.

## Target State

- A unified experimentation platform where multi-site datasets follow consistent contracts, evaluation is protocol-driven with shared metric definitions, experiment logic is site-agnostic through abstraction layers, and model promotion uses explicit temporal-CV and test-stage gates. Run artifacts and promotion decisions are reproducible and auditable end to end.

## Children

- [CODEX CLI Setup](./sub_codex_cli.md) (`sub_codex_cli`)
- [Cross-Site Experimentation](./sub_cross_site_exp.md) (`sub_cross_site_exp`)

## Linked Product Tasks (data/tasks.json)

- None linked in product ground-truth tasks.

## Linked User Tasks (user/tasks.md)

- Current `src_user_tasks` CSV mirror does not include canonical entity IDs, so deterministic per-entity user-task linkage is unavailable.
- See [src_user_tasks](../sources/src_user_tasks.md) for the latest full task snapshot and derived rollups.

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
