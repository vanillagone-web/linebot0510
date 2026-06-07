# Member / Assignee Model Design

## 1. Current State

The current task assignment model is intentionally simple and should be treated as a legacy-compatible first version.

- `Task.assignee` is currently a legacy string.
- Firestore `tasks` documents currently save assignment as `assignee: string`.
- When creating or editing tasks, the frontend selects a person from `MOCK_MEMBERS`, but the API payload sends `member.name`.
- `subTasks[].assigneeId` exists, but the value may be a mock member id such as `m1` or `m2`.
- There is currently no formal `members` collection.
- There is currently no formal `groups` collection.
- `GET /api/members` exists as a first read-only API, but formal `members` collection data has not been created yet.
- `DashboardView`, `SettingsView`, `StatsView`, `TaskListView`, and `TaskExecutionView` still have mock member dependencies.
- LINE Bot task lists can display assignee labels.
- LINE Bot supports the minimal `指派 任務編號 負責人` text command.
- LINE Bot assignee support is text-only and does not perform formal member lookup.

## 2. Design Goals

The member and assignee model should evolve gradually without breaking existing task data.

- Keep old task data compatible.
- Use additive-only fields for schema changes.
- Gradually introduce a formal `members` collection.
- Do not break existing LIFF personal tasks under `user_${lineUserId}`.
- Do not affect existing LINE Bot commands.
- Allow future support for group and room tasks.
- Allow future support for formal roles and permissions.
- Avoid mixing mock ids with formal ids.

## 3. Future Members Collection Design

A future `members` collection can start with a small, practical model.

Recommended fields:

```js
{
  displayName: string,
  lineUserId: string | null,
  pictureUrl: string,
  sourceKey: string | null,
  role: "ADMIN" | "MEMBER",
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

Optional future fields:

```js
{
  email?: string,
  lastSeenAt?: Timestamp,
  createdBy?: string,
  note?: string
}
```

The first version should not include:

- Complex permission matrices.
- Multi-team membership.
- Group role overrides.
- Invite tokens.
- Billing fields.
- Audit-log fields.

Those concerns should be introduced only after the personal task and basic member model are stable.

## 4. Member Id Strategy

### Option A: Firestore Auto Id

Example:

```txt
members/{autoId}
```

Pros:

- Does not expose a LINE-derived id in the document path.
- Flexible for non-LINE users.
- Works well if users can belong to multiple future workspaces.

Cons:

- Requires querying by `lineUserId` or `sourceKey`.
- Harder to debug manually.
- Less aligned with the current `user_${lineUserId}` task scope.

### Option B: `user_${lineUserId}`

Example:

```txt
members/user_Uxxxxxxxx
```

Pros:

- Matches the current LIFF and LINE Bot personal task scope.
- Easy to debug.
- Easy to join with `sourceKey`.
- Good fit for the current personal task model.

Cons:

- The document id is derived from the LINE user id.
- Future group membership will need a separate membership layer.

### Option C: `sourceKey + lineUserId`

Example:

```txt
members/group_Cxxxxxxxx_user_Uxxxxxxxx
```

Pros:

- Can represent different memberships for the same user in different scopes.
- Useful for group-specific roles.

Cons:

- Too complex for the first member model.
- Mixes personal scope and group membership before group LIFF is designed.
- Makes migration and UI fallback harder.

### First-Version Recommendation

Use:

```txt
members/{user_${lineUserId}}
```

Reasons:

- It is consistent with the current LIFF and LINE Bot personal scope.
- It is easy to debug.
- It fits the current personal task scope.
- Group membership should be left for 11E.

## 5. Task Assignee Field Upgrade Strategy

The existing legacy field must remain:

```js
assignee: string
```

Future additive fields:

```js
assigneeId: string | null,
assigneeName: string,
assigneeSourceKey: string | null
```

Recommended write rule:

```js
assignee = assigneeName
```

This keeps the legacy string field useful for old UI, search, and compatibility.

Recommended UI fallback:

```ts
assigneeName || assignee || '未指派'
```

Compatibility rules:

- Do not delete `assignee`.
- Do not force migration.
- Existing tasks must continue to render correctly.
- New fields should be additive only.
- Search should continue to include the legacy `assignee` field.

## 6. Subtask Assignee Migration Strategy

Current subtask state:

```ts
subTasks[].assigneeId?: string
```

The current `assigneeId` may be a mock member id, such as `m1` or `m2`.

Future subtask model:

```js
subTasks: [
  {
    id: string,
    title: string,
    isCompleted: boolean,
    assigneeId: string | null,
    assigneeName: string
  }
]
```

Migration and compatibility rules:

- Keep old `subTasks[].assigneeId`.
- Do not force migration in the first stage.
- Do not automatically convert mock ids to formal member ids without an explicit mapping.
- If `assigneeName` is missing, the UI may try to resolve the old `assigneeId` from the current member list.
- If the id cannot be resolved, display `未指派`.

## 7. Groups And Group Members Boundary

The 11D work should not implement a formal groups model yet.

Important boundaries:

- Do not rush a `groups` collection in 11D.
- Group LIFF support should be handled in 11E.
- Group and room scopes involve permissions, visibility, and membership.
- Personal task member data should not be mixed with group or room member data.
- Group-specific roles should not be introduced before the group task model is stable.

Future group work should consider:

- LINE `groupId` and `roomId`.
- LIFF group context.
- Group membership.
- Group-level visibility.
- Group-specific roles and permissions.

## 8. Future API Planning

This section started as design-only in 11D-2A. Since then, `GET /api/members` has been added as a first read-only API, while write APIs and formal member data remain future work.

Current and possible future endpoints:

```txt
GET /api/members // implemented, read-only
POST /api/members
PATCH /api/members/:id
GET /api/groups
```

The first practical endpoint is:

```txt
GET /api/members
```

Possible response:

```json
{
  "ok": true,
  "members": [
    {
      "id": "user_Uxxxxxxxx",
      "displayName": "RINKA",
      "lineUserId": "Uxxxxxxxx",
      "pictureUrl": "https://...",
      "sourceKey": "user_Uxxxxxxxx",
      "role": "MEMBER",
      "isActive": true
    }
  ]
}
```

The first API version should keep a fallback path to local mock members until the formal member source is stable.

## 9. Firestore Safety And Compatibility Strategy

The first member and assignee upgrades should be conservative.

Rules:

- Add new fields only.
- Do not delete `assignee`.
- Do not force migration.
- Old tasks must keep rendering.
- Existing LIFF personal tasks must keep using `user_${lineUserId}`.
- Access Code mode under `web_default` must not accidentally use LIFF personal members.
- Personal members must not be mixed with group or room members.
- Formal role checks must not rely only on frontend state.

Recommended task display fallback:

```ts
task.assigneeName || task.assignee || '未指派'
```

Recommended member lookup behavior:

1. Try formal member id.
2. Try formal member source key.
3. Fall back to legacy assignee name.
4. Fall back to `未指派`.

## 10. Phased Rollout Plan

### 11D-2A: Create This Design Document

- Add this document.
- Do not modify runtime code.
- Do not create Firestore collections.
- Do not modify APIs.

### 11D-3: Frontend Member Source Switching Design

- Design how `App.tsx` should load members.
- Design `GET /api/members`.
- Keep `MOCK_MEMBERS` fallback.
- Do not change task assignee fields yet.

### 11D-4: Additive Task Assignee Field Upgrade

- Add support for `assigneeId`, `assigneeName`, and `assigneeSourceKey`.
- Keep writing legacy `assignee`.
- Keep UI fallback for old tasks.
- Update create and edit task flows.

### 11D-5: LINE Bot Assignee Commands

Implemented first-version command:

```txt
指派 3 小語
```

Implemented LINE task list display:

```txt
#3 修首頁 bug（今日到期） @小語
```

The current implementation saves only free-form assignee text:

```js
{
  assignee: assigneeName,
  assigneeName,
  assigneeId: null,
  assigneeSourceKey: null,
  updatedAt
}
```

It does not perform member lookup, does not query a formal `members` collection, and does not validate group or room membership.

Future work may add formal member lookup after the member model is stable.

### 11E: Group LIFF And Group Members

- Design group LIFF scope.
- Design group member visibility.
- Design group roles.
- Support group and room task management.

## 11. Risks

Key risks:

- Breaking old tasks that only have `assignee`.
- Mixing mock ids such as `m1` with formal ids such as `user_Uxxxxxxxx`.
- Mixing personal task members with group task members.
- Assuming LINE Bot assignees are formal members when they are currently text-only.
- Introducing a role and permission model too early.
- Designing groups before LIFF group scope is clear.

Mitigation:

- Keep `assignee` forever as a legacy display/search field.
- Add new fields without deleting old fields.
- Avoid automatic migration until there is a reliable mapping.
- Keep personal and group scopes separate.
- Treat group and room membership as 11E work.

## 12. Non-Goals For 11D-2A

This document does not implement:

- Firestore `members` collection.
- Firestore `groups` collection.
- Members write APIs.
- Groups API.
- Task schema migration.
- Formal LINE Bot member lookup.
- Group LIFF support.
- Formal role enforcement.
- Permission checks.

## 13. 11D-4 Additive Assignee Upgrade Notes

The backend and frontend now support additive assignee fields while keeping the legacy `assignee` field.

Backend-supported additive fields:

- `assigneeId`
- `assigneeName`
- `assigneeSourceKey`

Legacy field retained:

```ts
assignee: string
```

Compatibility rules:

- Do not delete `assignee`.
- Do not force migration.
- Existing tasks with only `assignee` must still render correctly.
- UI fallback should use:

```ts
assigneeName || assignee || '未指派'
```

Write rules:

- Create and edit task flows still send legacy `assignee`.
- Create and edit task flows also send:
  - `assigneeId`
  - `assigneeName`
  - `assigneeSourceKey`
- The backend keeps `assignee = assigneeName`.

Mock id protection:

- `assigneeId` may be a mock id such as `m1`, `m2`, or `m3`.
- `assigneeSourceKey` must not save mock ids.
- Only `member.id.startsWith('user_')` may be saved to `assigneeSourceKey`.

Subtasks are not upgraded yet:

- `subTasks[].assigneeId` remains unchanged.
- Do not migrate subtasks in 11D-4.
- Do not add `subTasks[].assigneeName` yet.

LINE Bot assignee first version is implemented:

- Task lists can display `@負責人`.
- The minimal `指派 任務編號 負責人` command saves free-form text.
- The command writes `assignee` and `assigneeName`.
- The command writes `assigneeId: null` and `assigneeSourceKey: null`.
- Bot-created tasks without assignee fields must still be supported by frontend and backend fallback behavior.
- Formal member lookup, group / room validation, and subtask assignee additive upgrade remain future work.

Validation checklist:

- New tasks in Firestore contain the new additive fields and legacy `assignee`.
- Old tasks still render correctly.
- Mock members are not written to `assigneeSourceKey`.
- Editing a task updates both `assignee` and `assigneeName`.
