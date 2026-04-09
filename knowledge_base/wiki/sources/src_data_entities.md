# Source Summary: src_data_entities

## Metadata

- Title: Product Graph Entities
- Date Added: 2026-04-07
- Origin: local repository
- File: `data/entities.json`

## Summary

`data/entities.json` defines the canonical node layer for the P-Zerø map: 38 entities (1 product, 9 categories, 28 subcategories) with health signals, current/target states, and narrative context.

## Key Claims

1. P-Zerø is operational end-to-end but has lifecycle-governance gaps.
2. Experimentation & Development is a critical weak area with active modernization underway.
3. Monitoring/performance/business layers are tightly coupled by dependency chain.

## Extracted Facts

1. Entity totals: 38 (`product=1`, `category=9`, `subcategory=28`).
2. `cat_experiment` now encodes temporal-CV and runner-governance gaps.
3. `sub_codex_cli` and `sub_cross_site_exp` include explicit experimentation-platform context.

## Contradictions / Tensions

- None explicit in-file, but several category targets imply unfinished operational maturity versus current_state confidence in selected sub-systems.

## Wiki Pages Updated

- [Overview](../overview.md)
- [P-Zerø](../entities/prd_pzero.md)
- [Experimentation & Development](../entities/cat_experiment.md)
- [Cross-Site Experimentation](../entities/sub_cross_site_exp.md)
- [Experiment Governance](../concepts/experiment_governance.md)
