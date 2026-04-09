---
id: "task_payment_2"
record_type: "task"
entity_id: "sub_payment"
status: "todo"
priority: "high"
source_json: "knowledge_base/raw/sources/src_data_tasks.json"
---
# Add monthly reconciliation workflow

- ID: `task_payment_2`
- Status: `todo`
- Priority: `high`
- Linked Entity: [[entities/sub_payment|Payment System]]

## Description
Track invoices, payments, and exceptions with status.

## Full Context
### category
Business Layer

### expected_impact
Lower leakage and better financial visibility.

### problem
No standard reconciliation loop.

### product
P-Zerø

### solution
Operational finance workflow.

### subcategory
Payment System
