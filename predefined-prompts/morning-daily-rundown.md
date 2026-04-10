# Predefined Prompt: Morning Daily Rundown

## Goal
Provide a concise morning brief with:
1. What was completed yesterday.
2. What remains active/open.
3. A clear outlook and plan for today.

## Human Confirmation Rule (Mandatory)
- Present this morning brief as a draft first.
- Do not edit any files unless the user explicitly asks and confirms.

## Required Guardrails
- Treat product graph files as read-only unless explicitly asked to update them:
  - `knowledge_base/raw/sources/src_data_entities.json`
  - `knowledge_base/raw/sources/src_data_relationships.json`
- For journal/task context, use:
  - `knowledge_base/raw/sources/src_user_journal.md`
  - `knowledge_base/raw/sources/src_tasks.json`
- If proposing task or journal updates, request explicit confirmation before any edits.

## Inputs
- `knowledge_base/raw/sources/src_user_journal.md`
- `knowledge_base/raw/sources/src_tasks.json`
- Optional context snapshot:
  - `artifacts/current_task_state_snapshot.json` (if available)

## Instructions
1. Determine dates explicitly:
   - `Yesterday` = previous calendar day in local timezone.
   - `Today` = current calendar day in local timezone.
2. From journal + tasks, summarize yesterday’s concrete progress:
   - completed items
   - status changes
   - major decisions or blockers introduced/resolved
3. Build today’s outlook from current task state:
   - highest-priority tasks
   - in-progress carryover
   - likely blockers/dependencies
4. Recommend a realistic top-3 plan for today.
5. Include a short “risks/watchouts” section.
6. Output the brief only; do not modify files.

## Output Format
- `Date`
- `Yesterday Rundown`
- `Current State`
- `Today Outlook`
- `Top 3 Priorities Today`
- `Risks / Watchouts`
- `Suggested First Action (next 30 minutes)`

## Quality Bar
- Be specific, not generic.
- Use task names by default.
- Do not include task IDs unless the user explicitly asks for them.
- Prefer short, actionable bullets.
- If information is missing or ambiguous, state assumptions clearly.
