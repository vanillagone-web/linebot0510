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

## Memory Mode Limitations

This version stores tasks in server memory only.

Important limitations:

- Tasks disappear when Cloud Run restarts, redeploys, or replaces an instance.
- If Cloud Run runs multiple instances, each instance may have a different in-memory task list.
- This version does not separate tasks by LINE user or LINE group.
- Anyone who can message the bot can add, complete, or delete tasks.
- This is a first-version smoke test, not a production data persistence implementation.

For production persistence, Firestore is the recommended next database option for this Cloud Run + LINE Bot setup.

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

## Useful Commands

```bash
npm run dev
npm start
npm run build
npm run preview
npm run lint
```
