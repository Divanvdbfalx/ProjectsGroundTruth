---
id: "sub_codex_cli"
record_type: "entity"
entity_type: "subcategory"
health: "red"
product_id: "prd_pzero"
category_id: "cat_experiment"
parent_id: "cat_experiment"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# CODEX CLI Setup

- ID: `sub_codex_cli`
- Type: `subcategory`
- Health: `red`

## Current State
Codex CLI experimentation flow is active around run_experiments.py and experiments/* for eims_castle. It currently runs temporal CV with expanding windows and evaluates baseline + ML models (linear regression, random forest, lightgbm, xgboost, mlp) with composite scoring. Tests are valid but depend on environment bootstrapping (PYTHONPATH=. pytest -q).

## Target State
Reliable Codex CLI workflow with stable environment setup, reproducible run contracts, and automation-friendly interfaces for model search, diagnostics, and promotion decisions.

## Parent
- [[entities/cat_experiment|Experimentation & Development]]

## Children
- None

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
CLI orchestration is useful but not yet fully standardized across data splits, config interpretation, test execution, and result-registry provenance.

### description
CLI-centric experimentation setup spanning run_experiments.py, splitter.py, pipeline.py context, and experiments modules. Runtime dependencies are containerized (pandas, numpy, scikit-learn, lightgbm, xgboost, plotly, optuna, dill), but local consistency and test invocation conventions still need hardening.

### impact
Higher operational overhead and avoidable rerun/debug cycles during model benchmarking.

### product
P-Zerø

### subcategory
CODEX CLI Setup

### target
Documented and deterministic CLI experiment lifecycle from data load through CV scoring, diagnostics, and model-selection handoff.
