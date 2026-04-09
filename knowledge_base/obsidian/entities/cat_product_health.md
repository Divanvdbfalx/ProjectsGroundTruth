---
id: "cat_product_health"
record_type: "entity"
entity_type: "category"
health: "yellow"
product_id: "prd_pzero"
category_id: "cat_product_health"
parent_id: "prd_pzero"
source_json: "knowledge_base/raw/sources/src_data_entities.json"
---
# Product Health Application

- ID: `cat_product_health`
- Type: `category`
- Health: `yellow`

## Current State
Product Health capability is active but currently grouped under documentation-driven visibility workflows.

## Target State
Dedicated product-health capability area with clear ownership of integrations, workflows, and operational status intelligence.

## Parent
- [[entities/prd_pzero|P-Zerø]]

## Children
- [[entities/sub_ph_integrations|Integrations]]
- [[entities/sub_ph_knowledge|Knowledge & Mapping]]
- [[entities/sub_ph_platform|Platform]]
- [[entities/sub_product_health_app|Product Health Core]]
- [[entities/sub_ph_validation|Validation]]

## Linked Tasks
- None

## Outgoing Relationships
- None

## Incoming Relationships
- None

## Full Context
### category
Product Health Application

### current_problem
Tasks and context were mixed into Documentation & Knowledge, reducing clarity of ownership and prioritization.

### description
Operational category for the Product Health application, including integration surfaces (e.g., GitHub), status telemetry, and execution workflows that power health-oriented product operations.

### impact
Lower traceability for delivery planning and operational execution of product-health features.

### importance
High

### product
P-Zerø

### target
Dedicated category with isolated nodes/tasks for Product Health execution.
