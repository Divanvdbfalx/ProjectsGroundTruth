# Product Ground Truth (Obsidian Mirror)

This folder is generated from canonical JSON ground truth and is safe to open as an Obsidian vault.

## Canonical JSON Sources
- `knowledge_base/raw/sources/src_data_entities.json`
- `knowledge_base/raw/sources/src_data_relationships.json`
- `knowledge_base/raw/sources/src_data_tasks.json`

## Regeneration Command
```bash
python local_tool/query.py export-md
```

Do not treat these generated markdown files as canonical runtime input for the editor/frontend.

## Counts
- Entities: 38
- Relationships: 6
- Tasks: 16

## Root Product
- [[entities/prd_pzero|P-Zerø]]

## Entity Notes
- [[entities/prd_pzero|P-Zerø]]
- [[entities/cat_business|Business Layer]]
- [[entities/cat_data|Data Management]]
- [[entities/cat_docs|Documentation & Knowledge]]
- [[entities/cat_experiment|Experimentation & Development]]
- [[entities/cat_infra|Infrastructure & Deployment]]
- [[entities/cat_modeling|Modeling & Training]]
- [[entities/cat_monitoring|Monitoring & Observability]]
- [[entities/cat_performance|Performance & Evaluation]]
- [[entities/cat_tooling|Tooling Ecosystem]]
- [[entities/sub_aws_lambda|AWS Lambda Deployment]]
- [[entities/sub_active_monitoring|Active Monitoring]]
- [[entities/sub_alerts_anomaly|Alerts & Anomaly Detection]]
- [[entities/sub_codex_cli|CODEX CLI Setup]]
- [[entities/sub_contracts_slas|Contracts / SLAs]]
- [[entities/sub_cross_site_exp|Cross-Site Experimentation]]
- [[entities/sub_customers|Customers]]
- [[entities/sub_data_versioning|Data Versioning]]
- [[entities/sub_datalake_tools|Datalake Tools]]
- [[entities/sub_sam_repo|Deployment Repository (AWS SAM)]]
- [[entities/sub_documentation|Documentation]]
- [[entities/sub_eval_tool|Evaluation Tool]]
- [[entities/sub_feature_engineering|Feature Engineering]]
- [[entities/sub_ground_truth|Ground Truth Integration]]
- [[entities/sub_historical_perf|Historical Performance Tracking]]
- [[entities/sub_inference_datalake|Inference Datalake]]
- [[entities/sub_legacy_metalearner|Legacy Metalearner (XGBoost/LightGBM)]]
- [[entities/sub_meteomatics|MeteoMatics Downloader]]
- [[entities/sub_model_versioning|Model Versioning]]
- [[entities/sub_monitoring_dashboards|Monitoring Dashboards]]
- [[entities/sub_payment|Payment System]]
- [[entities/sub_pricing|Pricing System]]
- [[entities/sub_proposals|Proposals]]
- [[entities/sub_shapely_inspector|Shapely Inspector]]
- [[entities/sub_visibility_map|System Visibility / Product Map]]
- [[entities/sub_tool_standardization|Tool Standardization]]
- [[entities/sub_training_storage|Training Data Storage]]
- [[entities/sub_weather_benchmark|Weather Data Benchmarking]]

## Task Notes
- [[tasks/task_active_monitoring_1|Assign monitoring ownership rota]]
- [[tasks/task_data_versioning_2|Attach dataset version to training runs]]
- [[tasks/task_historical_perf_1|Backfill historical performance store]]
- [[tasks/task_model_versioning_1|Create model registry spec]]
- [[tasks/task_cross_site_exp_1|Define cross-site metric pack]]
- [[tasks/task_pricing_1|Define tiered pricing model]]
- [[tasks/task_data_versioning_1|Enforce immutable dataset snapshots]]
- [[tasks/task_payment_1|Select billing/payment stack]]
- [[tasks/task_alerts_anomaly_1|Set baseline anomaly thresholds]]
- [[tasks/task_payment_2|Add monthly reconciliation workflow]]
- [[tasks/task_active_monitoring_2|Automate daily health digest]]
- [[tasks/task_cross_site_exp_2|Build site abstraction layer]]
- [[tasks/task_historical_perf_2|Create trend dashboards]]
- [[tasks/task_model_versioning_2|Gate deploys on model registry entry]]
- [[tasks/task_alerts_anomaly_2|Implement routing + acknowledgements]]
- [[tasks/task_pricing_2|Link pricing to measured value]]

## Relationship Notes
- [[relationships/rel_business_depends_on_performance|rel_business_depends_on_performance (depends_on)]]
- [[relationships/rel_data_versioning_blocks_model_versioning|rel_data_versioning_blocks_model_versioning (blocks)]]
- [[relationships/rel_datalake_tools_enables_inference_datalake|rel_datalake_tools_enables_inference_datalake (enables)]]
- [[relationships/rel_model_versioning_enables_perf_tracking|rel_model_versioning_enables_perf_tracking (enables)]]
- [[relationships/rel_monitoring_enables_perf_awareness|rel_monitoring_enables_perf_awareness (enables)]]
- [[relationships/rel_perf_tracking_enables_business_value|rel_perf_tracking_enables_business_value (enables)]]
