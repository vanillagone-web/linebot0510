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

## Cloud Run Notes

This project can currently be deployed to Cloud Run as a LINE webhook server.

Basic requirements:

- Configure `LINE_CHANNEL_ACCESS_TOKEN`.
- Configure `LINE_CHANNEL_SECRET`.
- Allow LINE to call the Cloud Run service URL.
- Set the LINE Developers Console webhook URL to `https://YOUR_CLOUD_RUN_URL/webhook`.
- Keep using `npm start` as the runtime start command.

Important limitation: `npm start` currently runs only `server.js`. It does not serve the Vite frontend build output. Serving the frontend from Cloud Run would require an additional integration step, such as building the frontend and serving `dist` from Express.

## Useful Commands

```bash
npm run dev
npm start
npm run build
npm run preview
npm run lint
```
