# Member Source Plan

## 1. Current State

The frontend member source is still mock-based.

- The real source for members is currently `MOCK_MEMBERS` in `constants.ts`.
- The real source for groups is currently `MOCK_GROUPS` in `constants.ts`.
- `App.tsx` currently initializes `members` and `currentUser` from `MOCK_MEMBERS`.
- `App.tsx` currently initializes `activeGroupId` and `activeGroup` from `MOCK_GROUPS`.
- `TaskListView` depends on `members` for the create-task assignee select.
- `TaskExecutionView` depends on `members` for the edit-task assignee select and subtask assignee picker.
- `SettingsView` still depends on `currentUser` to display the profile and admin sections.
- `StatsView` still uses `currentUser.role` for parts of the UI.
- `DashboardView` is highly dependent on mock members and mock groups, but it is already labeled as test data.
- There is currently no members API.
- There is currently no `members` collection.
- There is currently no member loading layer or adapter layer.

## 2. Dependencies That Must Not Break

Before a formal members source is introduced, the app must keep the `MOCK_MEMBERS` fallback for the following flows:

- Selecting an assignee when creating a task.
- Editing a task assignee.
- Assigning subtasks.
- Displaying task assignees in task lists.
- Searching by task assignee.
- Using `currentUser` as the default assignee when creating a task.
- Passing `groupMembers` into `TaskListView` and `TaskExecutionView`.

These are part of the current task workflow. They should keep working even if a future members API returns an empty result or fails.

## 3. API Member Model vs UI Member Model

A future API member may look like this:

```js
{
  id,
  displayName,
  pictureUrl,
  lineUserId,
  sourceKey,
  role,
  isActive
}
```

The current UI `Member` model requires this shape:

```js
{
  id,
  name,
  avatar,
  status,
  productivity,
  avgDuration,
  completedTasks,
  isBotLinked,
  groupIds,
  role
}
```

These shapes are not the same. The frontend should not pass API members directly into existing views.

A member adapter or normalize layer is required.

## 4. `normalizeMember` Design

This is a future adapter design. It is not implemented in this stage.

Concept:

```ts
normalizeMember(apiMember, fallbackGroupId): Member
```

Recommended conversion rules:

- `id = apiMember.id`
- `name = apiMember.displayName || apiMember.id`
- `avatar = apiMember.pictureUrl || default avatar`
- `status = apiMember.isActive ? 'ACTIVE' : 'OFFLINE'`
- `productivity = 0`
- `avgDuration = '-'`
- `completedTasks = 0`
- `isBotLinked = true`
- `groupIds = [fallbackGroupId]`
- `role = apiMember.role || 'MEMBER'`

This adapter keeps existing UI components stable while allowing a future API model to be introduced gradually.

## 5. Fallback Rules

Future member loading should follow conservative fallback behavior.

1. If the members API succeeds and returns members:
   - Use normalized API members.

2. If the members API succeeds but returns an empty array:
   - Use `MOCK_MEMBERS` fallback.

3. If the members API fails:
   - Use `MOCK_MEMBERS` fallback.

4. If `currentUser` cannot be found:
   - Fall back to `members[0] || MOCK_MEMBERS[0]`.

5. If `groupMembers` is empty:
   - Do not block task CRUD.
   - Keep basic create and edit task flows available.

The task system should never become unusable just because members cannot be loaded.

## 6. `currentUser` Decision Strategy

Future `currentUser` behavior should be explicit.

- In LIFF mode, the app may eventually map `lineAuthUser.lineUserId` to `members/{user_${lineUserId}}`.
- In Access Code mode, the app should temporarily fall back to `MOCK_MEMBERS[0]` or a future `web_default` member.
- Before the members API is complete, `currentUser` must never become `undefined`.
- `currentUser` should be treated as a frontend UI default.
- `currentUser` should not be treated as a formal permission source.

Formal role and permission enforcement must be handled by backend rules or verified backend logic in a later stage.

## 7. Subtask AssigneeId Risk

Current subtask state:

- `subTasks[].assigneeId` may be a mock id such as `m1` or `m2`.
- Future API member ids may be formal ids such as `user_Uxxxxxxxx`.

11D-3 should not migrate `subTasks[].assigneeId`.

Recommended behavior:

- If the UI can resolve `subTasks[].assigneeId` to a member, display that member.
- If the UI cannot resolve the member, display `未指派` or preserve the legacy display.
- Do not rewrite subtask assignee ids in this stage.

Formal subtask assignee fields should be handled in 11D-4 or later.

## 8. Phased Rollout Plan

### 11D-3A: Member Source Design And Adapter Document

- Add `docs/member-source-plan.md`.
- Do not modify runtime code.
- Do not add APIs.
- Do not modify Firestore schema.

### 11D-3B: App.tsx Member Loading Skeleton

- Do not add an API yet.
- Organize `App.tsx` fallback helpers and optional member-source state.
- Continue using `MOCK_MEMBERS`.
- Keep existing task flows working.

Possible future concepts:

```ts
memberSource: 'mock' | 'api'
isLoadingMembers: boolean
getFallbackMembers()
getFallbackCurrentUser()
```

### 11D-3C: Minimal `GET /api/members`

- This is the first stage that may modify `server.js`.
- Do not return backend mock data.
- If there is no `members` collection or no matching members, return an empty array.
- Keep task APIs unchanged.

Possible response:

```json
{
  "ok": true,
  "members": []
}
```

### 11D-3D: Frontend Uses `GET /api/members`

- `App.tsx` fetches members.
- API members are normalized before being passed into views.
- Failed member loading falls back to `MOCK_MEMBERS`.
- Empty API member results fall back to `MOCK_MEMBERS`.
- Do not change the `Task.assignee` schema.

## 9. Non-Goals

This stage does not do any of the following:

- Modify `App.tsx`.
- Modify `server.js`.
- Add `/api/members`.
- Create a `members` collection.
- Modify Firestore schema.
- Modify the `Task.assignee` schema.
- Modify the `SubTask.assigneeId` schema.
- Modify LIFF auth.
- Modify LINE Bot behavior.
- Treat `DashboardView` as a formal member management feature.

## 10. Risks And Rollback Strategy

Risks:

- `currentUser` may become empty if future member loading is not careful.
- Empty `members` may leave assignee selects without options.
- Mock ids may be mixed with formal ids.
- API member fields may be insufficient for existing UI components.
- `groupIds` currently has no formal source.
- `DashboardView` may be formalized too early and create false expectations.

Rollback and mitigation:

- Keep `MOCK_MEMBERS` fallback.
- Keep `MOCK_GROUPS` fallback.
- Do not modify task schema in 11D-3.
- Do not modify subtask assignee schema in 11D-3.
- Treat API members as optional until the model is stable.
- Keep Dashboard labeled as test data until group/member models are formalized.

