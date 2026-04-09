---
id: "cat_experiment"
record_type: "entity"
entity_type: "category"
health: "red"
product_id: "prd_pzero"
category_id: "cat_experiment"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Experimentation & Development

- ID: `cat_experiment`
- Type: `category`
- Health: `red`

## Current State
Experimentation now has an active temporal-CV harness for site eims_castle (mix vs ncep-gfs), but architecture is split between the new experiments runner and a legacy production-style pipeline. The benchmarking path is reproducible but still incomplete: train+valid drives selection while test is not integrated into runner decisions, some config keys are not consumed, and fold semantics differ between holdout and CV artifacts.

## Target State
Unified and documented experimentation platform with strict temporal CV, explicit test-stage promotion, consistent artifact semantics, and repeatable cross-site model evaluation.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_codex_cli|CODEX CLI Setup]]
- [[entities/sub_cross_site_exp|Cross-Site Experimentation]]

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### category
Experimentation & Development

### current_problem
Parallel experiment architectures and partial runner gaps create decision friction (test split not wired into selection, config/features drift, inconsistent fold-definition semantics, and environment setup quirks like PYTHONPATH-dependent tests).

### description
Primary experimentation system for comparing weather-source-specific models and ML baselines under time-ordered validation. Active entrypoint is run_experiments.py with experiments/ modules (temporal_cv, feature_builder, scoring, diagnostics), while pipeline.py and run_baseline_validation.py remain legacy but operationally relevant.

### impact
Model conclusions can diverge between holdout and CV regimes, slowing confident promotion decisions and reducing comparability across experiments.

### importance
Critical

### product
P-Zerø

### target
Single governed experimentation framework with standardized data contracts, consistent CV/test flow, registry-quality metadata, and extensible roadmap support (source fusion, stacking, residual diagnostics, and richer temporal features).
