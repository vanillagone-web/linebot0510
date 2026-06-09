# Cloud Run / LIFF Deployment Checklist

## 1. 文件目的

此文件用來集中記錄 Cloud Run / LIFF 的部署與驗收流程，避免每次部署後重新摸索。

涵蓋範圍：

- Cloud Run 部署流程
- LIFF Endpoint 固定設定
- 部署後 API 驗收
- 部署後前端 assets 驗收
- LIFF 實機驗收
- tag 流程
- Access Code 更換注意事項

## 2. 正式環境資訊

```text
Cloud Run Service:
task-manager-bot

Region:
asia-east1

Cloud Run Service URL:
https://task-manager-bot-1003132466566.asia-east1.run.app/

LIFF ID:
2010080247-glefOCCP

正式 LIFF URL:
https://liff.line.me/2010080247-glefOCCP
```

注意：

- LIFF Endpoint URL 是 LINE Developers 後台設定，不是程式碼控制。
- Endpoint URL 應固定為 Cloud Run Service URL。
- 不建議長期使用 `?v=` 當正式 Endpoint。
- `?v=` 只作為快取排查用。

## 3. 部署前檢查

```bash
git status --short
git log --oneline -5
npm run build
npm run lint
```

確認事項：

- `git status --short` 應乾淨。
- `npm run build` 必須成功。
- `npm run lint` 若只有既有 warning，可記錄但不要自動修。
- 不要把 `.env` 或 secret commit。

## 4. Cloud Run 部署指令

正式部署指令：

```bash
gcloud run deploy task-manager-bot \
  --source . \
  --region asia-east1
```

注意：

- 此操作會建立新的 Cloud Run revision。
- 此操作會使用 Google Cloud 資源。
- 部署後可能造成短暫 cold start。
- 若詢問 unauthenticated invocations，LIFF / LINE 入口通常需要允許公開存取。
- 部署後應確認新 revision serving 100% traffic。

## 5. 部署後 Cloud Run 驗收

```bash
gcloud run services list
```

確認：

- service 是 `task-manager-bot`。
- region 是 `asia-east1`。
- URL 是正式 Cloud Run URL。
- `LAST DEPLOYED AT` 已更新。

## 6. API 驗收

```bash
curl https://task-manager-bot-1003132466566.asia-east1.run.app/api/tasks \
  -H "X-Web-Access-Code:<WEB_ACCESS_CODE>"
```

注意：

- 不要把真實 access code 寫進文件。
- `<WEB_ACCESS_CODE>` 只用 placeholder。
- 若回傳 `401`，代表 access code 不正確或 Cloud Run env 不一致。

新版 API 的 task 應確認包含：

- `estimatedHours`
- `actualHours`
- `history`
- `assigneeId`
- `assigneeName`
- `assigneeSourceKey`

## 7. 首頁與快取 header 驗收

```bash
curl -I https://task-manager-bot-1003132466566.asia-east1.run.app/
```

應看到：

```text
cache-control: no-store, no-cache, must-revalidate, proxy-revalidate
pragma: no-cache
expires: 0
content-type: text/html; charset=utf-8
```

說明：

- `index.html` 應 no-cache。
- 這是為了降低 LIFF WebView 吃舊 HTML 的風險。

## 8. Assets 驗收

先從首頁取得 JS / CSS 檔名：

```bash
curl -s https://task-manager-bot-1003132466566.asia-east1.run.app/ | grep -o 'assets/[^"]*'
```

取得檔名後檢查：

```bash
curl -I https://task-manager-bot-1003132466566.asia-east1.run.app/assets/<js-file>
curl -I https://task-manager-bot-1003132466566.asia-east1.run.app/assets/<css-file>
```

應確認：

```text
JS: content-type: text/javascript
CSS: content-type: text/css
```

注意：

- `/assets` 已排除 SPA fallback。
- 若 asset 缺檔，應回 `404`，不應回 `index.html`。
- 若 JS request 回 `text/html`，可能代表 fallback 或快取問題。

## 9. LIFF Endpoint 驗收

LINE Developers 檢查流程：

```text
LINE Developers
→ Provider
→ LINE Login Channel
→ LIFF
→ LIFF App: 2010080247-glefOCCP
→ Endpoint URL
```

Endpoint URL 應為：

```text
https://task-manager-bot-1003132466566.asia-east1.run.app/
```

正式入口：

```text
https://liff.line.me/2010080247-glefOCCP
```

## 10. LIFF 實機驗收

1. 完全關閉 LINE App。
2. 重新開啟 LINE。
3. 開啟正式 LIFF URL。
4. 確認不再出現 MIME error。
5. 確認可登入 / 進入任務列表。
6. 點進 `測試123`。
7. 確認可看到：

```text
任務異動歷程 (1)
🎨 變更任務顏色為 #3B82F6
```

## 11. Tag 流程

建立 tag 前要確認：

- Git 乾淨。
- Cloud Run 已部署。
- API 驗收通過。
- LIFF 實機驗收通過。

目前既有穩定版：

```text
v0.2.0-mvp-stabilized
```

如果未來要新增 tag，可使用格式：

```bash
git tag -a <tag-name> -m "<message>"
git push origin <tag-name>
```

注意：

- 已推到遠端的 tag 不建議隨便移動。
- 若 tag 已存在，要先檢查它指向哪個 commit：

```bash
git show-ref --tags <tag-name>
git log --oneline -1 <tag-name>
git log --oneline -1 HEAD
```

## 12. Access Code 更換注意事項

只記錄操作原則，不記錄真實 secret。

- `WEB_ACCESS_CODE` 由 Cloud Run 環境變數提供。
- 前端 Access Code 登入會把使用者輸入值存在 `localStorage`。
- 更換 Cloud Run `WEB_ACCESS_CODE` 後，舊 code 會失效。
- 使用者下一次 API request 若 `401`，前端會清除登入狀態。
- 使用者需重新輸入新 code。
- 本機 `.env` 與線上 Cloud Run env 建議使用不同值。
- 不要把真實 access code 寫進 README、docs、commit message 或聊天紀錄。

## 13. 常見問題排查

### A. MIME type text/html 錯誤

可能原因：

- LIFF WebView 吃到舊 HTML。
- Endpoint URL 指到舊 Cloud Run URL。
- `/assets/*.js` 缺檔卻被 fallback 回 `index.html`。
- 部署後 assets hash 不一致。

排查：

```bash
curl -s <Cloud Run URL>/ | grep -o 'assets/[^"]*'
curl -I <Cloud Run URL>/assets/<js-file>
```

### B. API 401

可能原因：

- 使用錯的 `WEB_ACCESS_CODE`。
- Cloud Run env 與本機 `.env` 不一致。
- header 沒正確送出。

提醒：

- 多行 curl 的 `\` 後面不能有空行。
- 可改用一行版避免 zsh 把 `-H` 當新指令。

### C. LIFF 看起來不是最新版

可能原因：

- Cloud Run 尚未部署最新 commit。
- LIFF Endpoint 指到舊 URL。
- LINE WebView 快取。

排查：

```bash
gcloud run services list
curl -I <Cloud Run URL>/
```
