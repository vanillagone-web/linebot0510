# Members Manual Test Preflight

## Purpose

This document is a preflight checklist for a future manual test of the formal `members` collection.

It does not mean Firestore data should be created immediately. It is not an auto-create design, and it does not define runtime write behavior.

Use this checklist before creating any temporary test member document.

## Current Status

- `/api/members` already exists as a read-only API.
- Formal `members` collection data is not created yet.
- Member auto-create is not enabled.
- Group / room member validation is not enabled.
- The current LINE Bot assignee command saves free-form text only.
- This checklist is for manual validation before any Firestore write.

## What This Stage Does Not Do

- Does not modify code.
- Does not deploy.
- Does not write Firestore data.
- Does not create `members/web_default`.
- Does not enable member auto-create.
- Does not change task assignee behavior.
- Does not validate group / room membership.

## Required Confirmations Before Manual Test

Confirm all items before creating any test document:

- [ ] Confirm the active Google Cloud project ID.
- [ ] Confirm Firestore database ID is `line-todo-bot`.
- [ ] Confirm the current Cloud Run service URL.
- [ ] Confirm the LIFF app points to the current Cloud Run URL.
- [ ] Confirm LIFF can obtain a valid LINE `idToken`.
- [ ] Confirm the target LINE `userId`.
- [ ] Confirm expected `sourceKey = user_${lineUserId}`.
- [ ] Confirm the test member display name.
- [ ] Confirm the test member role/status fields if used.
- [ ] Confirm the tester has Firestore Console / GCP permission.
- [ ] Confirm the test document can be deleted or reverted.

## Suggested Test Member Shape

This is a conservative example, not the only possible schema.

```json
{
  "sourceKey": "user_Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "displayName": "小語",
  "status": "active",
  "role": "member"
}
```

Notes:

- Do not use real secrets in documentation.
- Replace example IDs before testing.
- Do not create `members/web_default` for Access Code fallback.

## Manual Test Flow Draft

This is only a draft. Do not execute it as part of this document stage.

1. Open LIFF in LINE.
2. Confirm LIFF login succeeds.
3. Confirm `idToken` exists in the memory/session flow.
4. Confirm `sourceKey` should resolve to `user_${lineUserId}`.
5. Manually create one test member document in Firestore only after confirmation.
6. Call `/api/members` with a Bearer token.
7. Confirm the API returns the expected member.
8. Delete the test document if it was temporary.

## Expected Result

- `/api/members` returns the manually created member for the current user scope.
- If no matching member exists, the API may return an empty array.
- An empty result does not necessarily mean API failure; it may mean a `sourceKey` mismatch or missing test data.

## Common Failure Points

- Wrong Google Cloud project.
- Wrong Firestore database.
- Wrong Cloud Run URL.
- LIFF points to an old deployment.
- `idToken` is missing or expired.
- Wrong LINE `userId`.
- Wrong `sourceKey`.
- Test member created in the wrong collection or database.
- API returns an empty result, making it look like data did not work.

## Rollback / Cleanup

- Delete the temporary test member document if needed.
- Do not delete unrelated members.
- Do not change production task documents during this preflight.
- Keep member auto-create disabled.

## Recommended Next Step

After this preflight is reviewed, the next safe step is a controlled manual Firestore test with one temporary member document.

Do not proceed to auto-create or group / room validation until the manual test is confirmed.
