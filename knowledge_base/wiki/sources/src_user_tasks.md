# Source Summary: src_user_tasks

## Metadata

- Title: User Task Register (ClickUp CSV Mirror)
- Date Added: 2026-04-07
- Origin: ClickUp CSV export
- Files:
  - `knowledge_base/raw/sources/src_user_tasks.md`
  - `knowledge_base/raw/sources/src_user_tasks.json`

## Summary

The user task source mirrors the latest ClickUp CSV export directly, preserving source columns and row values in both markdown and JSON formats, and adds a derived `Task Category` field to distinguish active vs archived work.

## Key Claims

1. Source shape includes 15 CSV columns plus 1 derived column: `Task Category`.
2. Current snapshot contains 111 task rows: 22 `Epic`, 88 `User Story`, and 1 `Bug`.
3. Derived progress rollup from `📚 Progress (Auto)` is: `done=81`, `in_progress=8`, `todo=22`, with `Task Category` split `Archived=81`, `Active=30`.

## Extracted Facts

1. Markdown now contains a single CSV-aligned table under `# User Tasks`.
2. JSON companion includes `columns`, `rows`, and `task_categories` metadata.
3. The source CSV is `2026-04-08T14_05_57.516Z FALX - Product Development - P ZERO.csv`.

## Contradictions / Tensions

- Legacy KB-specific status fields (`todo`, `in_progress`, `blocked`, `done`) are not explicit in the source and must be derived from ClickUp fields (for example progress).
- CSV rows do not carry canonical `entity_id` mappings, so deterministic per-entity linkage is unavailable without an additional mapping layer.

## Wiki Pages Updated

- [src_user_tasks](./src_user_tasks.md)
- [Overview](../overview.md)
- [sprint status 2026 04 08](../concepts/sprint_status_2026_04_08.md)
- [user workspace tracking](../concepts/user_workspace_tracking.md)
