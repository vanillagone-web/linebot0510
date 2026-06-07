# Members Collection Design

## 1. Purpose

This document defines the first formal `members` collection design.

The first version is intentionally narrow:

- Support personal LIFF / LINE user scope first.
- Keep compatibility with the current task and assignee model.
- Do not handle group or room membership in this stage.
- Do not implement a formal permission system in this stage.

This document is design-only. It does not create Firestore data, change APIs, or modify runtime code.

## 2. Current State

- The `Member` type in `types.ts` is a frontend UI model. It is not the backend formal member model.
- `constants.ts` still contains `MOCK_MEMBERS` and `MOCK_GROUPS`.
- `App.tsx` already has a members fallback skeleton.
- The frontend already calls `GET /api/members`.
- `server.js` already exposes `GET /api/members`.
- `GET /api/members` currently queries the `members` collection with:

```js
where("sourceKey", "==", scope.sourceKey)
```

- Formal `members` collection data has not been created yet.
- If the API returns an empty array, the frontend still falls back to `MOCK_MEMBERS`.
- Task assignee data already supports additive fields:
  - `assigneeId`
  - `assigneeName`
  - `assigneeSourceKey`
  - legacy `assignee`

## 3. Collection Design

Use a top-level collection:

```txt
members/{memberId}
```

Recommended first-version personal member document id:

```txt
user_${lineUserId}
```

Example:

```txt
members/user_Uxxxxxxxx
```

Reasons:

- It matches the current LIFF / LINE Bot personal task scope.
- `sourceKey` can use the same `user_${lineUserId}` value.
- It works with the current `/api/members` `sourceKey` query.
- It is easy to debug manually.
- It avoids introducing group membership complexity too early.

## 4. Document Fields

Recommended first-version fields:

```js
{
  displayName: string,
  lineUserId: string | null,
  pictureUrl: string,
  sourceKey: string,
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

- Multiple group memberships.
- Group role overrides.
- Invite tokens.
- Billing fields.
- Audit-log fields.
- Complex permission matrices.

## 5. Personal Member Example

Document id:

```txt
user_Uxxxxxxxx
```

Document data:

```js
{
  displayName: "RINKA",
  lineUserId: "Uxxxxxxxx",
  pictureUrl: "https://...",
  sourceKey: "user_Uxxxxxxxx",
  role: "MEMBER",
  isActive: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

## 6. Access Code Fallback Boundary

The first version should not create a formal `members/web_default` identity.

Reasons:

- Access Code mode is currently a fallback / management test mode.
- It does not represent a real LINE user.
- Creating `members/web_default` too early may confuse the future permission model.

`web_default` can remain a future option for a fallback management identity, but it should not be treated as a first-version formal member identity.

## 7. Group / Room Scope Boundary

This stage does not handle:

- `group_${groupId}`
- `room_${roomId}`
- Group member lists.
- Group roles.
- Group LIFF context.
- Group or room member validation.

These concerns should be left for a future 11E or group / room LIFF stage. Group and room tasks require separate visibility, membership, and permission decisions.

## 8. `/api/members` Compatibility

The current `/api/members` implementation can work with this design if each formal member document includes:

```js
sourceKey: "user_Uxxxxxxxx"
```

If `sourceKey` is missing or does not match the resolved task scope, `/api/members` will return an empty array and the frontend will fall back to `MOCK_MEMBERS`.

The current query uses a single condition:

```js
where("sourceKey", "==", scope.sourceKey)
```

This does not require a composite Firestore index in the first version.

## 9. Manual Test Checklist

This is a future manual verification checklist. Do not perform these steps as part of this document-only stage.

1. Create a Firestore document manually:

```txt
members/user_Uxxxxxxxx
```

2. Set:

```txt
sourceKey: user_Uxxxxxxxx
```

3. Open the LIFF app with the same LINE user.

4. Call `/api/members`.

5. Confirm the frontend member source displays API.

6. Confirm the create-task assignee select uses the API member.

7. Confirm a newly created task writes expected values for:
   - `assigneeId`
   - `assigneeName`
   - `assigneeSourceKey`

8. Confirm that if the API returns an empty array, the frontend still falls back to mock members.

## 10. Future Member Creation Strategies

Possible future strategies:

- Manual creation.
- Automatic upsert after LIFF login.
- Automatic upsert after first LINE Bot interaction.
- Admin/backend management UI.

Current recommendation:

- Start with manually created test data.
- Do not implement auto-create yet.

Manual test data makes it easier to observe the data flow before member creation becomes automatic.

## 11. Non-Goals

This stage does not do any of the following:

- Modify `server.js`.
- Modify `/api/members`.
- Modify `App.tsx`.
- Modify views.
- Create a Firestore collection.
- Write to Firestore.
- Auto-create members.
- Implement group members.
- Change the `Task.assignee` schema.
- Change the `SubTask.assigneeId` schema.
- Remove `MOCK_MEMBERS`.
- Treat `role` as a formal backend authorization source.

## 12. Risks

- If `sourceKey` is wrong, `/api/members` will return an empty array.
- If member ids do not use `user_${lineUserId}`, future `assigneeSourceKey` mapping may become confusing.
- Introducing group or room concepts too early may make the permission model unstable.
- Removing mock fallback directly may break create-task and edit-task flows.
- `role` should currently be treated as UI display or future planning data, not as backend security authorization.

## 13. Members-1B Manual Firestore Test Checklist

This is a future manual verification checklist.

Important boundaries:

- This stage does not create Firestore data.
- Do not run this checklist until Cloud Run env, LIFF token, and Firestore databaseId are confirmed.
- This checklist is for personal `user_${lineUserId}` scope only.
- Group / room members are out of scope.

The goal is to verify this path:

```txt
Firestore members document
-> /api/members
-> App.tsx normalize
-> frontend assignee select
-> task additive assignee fields
-> LINE Bot list display
```

### 13.1 Confirm LINE User Identity

Confirm the target LINE user identity:

```txt
lineUserId: Uxxxxxxxx
sourceKey: user_Uxxxxxxxx
```

Possible sources:

- The LIFF UI display showing `user_Uxxxxxxxx`.
- The `/api/auth/line` verification result containing `lineUserId`.

### 13.2 Manually Create Firestore Member Document

Collection:

```txt
members
```

Document id:

```txt
user_Uxxxxxxxx
```

The document id must match the personal `sourceKey`.

### 13.3 Suggested Document Data

```js
{
  displayName: "RINKA",
  lineUserId: "Uxxxxxxxx",
  pictureUrl: "https://...",
  sourceKey: "user_Uxxxxxxxx",
  role: "MEMBER",
  isActive: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

If the Firestore Console is not convenient for `serverTimestamp()`, use Timestamp fields or the current time for manual testing.

This is only a manual testing substitute. It does not define runtime write rules.

### 13.4 Verify `/api/members`

Use a LIFF Bearer token:

```bash
curl -H "Authorization: Bearer LINE_ID_TOKEN" \
  https://YOUR_CLOUD_RUN_URL/api/members
```

Expected response:

```json
{
  "ok": true,
  "members": [
    {
      "id": "user_Uxxxxxxxx",
      "displayName": "RINKA",
      "pictureUrl": "https://...",
      "lineUserId": "Uxxxxxxxx",
      "sourceKey": "user_Uxxxxxxxx",
      "role": "MEMBER",
      "isActive": true
    }
  ]
}
```

### 13.5 Verify Frontend Member Source

After opening LIFF, the frontend should show that the member source is API.

If the frontend still falls back to mock members, check:

- Whether the document id is `user_Uxxxxxxxx`.
- Whether `sourceKey` is `user_Uxxxxxxxx`.
- Whether the LIFF user is the same LINE user.
- Whether `/api/members` actually returns a members array.
- Whether `isActive` is not `false`.

### 13.6 Verify Task Assignee Select

The create-task modal assignee select should show the API member, for example:

```txt
RINKA
```

If it does not appear, possible causes include:

- `/api/members` returned an empty array.
- The frontend fell back to mock members.
- The API member was normalized but not passed into the relevant view.

### 13.7 Verify Created Task Assignee Fields

After creating a task, the Firestore `tasks` document should contain:

```js
{
  assignee: "RINKA",
  assigneeName: "RINKA",
  assigneeId: "user_Uxxxxxxxx",
  assigneeSourceKey: "user_Uxxxxxxxx"
}
```

This is the most important verification point.

Because the formal API member id starts with `user_`, `assigneeSourceKey` can be saved.

### 13.8 Verify LINE Bot List Display

In the personal LINE Bot chat, send:

```txt
任務
```

Expected task list display:

```txt
#1 任務名稱（今日到期） @RINKA
```

### 13.9 Verify Fallback Behavior

To test fallback behavior temporarily, use intentionally incorrect data, such as:

- Change the member document `sourceKey` to an incorrect value.
- Or set `isActive: false`.

Expected behavior:

- `/api/members` returns an empty array or no active members.
- The frontend falls back to `MOCK_MEMBERS`.
- Task CRUD should not break.

Restore the test data after verification.

### 13.10 Warnings

- Do not create `members/web_default` as a formal identity.
- Do not use mock ids such as `m1` or `m2` as formal member document ids.
- Do not write mock ids into `assigneeSourceKey`.
- `role` is not currently a backend authorization source.
- Do not implement auto-create in this stage.
- Do not create group / room members in this stage.
- Do not remove the `MOCK_MEMBERS` fallback.
