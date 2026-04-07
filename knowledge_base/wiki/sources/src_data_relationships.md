# Source Summary: src_data_relationships

## Metadata

- Title: Product Graph Relationships
- Date Added: 2026-04-07
- Origin: local repository
- File: `data/relationships.json`

## Summary

`data/relationships.json` defines critical dependency and enablement links that explain why data governance, model versioning, monitoring, and performance are treated as coupled systems.

## Key Claims

1. Data versioning blocks trustworthy model versioning.
2. Model versioning enables historical performance tracking.
3. Performance intelligence is required to support business outcomes.

## Extracted Facts

1. Total relationships: 6.
2. Relationship types include `blocks`, `enables`, and `depends_on`.
3. Relationship context includes explicit reason and impact metadata.

## Contradictions / Tensions

- None explicit; dependency chain is consistent with entity and task narratives.

## Wiki Pages Updated

- [Overview](../overview.md)
- [P-Zerø](../entities/prd_pzero.md)
- [Business Layer](../entities/cat_business.md)
- [Experiment Governance](../concepts/experiment_governance.md)
