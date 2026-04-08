---
id: "sub_meteomatics"
record_type: "entity"
entity_type: "subcategory"
health: "green"
product_id: "prd_pzero"
category_id: "cat_tooling"
parent_id: "cat_tooling"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# MeteoMatics Downloader

- ID: `sub_meteomatics`
- Type: `subcategory`
- Health: `green`

## Current State
Meteomatics Extractor is operational as the weather-input preparation tool. It allows in-app editing of YAML extraction settings (project, history range, resolution, timezone, models, features), supports both polygon and single-point extraction modes, authenticates via MM_USERNAME/MM_PASSWORD, chunks API requests by feature groups and date window limits, writes one CSV per weather model to data/{project}_{model}_meteo_data.csv, and can skip or overwrite existing outputs. It also loads generated files for normalized multi-model time-series plotting inside the UI.

## Target State
Maintain reliability and standards alignment.

## Parent
- [[entities/cat_tooling|Tooling Ecosystem]]

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
Tooling Ecosystem

### current_problem
Needs standards alignment.

### description
Streamlit weather extraction utility for Meteomatics-driven model inputs. It manages extraction configuration, geospatial selection, batched API retrieval, deterministic CSV output naming, and quick visual verification of generated weather time series before downstream training or analysis.

### impact
Data input quality dependency.

### importance
High

### product
P-Zerø

### subcategory
MeteoMatics Downloader

### target
Stable standardized ingestion tooling.
