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

## Cloud Run Notes

This stage deploys only the LINE webhook server to Cloud Run.

It does not serve the React frontend. After deployment, opening the Cloud Run service URL in a browser will only show:

```text
Service running
```

The LINE webhook URL should be:

```text
https://YOUR_CLOUD_RUN_URL/webhook
```

This project does not need a Dockerfile for the current server-only deployment. Use Google Cloud buildpacks from the source code.

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

Important limitation: `npm start` currently runs only `server.js`. It does not serve the Vite frontend build output. Serving the frontend from Cloud Run would require a separate future step, such as building the frontend and serving `dist` from Express.

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

## Useful Commands

```bash
npm run dev
npm start
npm run build
npm run preview
npm run lint
```
