# 12A：MVP 功能範圍確認

## 1. 文件目的

本文件用來鎖定目前 MVP 的交付邊界，避免開發範圍在尚未決策前被已存在的 UI、demo 功能或未來規劃功能拉大。

12A 的重點是：

- 只確認功能範圍。
- 不改 UI。
- 不改 API。
- 不改 Firestore schema。
- 不實作新功能。
- 避免 MVP 被 Chat、Dashboard、Google Sheets、正式 members、LINE group scope 等功能拉大。

## 2. MVP 必做清單

以下功能屬於 MVP 必要功能，應優先確保流程穩定、資料正確、錯誤可理解。

- Access Code 登入：作為 Web 管理介面的 fallback 存取方式。
- LIFF / LINE idToken 基礎驗證：支援 LINE 使用者身份驗證，正式 scope 可在後續階段繼續穩定化。
- 任務列表：顯示目前 scope 下可操作的任務。
- 任務搜尋 / 篩選：支援基本任務查找與任務狀態管理。
- 建立任務：可建立新任務並寫入目前 scope。
- 任務詳情：作為查看與操作單一任務的主入口。
- 編輯任務：可更新任務主要欄位。
- 計時器啟動 / 暫停：可記錄任務進行狀態與實際工時。
- 任務完成：可將任務標記為完成。
- 任務重新啟動：可將已完成任務重新設為待處理。
- 任務刪除：可刪除或軟刪除任務。

MVP 核心是：任務 CRUD + 任務詳情 + 計時 + 完成 / 重啟 / 刪除 + 基礎登入 / scope。

## 3. MVP 明確不做清單

以下功能不屬於目前 MVP，不應在 12A 或 MVP 主線中擴大實作。

- Chat AI。
- Google Sheets 同步。
- Dashboard 正式後台。
- 正式 members 管理。
- LINE group / room scope。
- 推播通知管理。
- 外觀樣式切換。
- profile / 頭像編輯。
- 正式帳號系統。
- 大量匯入。
- 任務模板。
- server-side search。
- calendar sync。
- undo / 審批流程。
- 自動暫停其他任務。

這些功能分別牽涉不同資料模型、權限規則、外部服務或產品決策，不應與 MVP 任務核心流程混在同一階段處理。

## 4. MVP 保守相容清單

以下功能可以保留欄位或 UI，但不要在 12A 擴大實作。

- members 相關欄位。
- 任務指派欄位。
- 子任務指派。
- LINE profile 顯示。
- user id 顯示。
- fallback members。
- 子任務基礎資料結構。

這些功能目前只做相容與資料不破壞。不要在 members collection、lineUserId 對應、sourceKey、權限規則穩定前深入實作。任務流程應能在 members API 回傳空資料、失敗，或 fallback members 生效時繼續運作。

## 5. 可保留但非主線功能

以下功能可以留在產品中，但不是目前主線，12A 不做大幅擴充。

- 子任務新增 / 勾選 / 刪除 / 排序。
- 日曆檢視。
- 日曆快速完成。
- Excel 匯出。
- 數據圖表。
- 使用幫助與 FAQ。
- 任務顏色快速修改。
- 任務異動歷程。
- 任務外部連結。

這些功能可以作為輔助能力保留，但不應優先於任務 CRUD、任務詳情、計時、完成 / 重啟 / 刪除與基礎登入 / scope。

## 6. 產品決策清單

以下項目需要產品決策後再進一步實作或整理。

1. 任務卡 play icon 行為

   - 是純視覺 / 進入詳情？
   - 還是未來要直接啟動計時？

2. 任務完成成功畫面文案

   - 是否可以宣稱「同步通知已發出」？
   - 如果沒有 LINE push / webhook 通知，應避免這種文案。

3. Chat 頁

   - 是否保留入口？
   - 是否改成 future / demo？
   - 是否暫時隱藏？

4. Dashboard 頁

   - 是否保留入口？
   - 是否明確列為 demo / future？
   - 是否等正式 members 後再處理？

5. 群組切換 UI

   - 是否現在顯示？
   - 是否等 LINE group / room scope 後才正式處理？

6. Settings 頭像 edit icon

   - 是否保留？
   - 是否移除互動暗示？
   - 是否未來才做 profile 編輯？

## 7. 12A 結論

12A 的核心目標不是新增功能，而是鎖定 MVP 邊界。

目前 MVP 應先穩定：

- 任務 CRUD。
- 任務詳情。
- 計時。
- 完成 / 重啟 / 刪除。
- 基礎登入 / scope。

以下功能全部拆到後續階段：

- members 正式化。
- LIFF group / room scope。
- Chat AI。
- Dashboard 正式後台。
- Google Sheets。
- 推播通知。
- 外觀設定。
- profile 編輯。

## 8. 後續階段建議

- 12B：MVP 欄位與文案決策。
- 12C：任務核心流程穩定化。
- 12D：members 保守相容整理。
- 12E：LIFF / LINE user scope 穩定化。
- 12F：非 MVP 功能入口整理。

