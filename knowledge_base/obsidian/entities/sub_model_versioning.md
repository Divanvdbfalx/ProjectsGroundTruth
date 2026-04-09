---
id: "sub_model_versioning"
record_type: "entity"
entity_type: "subcategory"
health: "red"
product_id: "prd_pzero"
category_id: "cat_modeling"
parent_id: "cat_modeling"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Model Versioning

- ID: `sub_model_versioning`
- Type: `subcategory`
- Health: `red`

## Current State
Versioning is artifact-centric and model-family-aware but not yet a full registry. Outputs are suffixed by family (_xgb, _lgbm), stored in site-scoped artifact folders (models, plots, metrics), and uploaded to suffixed S3 paths. Pipeline binaries are exported with site+family naming conventions, environment snapshots are tracked via pip freeze artifacts, and SHAP background datasets/metadata are versioned as separate artifacts. Promotion to dev is explicit through push_to_dev.py by copying selected family artifacts to dev_uri with optional API validation, and older/ provides historical code snapshots.

## Target State
Formal model registry.

## Parent
- [[entities/cat_modeling|Modeling & Training]]

## Children
- None

## Linked Tasks
- None

## Outgoing Relationships
- [[relationships/rel_model_versioning_enables_perf_tracking|rel_model_versioning_enables_perf_tracking]]: `enables` -> [[entities/sub_historical_perf|Historical Performance Tracking]]

## Incoming Relationships
- [[relationships/rel_data_versioning_blocks_model_versioning|rel_data_versioning_blocks_model_versioning]]: [[entities/sub_data_versioning|Data Versioning]] -> `blocks`

## Full Context
### category
Modeling & Training

### current_problem
No immutable model history.

### description
Model versioning currently manages provenance through structured artifacts, suffix conventions, site-scoped storage, and controlled promotion scripts. The missing piece is a formal immutable registry that unifies model artifact identifiers with exact dataset versions, feature configuration, training metadata, and comparable performance records across releases.

### impact
Rollback/comparison risk.

### importance
Critical

### product
P-Zerø

### subcategory
Model Versioning

### target
Registry with data+metrics linkage.
