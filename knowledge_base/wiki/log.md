# Wiki Log

Append-only operation timeline.

## [2026-04-07] setup | Initialize Persistent Wiki Structure

Type: setup  
Summary: Scaffolded raw/wiki/schema layers and templates for incremental LLM-maintained knowledge workflows.  
Files Touched:
- `knowledge_base/raw/*`
- `knowledge_base/wiki/*`
- `knowledge_base/schema/*`

## [2026-04-07] ingest | Populate Wiki From Existing data/ and user/ Context

Type: ingest  
Summary: Added source manifests, source summaries, synthesized entity/concept pages, and a repo context analysis from current canonical graph and user workspace files.  
Files Touched:
- `knowledge_base/raw/manifests/src_data_*.md`
- `knowledge_base/raw/manifests/src_user_*.md`
- `knowledge_base/wiki/sources/src_*.md`
- `knowledge_base/wiki/entities/*.md`
- `knowledge_base/wiki/concepts/*.md`
- `knowledge_base/wiki/analyses/2026-04-07_repo_context_snapshot.md`
- `knowledge_base/wiki/index.md`
- `knowledge_base/wiki/overview.md`

## [2026-04-07] ingest | Populate knowledge base comprehensively from data/ and user/

Type: ingest  
Summary: Generated canonical entity pages for all nodes, captured all data/user sources, and refreshed wiki index/overview for full-repo context coverage.  
Files Touched:
- `knowledge_base/raw/sources/*`
- `knowledge_base/raw/manifests/src_*.md`
- `knowledge_base/wiki/sources/src_*.md`
- `knowledge_base/wiki/entities/*.md`
- `knowledge_base/wiki/index.md`
- `knowledge_base/wiki/overview.md`

## [2026-04-07] update | Journal Follow-Up and Blocked EDF State

Type: update  
Summary: Added a timestamped journal entry capturing email follow-up to David McDougal, updated data requests for Phez/Coleskop, and explicit EDF blocked status pending response/data.  
Files Touched:
- `user/journal.md`
- `knowledge_base/raw/sources/src_user_journal.md`
- `knowledge_base/wiki/sources/src_user_journal.md`

## [2026-04-07] archive | Transfer data/user into KB sources and archive originals

Type: archive  
Summary: Synced all `data/` and `user/` files into `knowledge_base/raw/sources/`, moved original directories to `archive/2026-04-07/`, and left symlinks at `data` and `user` for compatibility.  
Files Touched:
- `knowledge_base/raw/sources/src_data_*.json`
- `knowledge_base/raw/sources/src_user_*.md`
- `archive/2026-04-07/data/*`
- `archive/2026-04-07/user/*`
- `data` (symlink)
- `user` (symlink)

## [2026-04-08] update | Add ClickUp task interpretation snapshot to user task KB source

Type: update  
Summary: Added a user-context task snapshot derived from ClickUp screenshots with normalized statuses (`OPEN`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `COMPLETED`) and dependency notes. No journal files were modified.  
Files Touched:
- `knowledge_base/raw/sources/src_user_tasks.md`
- `knowledge_base/wiki/sources/src_user_tasks.md`

## [2026-04-08] ingest | Replace user task source with full ClickUp CSV mirror and JSON companion

Type: ingest  
Summary: Replaced `src_user_tasks.md` with CSV-aligned columns/rows from the ClickUp export and added `src_user_tasks.json` as a structured companion. Updated parser compatibility in `node_app/server.js` and refreshed task-source manifest/summary metadata.  
Files Touched:
- `knowledge_base/raw/sources/src_user_tasks.md`
- `knowledge_base/raw/sources/src_user_tasks.json`
- `knowledge_base/raw/manifests/src_user_tasks.md`
- `knowledge_base/wiki/sources/src_user_tasks.md`
- `node_app/server.js`

## [2026-04-08] ingest | Propagate refreshed ClickUp task source across wiki synthesis

Type: ingest  
Summary: Propagated the latest `src_user_tasks` CSV mirror (`2026-04-08T14_05_57.516Z`) through wiki synthesis layers by updating source summaries, overview metrics, sprint concept coverage, and entity task-link sections that previously referenced legacy `usr_task_*` IDs.  
Files Touched:
- `knowledge_base/raw/manifests/src_user_tasks.md`
- `knowledge_base/wiki/sources/src_user_tasks.md`
- `knowledge_base/wiki/sources/src_user_current_context.md`
- `knowledge_base/wiki/overview.md`
- `knowledge_base/wiki/index.md`
- `knowledge_base/wiki/analyses/2026-04-07_repo_context_snapshot.md`
- `knowledge_base/wiki/concepts/user_workspace_tracking.md`
- `knowledge_base/wiki/concepts/sprint_status_2026_04_07.md`
- `knowledge_base/wiki/concepts/sprint_status_2026_04_08.md`
- `knowledge_base/wiki/entities/cat_business.md`
- `knowledge_base/wiki/entities/cat_experiment.md`
- `knowledge_base/wiki/entities/sub_codex_cli.md`
- `knowledge_base/wiki/entities/sub_cross_site_exp.md`
- `knowledge_base/wiki/entities/sub_customers.md`
- `knowledge_base/wiki/entities/sub_eval_tool.md`
- `knowledge_base/wiki/entities/sub_ground_truth.md`
- `knowledge_base/wiki/entities/sub_historical_perf.md`

## [2026-04-08] update | Add derived Archived task category to user task sources

Type: update  
Summary: Added derived `Task Category` to `src_user_tasks` (`Archived` for rows with 100% auto progress, otherwise `Active`) and updated parser compatibility so the category is available downstream while keeping canonical task source in the same files.  
Files Touched:
- `knowledge_base/raw/sources/src_user_tasks.md`
- `knowledge_base/raw/sources/src_user_tasks.json`
- `node_app/server.js`
- `knowledge_base/raw/manifests/src_user_tasks.md`
- `knowledge_base/wiki/sources/src_user_tasks.md`

## [2026-04-08] update | Move completed tasks into archived category block

Type: update  
Summary: Re-applied completion classification and reordered task rows so all currently completed tasks are categorized as `Archived` and moved below `Active` tasks in both markdown and JSON sources.  
Files Touched:
- `knowledge_base/raw/sources/src_user_tasks.md`
- `knowledge_base/raw/sources/src_user_tasks.json`
