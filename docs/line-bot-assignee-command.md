# LINE Bot Assignee Command Specification

## 1. Current State

- `/api/tasks` supports additive assignee fields:
  - `assigneeId`
  - `assigneeName`
  - `assigneeSourceKey`
- The frontend create and edit task flows already send additive assignee fields.
- The legacy `assignee` field is still retained.
- LINE Bot assignee text-command first version is implemented.
- LINE Bot task lists can display task assignees.
- Bot-created tasks currently do not write the new assignee fields.
- A formal `members` collection has not been created yet.
- `GET /api/members` will usually return an empty array at this stage.
- The implemented LINE Bot assignee flow does not perform member lookup.

## 2. Current Implementation Status

- 11D-5A: Command specification document is complete.
- 11D-5B: LINE Bot task list assignee display is complete.
- 11D-5C: Minimal LINE Bot `指派 任務編號 負責人` command is complete.
- 11D-5D: Formal member lookup, `members` collection integration, and group/room member validation remain future work.

## 3. Implemented Behavior

- `listTasks(scope)` appends `@負責人` to each task line when the task has a displayable assignee.
- `getLineTaskAssigneeLabel(task)` uses this fallback order:
  - `assigneeName`
  - `assignee`
  - no label
- Empty assignee values are not displayed.
- `"Web User"` is hidden and does not render as `@Web User`.
- `assignTask(idText, assigneeText, scope)` assigns a task within the current `scope.sourceKey`.
- The Firestore query for assignment includes:
  - `sourceKey`
  - `lineTaskNo`
  - `deletedAt == null`
- Assignment does not cross scopes.
- Assignment does not perform member lookup.
- `getHelpText()` includes `指派 任務編號 負責人`.

Implemented task list format:

```txt
#1 買牛奶（今日到期） @小語
#2 修 bug（已逾期） @RINKA
#3 整理資料（無截止日期）
```

## 4. Design Goals

- Allow LINE Bot to display task assignees without requiring a formal member system.
- Allow LINE Bot to assign tasks by text.
- The first version saves only the text name entered by the user.
- Do not pretend that a formal member system is complete.
- Do not write free-form names into `assigneeSourceKey`.
- Do not perform group or room member lookup.
- Do not affect existing add, complete, or delete task commands.

## 5. Command Format

Implemented first version:

```txt
指派 任務編號 負責人
```

Examples:

```txt
指派 3 小語
指派 5 RINKA
```

First-version limits:

- Multiple assignees are not supported.
- Fuzzy name matching is not supported.
- Formal member id lookup is not supported.
- The optional alias `負責人` can be considered later, but is not included in the first version.

## 6. Parsing Rules

- Match text that starts with `指派 `.
- Remove the `指派 ` prefix.
- Split the remaining text by the first whitespace into:
  - `idText`
  - `assigneeText`
- Parse `idText` with the existing `parseTaskId`.
- `assigneeText.trim()` must be non-empty.
- Save `assigneeText` as free-form text.

## 7. Error Reply Specification

Invalid task id:

```txt
請輸入有效的任務編號。

範例：
指派 1 小語
```

Empty assignee:

```txt
請輸入負責人名稱。

範例：
指派 1 小語
```

Task not found:

```txt
找不到任務 #1。

請輸入「任務」查看目前未完成任務。
```

Success:

```txt
已指派任務 #1 給 小語
買牛奶
```

## 8. Firestore Update Rules

The implemented first version does not perform member lookup. It saves only text.

Update payload:

```js
{
  assignee: assigneeName,
  assigneeName,
  assigneeId: null,
  assigneeSourceKey: null,
  updatedAt: FieldValue.serverTimestamp()
}
```

Rules:

- `assignee = assigneeName`
- `assigneeId = null`
- `assigneeSourceKey = null`
- Do not write free-form text into `assigneeSourceKey`.
- Do not treat a display name as a formal member id.

## 9. Task List Assignee Display

```txt
#1 買牛奶（今日到期） @小語
```

If the task has no assignee:

- The first version should not display `@未指派`.
- This keeps LINE task lists less noisy.

Implemented helper:

```js
getLineTaskAssigneeLabel(task)
```

Rules:

- Prefer `task.assigneeName`.
- Fall back to legacy `task.assignee`.
- If the result is an empty string, do not display a label.
- If the result is `"Web User"`, do not display a label.

## 10. Why Member Lookup Is Not Included Yet

Member lookup is intentionally excluded from the implemented first version.

Reasons:

- The `members` collection has not been created yet.
- `GET /api/members` may currently return an empty array.
- Group and room member scopes have not been designed yet.
- LINE display names may be duplicated.
- User-entered names may contain typos.
- Saving text-only assignees is the safest first step.

## 11. Phased Rollout

### 11D-5A: Command Specification Document - Complete

- Add `docs/line-bot-assignee-command.md`.
- Do not modify runtime code.

### 11D-5B: Bot Task List Shows Assignee - Complete

- Modify only `server.js` `listTasks` display.
- Do not add new commands.
- Display fallback is `assigneeName -> assignee -> no label`.
- Hide `"Web User"`.

### 11D-5C: Minimal Bot Assign Command - Complete

- Add `assignTask`.
- Update `handleTextCommand` to support `指派`.
- Save only free-form text.
- Do not perform member lookup.

### 11D-5D: Formal Member Lookup - Future Work

- Wait until the `members` collection and group members are stable.
- Add member lookup only after scope and ambiguity rules are defined.
- Add group/room member validation only after group/room LIFF and membership rules are designed.

## 12. Non-Goals

The implemented first version still does not do any of the following:

- Perform formal member lookup.
- Query a formal `members` collection.
- Validate group or room membership.
- Support multiple assignees.
- Support fuzzy name matching.
- Support unassigning a task.
- Support the `負責人` alias command.
- Upgrade subtask assignee schema.
- Modify `/api/tasks`.
- Modify `/api/members`.
- Modify Firestore schema.
- Create a `members` collection.
- Perform Firestore migration.
- Modify the frontend.

## 13. Risks

- Users may type assignee names incorrectly.
- Names may be duplicated.
- The assignee may not be a member of the group.
- Hiding `@Web User` reduces noise, but tasks created through web fallback may appear unassigned in LINE lists.
- Future formal member lookup must keep text assignee compatibility.
