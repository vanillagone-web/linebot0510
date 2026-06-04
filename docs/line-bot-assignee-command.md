# LINE Bot Assignee Command Specification

## 1. Current State

- `/api/tasks` supports additive assignee fields:
  - `assigneeId`
  - `assigneeName`
  - `assigneeSourceKey`
- The frontend create and edit task flows already send additive assignee fields.
- The legacy `assignee` field is still retained.
- LINE Bot currently does not support assignee commands.
- Bot-created tasks currently do not write the new assignee fields.
- Bot task lists currently do not display task assignees.
- A formal `members` collection has not been created yet.
- `GET /api/members` will usually return an empty array at this stage.
- This stage does not perform member lookup.

## 2. Design Goals

- Allow LINE Bot to display task assignees in the future.
- Allow LINE Bot to assign tasks by text in the future.
- The first version should save only the text name entered by the user.
- Do not pretend that a formal member system is complete.
- Do not write free-form names into `assigneeSourceKey`.
- Do not perform group or room member lookup.
- Do not affect existing add, complete, or delete task commands.

## 3. Suggested Command Format

First version:

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
- The optional alias `負責人` can be considered later, but should not be implemented in the first version.

## 4. Parsing Rules

- Match text that starts with `指派 `.
- Remove the `指派 ` prefix.
- Split the remaining text by the first whitespace into:
  - `idText`
  - `assigneeText`
- Parse `idText` with the existing `parseTaskId`.
- `assigneeText.trim()` must be non-empty.
- Save `assigneeText` as free-form text.

## 5. Error Reply Specification

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

## 6. Firestore Update Rules

The first version does not perform member lookup. It saves only text.

Recommended update payload:

```js
{
  assignee: assigneeName,
  assigneeName,
  assigneeId: null,
  assigneeSourceKey: null,
  updatedAt
}
```

Rules:

- `assignee = assigneeName`
- `assigneeId = null`
- `assigneeSourceKey = null`
- Do not write free-form text into `assigneeSourceKey`.
- Do not treat a display name as a formal member id.

## 7. Task List Assignee Display Specification

Planned for 11D-5B.

Current format:

```txt
#1 買牛奶（今日到期）
```

Suggested format:

```txt
#1 買牛奶（今日到期） @小語
```

If the task has no assignee:

- The first version should not display `@未指派`.
- This keeps LINE task lists less noisy.

Possible helper:

```js
getLineTaskAssigneeLabel(task)
```

Rules:

- Use `task.assigneeName || task.assignee || ""`.
- If the result is an empty string, do not display a label.
- Whether to hide `Web User` should be decided before implementation.

## 8. Why Member Lookup Is Not Included Yet

Member lookup is intentionally excluded from the first version.

Reasons:

- The `members` collection has not been created yet.
- `GET /api/members` may currently return an empty array.
- Group and room member scopes have not been designed yet.
- LINE display names may be duplicated.
- User-entered names may contain typos.
- Saving text-only assignees is the safest first step.

## 9. Phased Rollout

### 11D-5A: Command Specification Document

- Add `docs/line-bot-assignee-command.md`.
- Do not modify runtime code.

### 11D-5B: Bot Task List Shows Assignee

- Modify only `server.js` `listTasks` display.
- Do not add new commands.

### 11D-5C: Minimal Bot Assign Command

- Add `assignTask`.
- Update `handleTextCommand` to support `指派`.
- Save only free-form text.

### 11D-5D: Formal Member Lookup

- Wait until the `members` collection and group members are stable.
- Add member lookup only after scope and ambiguity rules are defined.

## 10. Non-Goals

This stage does not do any of the following:

- Modify `server.js`.
- Modify LINE Bot commands.
- Modify `/api/tasks`.
- Modify `/api/members`.
- Modify Firestore schema.
- Create a `members` collection.
- Perform member lookup.
- Implement group or room members.
- Modify the frontend.
- Deploy.

## 11. Risks

- Users may type assignee names incorrectly.
- Names may be duplicated.
- The assignee may not be a member of the group.
- Showing `@Web User` may add noise to LINE task lists.
- Future formal member lookup must keep text assignee compatibility.

