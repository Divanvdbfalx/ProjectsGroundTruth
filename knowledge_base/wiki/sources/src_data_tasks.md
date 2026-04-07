# Source Summary: src_data_tasks

## Metadata

- Title: Product Ground-Truth Tasks
- Date Added: 2026-04-07
- Origin: local repository
- File: `data/tasks.json`

## Summary

`data/tasks.json` stores structured product tasks linked to entity IDs and grouped across data, modeling, experimentation, monitoring, performance, and business workstreams.

## Key Claims

1. The JSON task layer focuses on roadmap-level product execution, not user daily planning.
2. Most tasks are high/critical priority and currently `todo`.
3. Cross-site experimentation and performance tracking remain central strategic themes.

## Extracted Facts

1. Total tasks: 16.
2. Task statuses are predominantly `todo`.
3. Task descriptions include problem/solution/impact triads in `full_context`.

## Contradictions / Tensions

- User workspace tasks (`user/tasks.md`) include blocked EDF operational follow-ups that do not appear in product ground-truth JSON tasks.

## Wiki Pages Updated

- [Overview](../overview.md)
- [Cross-Site Experimentation](../entities/sub_cross_site_exp.md)
- [Business Layer](../entities/cat_business.md)
- [Sprint Status (2026-04-07)](../concepts/sprint_status_2026_04_07.md)
