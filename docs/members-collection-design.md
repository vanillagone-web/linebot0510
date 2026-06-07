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
