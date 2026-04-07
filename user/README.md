# User Workspace Journal

This folder is user-first tracking for P-Zerø.

It is intended to be edited directly by a person in plain text/Markdown, without using the mindmap application UI.

## Files

- `current_context.md`: current-day working state (`Context Date` + `Context Version`).
- `tasks.md`: persistent multi-day task register with date lifecycle fields.
- `journal.md`: append-only historical work log with dated/versioned entries.

## Usage Pattern

1. Update `current_context.md` at the start/end of sessions for the current day only.
2. Keep `tasks.md` current as statuses and estimates change across days.
3. Append a dated entry in `journal.md` after meaningful work or decisions.
4. On a new day, roll context forward: journal a short carry-over note, reset `current_context.md` to the new `Context Date`, and continue.

## Date-Based Versioning Rules

1. `journal.md` is append-only history. Avoid rewriting old entries.
2. `current_context.md` is current-day only. It must include `Context Date` and `Context Version`.
3. `tasks.md` is cross-day and persistent. Every task should track `Created (Date)`, `Updated (Date)`, and `Completed (Date)` when done.
4. Always update `Last Updated` timestamps when editing files.

## Linked Entity Rules

1. `Linked Entity` must use a real ID from `data/entities.json` (category or subcategory node), not free-text names.
2. For new epics, propose the best-fit entity placement and confirm with the user before finalizing if ambiguous.
3. If an existing task uses a non-node linked entity, remap it to the closest valid node ID.

## Notes

- Use explicit timestamps (for example `2026-04-07 10:10 SAST`).
- Keep task IDs stable to make history easy to trace.
- Use ISO dates (`YYYY-MM-DD`) for task lifecycle columns.

## Prompt Templates

Use these copy/paste prompts with Codex to keep entries consistent.

### 1) Add a New Epic + First Task + Current Context

```text
Update the user workspace files for a new epic I am starting.

Epic name: <epic_name>
Task title: <task_title>
Ground-truth task: <ground_truth_task>
Priority: <high|medium|low>
Estimated hours: <number>
Owner: <owner>
Notes: <notes>

Please:
1. Add this as the first row in user/tasks.md with a stable task ID and status in_progress.
2. Set task lifecycle dates: Created=today, Updated=today, Completed=blank.
3. Update user/current_context.md so this becomes the active focus (What I Am Busy With Now, Session Goal, Current Focus Links, Next Action, Notes).
4. Set `Context Date` to today and increment/reset `Context Version` appropriately.
5. Update Last Updated timestamps using current SAST time.
6. Keep existing structure/formatting of the files intact.
```

### 2) Add a New Task Under an Existing Epic

```text
Add a new task in user/tasks.md under an existing epic/context.

Linked Entity: <linked_entity_id>
Task title: <task_title>
Ground-truth task: <ground_truth_task>
Priority: <high|medium|low>
Estimated hours: <number>
Owner: <owner>
Status: <todo|in_progress|blocked|done>
Notes: <notes>

Please:
1. Insert the task as the first row in the tasks table.
2. Generate a stable task ID following existing naming style.
3. Set lifecycle dates correctly (Created=today, Updated=today, Completed=blank unless done).
4. Update Last Updated timestamp.
5. If status is in_progress, also sync user/current_context.md links and focus text.
```

### 3) Journal Update (Start of Work)

```text
Append a new entry to user/journal.md for the start of a work session.

Entry ID: <jrnl_YYYYMMDD_XX>
Date/Time: <YYYY-MM-DD HH:MM SAST or "now">
Context Date: <YYYY-MM-DD>
Context Version: <YYYY-MM-DD.N>
Summary: <short summary>
Focus: <focus>
Task Updates: <task IDs and status updates>
Time Spent (h): 0.0
Blockers: <none or blockers>
Next Action: <next action>

Please keep the journal template format exactly and append consistently with existing ordering.
```

### 4) Journal Update (End of Work / Checkpoint)

```text
Append a checkpoint entry to user/journal.md for end-of-day or end-of-session.

Entry ID: <jrnl_YYYYMMDD_XX>
Date/Time: <YYYY-MM-DD HH:MM SAST or "now">
Context Date: <YYYY-MM-DD>
Context Version: <YYYY-MM-DD.N>
Summary: <what was completed>
Focus: <what you worked on>
Task Updates: <task IDs, status changes, estimate/actual changes>
Time Spent (h): <hours spent this session>
Blockers: <none or blockers>
Next Action: <first next step>

Please:
1. Append the entry using the existing journal template.
2. If task statuses changed, also update user/tasks.md.
3. If active focus changed, update user/current_context.md.
```

### 5) New Day Context Rollover

```text
Roll the user workspace to a new day.

New Context Date: <YYYY-MM-DD>
Carry-over summary: <one short line>

Please:
1. Append a short rollover entry to user/journal.md capturing yesterday's carry-over.
2. Reset user/current_context.md for the new date with Context Date=<new date> and Context Version=<new date>.1.
3. Keep unfinished tasks in user/tasks.md unchanged, but update Updated (Date) only for tasks touched during rollover.
4. Update all Last Updated timestamps with current SAST time.
```
