# Task Manager Bot

React / Vite / TypeScript frontend with a Node.js / Express LINE Bot webhook server.

Current project status:

- The frontend is still a mock-data prototype. Tasks, members, groups, and chat state are stored in React state and `constants.ts`.
- `server.js` is currently a LINE webhook echo/smoke test. It verifies LINE webhook requests and replies to text messages with a simple echo response.
- The frontend and `server.js` are not yet connected through application APIs.

## Prerequisites

- Node.js
- npm
- LINE Developers channel access token and channel secret

## Environment Variables

Create a local `.env` file for the webhook server:

```env
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

Do not commit local secret files. `.env`, `.env.local`, and local environment variants are ignored by Git.

`GEMINI_API_KEY` may still be referenced by the current frontend AI chat prototype, but this first-stage setup does not change the Gemini integration.

## Install

```bash
npm install
```

## Run Locally

Start the Vite frontend:

```bash
npm run dev
```

The Vite dev server is configured to use port `3000`.

Start the LINE webhook server:

```bash
npm start
```

The Express server listens on `PORT` when provided, or `8080` by default.

## LINE Webhook URL

The current webhook endpoint is:

```text
POST /webhook
```

For local LINE webhook testing, expose the local server with a public HTTPS tunnel such as ngrok, then configure this URL in the LINE Developers Console:

```text
https://YOUR_PUBLIC_URL/webhook
```

For Cloud Run, use the deployed service URL:

```text
https://YOUR_CLOUD_RUN_URL/webhook
```

## LINE Bot Task Commands

The first task-management version supports plain text commands only.

Available commands:

```text
新增 任務內容
任務
查看任務
完成 任務編號
刪除 任務編號
說明
```

Examples:

```text
說明
新增 買牛奶
新增 修正首頁 bug
任務
查看任務
完成 1
刪除 2
```

Command behavior:

- `新增 任務內容` creates a task.
- `任務` and `查看任務` show incomplete tasks.
- `完成 任務編號` marks an incomplete task as completed.
- `刪除 任務編號` deletes a task.
- `說明` shows the command list.
- Unknown commands ask the user to type `說明`.

The task list shows only the first 20 incomplete tasks.

## Firestore Persistence

Tasks are stored in Firestore using `firebase-admin`.

Firestore settings:

```text
projectId: my-line-todo-new
databaseId: line-todo-bot
location: asia-east1
type: FIRESTORE_NATIVE
```

The app explicitly uses the `line-todo-bot` database, not the `(default)` database.

Collections:

- `tasks`: task documents.
- `taskCounters`: per-LINE-source counters for task numbers.

Tasks are separated by `sourceKey`:

- Personal chat: `user_${userId}`
- Group chat: `group_${groupId}`
- Room chat: `room_${roomId}`

Deleting a task uses soft delete by setting `deletedAt`; documents are not physically deleted.

Cloud Run requirements:

- The Cloud Run service account needs `roles/datastore.user`.
- Do not download a service account JSON file.
- Do not commit service account keys or local credentials.

Some Firestore queries may require composite indexes. If an index is missing, Cloud Run logs will include a Firestore link to create the required index.

For local Firestore testing with Google Application Default Credentials:

```bash
gcloud auth application-default login
```

## Backend Task API

The backend exposes a first-version task API for a future React frontend integration.

Current frontend API scope:

```text
sourceType: web
sourceId: default
sourceKey: web_default
createdBy: web_default
```

This keeps browser-created tasks separate from LINE Bot tasks, which use `user_${userId}`, `group_${groupId}`, or `room_${roomId}`.

Endpoints:

```text
GET /api/tasks
POST /api/tasks
PATCH /api/tasks/:id
PATCH /api/tasks/:id/complete
DELETE /api/tasks/:id
```

`GET /api/tasks` returns non-deleted `web_default` tasks in React `Task[]` shape:

```json
{
  "ok": true,
  "tasks": []
}
```

`POST /api/tasks` creates a `web_default` task. Supported body fields:

```json
{
  "title": "前端測試任務",
  "description": "從 API 建立",
  "priority": "MEDIUM",
  "dueDate": "2026-05-11",
  "assignee": "Web User"
}
```

`PATCH /api/tasks/:id/complete` marks a task as completed. The `id` is the Firestore document id.

`PATCH /api/tasks/:id` updates allowed fields on a non-deleted `web_default` task. The `id` is the Firestore document id.

Allowed update fields:

```text
title
description
status
priority
dueDate
assignee
department
reminders
color
tags
notes
subTasks
actualHours
history
```

Protected fields that the frontend must not update:

```text
id
lineTaskNo
sourceKey
sourceType
sourceId
userId
groupId
roomId
createdBy
createdAt
deletedAt
```

Status synchronization rules:

- If `status` is updated to `COMPLETED`, the API sets `completed` to `true`.
- If `completedAt` is empty when status becomes `COMPLETED`, the API sets `completedAt` with a server timestamp.
- If `completedAt` already exists, the API does not overwrite it.
- If `status` is updated to `PENDING`, `IN_PROGRESS`, or `OVERDUE`, the API sets `completed` to `false` and `completedAt` to `null`.

`DELETE /api/tasks/:id` uses soft delete by setting `deletedAt`.

API test commands:

```bash
curl http://localhost:8080/api/tasks
```

```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "前端測試任務",
    "description": "從 API 建立",
    "priority": "MEDIUM",
    "dueDate": "2026-05-11",
    "assignee": "Web User"
  }'
```

```bash
curl -X PATCH http://localhost:8080/api/tasks/FIRESTORE_DOC_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新後的任務標題",
    "priority": "HIGH"
  }'
```

```bash
curl -X PATCH http://localhost:8080/api/tasks/FIRESTORE_DOC_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

```bash
curl -X PATCH http://localhost:8080/api/tasks/FIRESTORE_DOC_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PENDING"
  }'
```

```bash
curl -X PATCH http://localhost:8080/api/tasks/FIRESTORE_DOC_ID/complete
```

```bash
curl -X DELETE http://localhost:8080/api/tasks/FIRESTORE_DOC_ID
```

Middleware note:

- JSON parsing is mounted only on `/api` with `app.use("/api", express.json())`.
- Do not mount `express.json()` globally before `/webhook`, because LINE webhook signature verification depends on the LINE SDK middleware receiving the request correctly.

Firestore index note:

- The API query for `tasks` may require a composite index for `sourceKey`, `deletedAt`, and `lineTaskNo`.
- If Cloud Run logs show `The query requires an index`, create the linked composite index in Firestore Indexes.

Frontend serving note:

- Cloud Run serves React `dist` from the same Express service.
- SPA fallback is enabled after `/webhook`, `/api`, and `/healthz`.
- Cloud Run now runs as a full-stack single service.

## Cloud Run Notes

Cloud Run runs this project as a full-stack single service.

Routes:

```text
/          React app
/api/tasks Task API
/webhook   LINE webhook
/healthz   Health check
```

The LINE webhook URL should be:

```text
https://YOUR_CLOUD_RUN_URL/webhook
```

This project does not need a Dockerfile for the current server-only deployment. Use Google Cloud buildpacks from the source code.

Cloud Run buildpacks run `gcp-build`, which runs:

```bash
npm run build
```

This produces the React `dist` directory before `npm start` runs `server.js`.

Basic requirements:

- Configure `LINE_CHANNEL_ACCESS_TOKEN`.
- Configure `LINE_CHANNEL_SECRET`.
- Do not manually set `PORT`; Cloud Run provides it automatically.
- Allow LINE to call the Cloud Run service URL.
- Set the LINE Developers Console webhook URL to `https://YOUR_CLOUD_RUN_URL/webhook`.
- Keep using `npm start` as the runtime start command.

Example deploy command:

```bash
gcloud run deploy task-manager-bot \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars LINE_CHANNEL_ACCESS_TOKEN=YOUR_TOKEN,LINE_CHANNEL_SECRET=YOUR_SECRET
```

For production, consider moving secrets to Secret Manager later. This stage keeps deployment simple and does not implement Secret Manager integration.

Troubleshooting:

- If the frontend page is blank, first check that `dist` was generated during the Cloud Run build.
- If the LINE Bot stops working, verify that `/webhook` is still registered before `app.use("/api", express.json())`.
- If `/api/tasks` returns React HTML, the SPA fallback is running before the API routes and the route order must be fixed.
- Health checks should use `/healthz`; `/` is reserved for the React app.

## Stage 5 Stabilization Notes

Cloud Run is configured with `max instances = 1` during the testing stage.

Purpose:

- Avoid unexpected test traffic from scaling out and causing cost spikes.

Firestore persistence:

- Firestore uses `databaseId: line-todo-bot`.
- Task data is stored in Firestore and no longer depends on Cloud Run memory.
- Deleting a task uses soft delete by writing `deletedAt`; it does not physically delete the document.

Firestore composite index:

- The `tasks` query requires a composite index.
- The following composite index has been created for the `tasks` collection:

```text
completed Ascending
deletedAt Ascending
sourceKey Ascending
lineTaskNo Ascending
```

Troubleshooting:

- If the LINE Bot replies `任務系統暫時發生問題，請稍後再試。`, check Cloud Run logs first:

```bash
gcloud run services logs read task-manager-bot --region asia-east1 --limit 100
```

- If the logs show `The query requires an index`, create the corresponding composite index in Firestore Indexes.

Redeploy:

```bash
gcloud run deploy task-manager-bot --source . --allow-unauthenticated
```

Adjust Cloud Run max instances:

```bash
gcloud run services update task-manager-bot --region asia-east1 --max-instances 1
```

## Stage 7 Release Notes

Current release tag:

```text
v0.1.0-fullstack
```

This version has reached a full-stack single-service setup:

- The Cloud Run production URL displays the React frontend.
- `/api/tasks` provides the task API.
- `/webhook` provides the LINE Bot webhook.
- `/healthz` provides the health check.
- Firestore uses `databaseId: line-todo-bot`.

Data scopes:

- The frontend currently uses `web_default`.
- The LINE Bot uses `user_xxx`, `group_xxx`, and `room_xxx`.
- Frontend tasks and LINE Bot tasks are currently separated by scope.

Completed in this version:

- Frontend task loading.
- Frontend task creation.
- Frontend task completion.
- Frontend task deletion.
- LINE Bot text-based task commands.

Not completed yet:

- Full frontend edit synchronization.
- User login and permissions.
- LINE Login / LIFF.
- Reminder scheduling.
- AI task parsing.

If the service has issues, check these first:

- Cloud Run logs.
- Firestore indexes.
- LINE webhook settings.
- Cloud Run environment variables.

To return to this stable version, use the Git tag:

```bash
git checkout v0.1.0-fullstack
```

## Stage 8A Access Code Protection

The frontend task API is protected with a simple access code during the testing stage.

Required environment variable:

```env
WEB_ACCESS_CODE=dev123
```

Protected routes:

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/complete`
- `DELETE /api/tasks/:id`

Unaffected routes:

- `/webhook` is not affected by `WEB_ACCESS_CODE`.
- `/healthz` is not affected by `WEB_ACCESS_CODE`.
- React static files and the SPA fallback are not protected; only the task API is protected.

Local curl tests:

```bash
curl -i http://localhost:8080/api/tasks
```

Without the header, the API should return `401`.

```bash
curl -i http://localhost:8080/api/tasks \
  -H "X-Web-Access-Code: dev123"
```

With the correct `X-Web-Access-Code` header, the API should return the task list.

Cloud Run environment variable:

```bash
gcloud run services update task-manager-bot \
  --region asia-east1 \
  --update-env-vars WEB_ACCESS_CODE="你的存取碼"
```

This is not a production login system. It is a small testing-stage protection layer to avoid casual access to the shared `web_default` task data. A formal version should use Firebase Auth, LINE Login, or LIFF with per-user authorization.

## Stage 9B-1 LINE idToken Verification API

The backend exposes a LIFF preparation endpoint:

```text
POST /api/auth/line
```

This endpoint receives a LINE `idToken`, verifies it with the official LINE verify endpoint, and returns the LINE user ID plus basic profile data. This stage does not change `/api/tasks`, does not switch `web_default`, and does not change the LINE Bot webhook.

Required environment variable:

```env
LINE_LOGIN_CHANNEL_ID=your-line-login-channel-id
```

Local `.env` example:

```env
LINE_LOGIN_CHANNEL_ID=2000000000
```

Request body:

```json
{
  "idToken": "LINE_ID_TOKEN"
}
```

Successful response:

```json
{
  "ok": true,
  "user": {
    "lineUserId": "Uxxxxxxxx",
    "displayName": "LINE 顯示名稱",
    "pictureUrl": "https://..."
  },
  "scope": {
    "sourceType": "user",
    "sourceId": "Uxxxxxxxx",
    "sourceKey": "user_Uxxxxxxxx",
    "createdBy": "Uxxxxxxxx"
  }
}
```

Local curl tests:

```bash
curl -i -X POST http://localhost:8080/api/auth/line \
  -H "Content-Type: application/json" \
  -d '{}'
```

Missing `idToken` should return `400`.

```bash
curl -i -X POST http://localhost:8080/api/auth/line \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_REAL_LINE_ID_TOKEN"}'
```

A valid LINE `idToken` should return `200`.

Cloud Run environment variable:

```bash
gcloud run services update task-manager-bot \
  --region asia-east1 \
  --update-env-vars LINE_LOGIN_CHANNEL_ID="你的 LINE Login Channel ID"
```

`/api/auth/line` is not protected by `WEB_ACCESS_CODE` because it is the LINE identity verification entry point. Do not log full `idToken` values in application logs.

## Stage 9B-2 LIFF Frontend Initialization

The React frontend loads the LIFF SDK from `index.html`:

```html
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
```

The frontend reads the LIFF ID from Vite env:

```env
VITE_LIFF_ID=your-liff-id
```

The backend verifies LINE `idToken` with:

```env
LINE_LOGIN_CHANNEL_ID=your-line-login-channel-id
```

This stage initializes LIFF, calls `liff.getIDToken()`, sends the token to `POST /api/auth/line`, and displays the LINE user profile and `user_${lineUserId}` scope in the UI.

Important scope note:

- This stage does not switch `/api/tasks` to `user_${lineUserId}`.
- `/api/tasks` still uses `WEB_ACCESS_CODE` and `web_default`.
- `WEB_ACCESS_CODE` remains enabled.
- Do not store LINE `idToken` in `localStorage`.
- Do not store LINE auth results long-term in `localStorage`.

Local testing:

```env
VITE_LIFF_ID=your-liff-id
LINE_LOGIN_CHANNEL_ID=your-line-login-channel-id
WEB_ACCESS_CODE=dev123
```

```bash
npm start
npm run dev
```

Local LIFF behavior may be limited because the LIFF endpoint is configured to the Cloud Run production URL. Local testing is mainly useful for checking that the app does not crash when `VITE_LIFF_ID` is missing or when the LIFF SDK cannot initialize.

LIFF URL testing:

```text
https://liff.line.me/YOUR_LIFF_ID
```

Open the LIFF URL in the LINE app. The expected flow is:

1. LIFF initializes.
2. LINE login runs if needed.
3. The frontend gets an `idToken`.
4. The frontend calls `POST /api/auth/line`.
5. The UI displays the LINE display name and `user_${lineUserId}` scope.
6. Access Code is still required for `/api/tasks`.

Cloud Run environment variables:

```bash
gcloud run services update task-manager-bot \
  --region asia-east1 \
  --update-env-vars LINE_LOGIN_CHANNEL_ID="你的 LINE Login Channel ID",VITE_LIFF_ID="你的 LIFF ID"
```

Common errors:

- `VITE_LIFF_ID is not configured`: the frontend build did not receive `VITE_LIFF_ID`.
- `LIFF SDK 尚未載入`: the SDK script failed to load.
- Missing `openid` scope: `liff.getIDToken()` may return no token.
- Wrong `LINE_LOGIN_CHANNEL_ID`: `/api/auth/line` verification fails.

## Stage 9C-1 Task Scope Resolver

The task API supports two authentication modes:

1. LIFF / LINE user mode:

```http
Authorization: Bearer LINE_ID_TOKEN
```

The backend verifies the LINE `idToken` and uses:

```text
sourceType: user
sourceId: LINE_USER_ID
sourceKey: user_LINE_USER_ID
createdBy: LINE_USER_ID
```

This allows LIFF frontend requests to use the same personal task scope as the LINE Bot personal chat.

2. Access Code fallback mode:

```http
X-Web-Access-Code: your-access-code
```

The backend keeps using:

```text
sourceKey: web_default
```

If neither header is present, `/api/tasks` returns `401`.

Protected task routes:

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/complete`
- `DELETE /api/tasks/:id`

This stage does not modify `/webhook`, LINE Bot commands, Firestore collections, frontend UI, sessions, or JWTs.

Local curl tests:

```bash
curl -i http://localhost:8080/api/tasks
```

No auth header should return `401`.

```bash
curl -i http://localhost:8080/api/tasks \
  -H "X-Web-Access-Code: dev123"
```

Access Code mode should return `web_default` tasks.

```bash
curl -i http://localhost:8080/api/tasks \
  -H "Authorization: Bearer YOUR_REAL_LINE_ID_TOKEN"
```

LINE bearer mode should return `user_${lineUserId}` tasks.

Create a LINE user scoped task:

```bash
curl -i -X POST http://localhost:8080/api/tasks \
  -H "Authorization: Bearer YOUR_REAL_LINE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"LIFF user scope test","priority":"MEDIUM","dueDate":"","assignee":"LINE User"}'
```

Known limitation:

- The current frontend still needs a later step to send `Authorization: Bearer <idToken>` to `/api/tasks`.
- Access Code fallback remains enabled for `web_default`.
- Group task scope is still deferred.

## Useful Commands

```bash
npm run dev
npm start
npm run build
npm run preview
npm run lint
```
