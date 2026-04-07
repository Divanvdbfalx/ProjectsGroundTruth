# Concept: Experiment Governance

## Definition

Experiment governance is the set of process controls that keep model comparisons reproducible, comparable, and promotion-safe across time and sites.

## Why It Matters

- Weak governance can produce unstable winner selection and false confidence.
- Governance quality affects technical and business decisions downstream.

## Evidence Across Sources

- `cat_experiment` context highlights split architecture and runner gaps.
- Relationship graph ties technical traceability to performance and business value.
- User task board prioritizes data import and evaluation protocol setup before scaling.

## Linked Entities

- [P-Zerø](../entities/prd_pzero.md)
- [Experimentation & Development](../entities/cat_experiment.md)
- [CODEX CLI Setup](../entities/sub_codex_cli.md)
- [Cross-Site Experimentation](../entities/sub_cross_site_exp.md)

## Open Questions

- When should test split become a hard gate in model-selection decisions?
- Which governance checks are mandatory for each experiment run?
