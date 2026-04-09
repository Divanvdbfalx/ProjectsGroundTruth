# Concept: Sprint Status (2026-04-08)

## Definition

Snapshot of active execution state derived from the latest ClickUp CSV task export mirrored into `src_user_tasks`.

## Why It Matters

- Provides an up-to-date operational picture after replacing legacy normalized task rows with full-source CSV mirror.
- Establishes a consistent rollup method (`📚 Progress (Auto)`) while explicit KB status fields are absent in source.

## Evidence Across Sources

- User task board now includes 111 rows (`Epic`=22, `User Story`=88, `Bug`=1).
- Derived status rollup from auto-progress is `done=81`, `in_progress=8`, `todo=22`.
- Partial-progress streams include training pipeline, deployment/platform pipeline rebuild, NTCSA delivery, forecast evaluation, and product health.

## Linked Entities

- [Experimentation & Development](../entities/cat_experiment.md)
- [Infrastructure & Deployment](../entities/cat_infra.md)
- [Performance & Evaluation](../entities/cat_performance.md)

## Open Questions

- Should status derivation continue to use only auto-progress, or should explicit status fields be ingested from ClickUp?
- What mapping source should link ClickUp task rows to canonical entity IDs for deterministic per-entity task sections?
