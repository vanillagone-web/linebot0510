# UI Feature Roadmap

## 1. 文件目的

這份文件用來保存目前前端 UI 與功能規劃的對照結果，對照目前畫面上已存在的 UI、功能狀態、正式化條件與建議開發階段。

目前產品尚未正式上線，因此本文件的重點不是將所有看起來可點擊或已出現在畫面上的項目視為 bug。重點是先確認每個 UI 是否屬於正式產品規劃、是否需要 API / Firestore / LIFF / members collection 支援，以及應該被安排在哪個開發階段。

這份文件也用來避免後續開發時誤以為某些 mock / demo / future UI 是立即要修的問題，或讓已經出現在畫面上的功能沒有被納入階段管理。

## 2. MVP 核心功能

以下功能屬於目前階段應納入主線穩定化的 MVP 核心功能。

- Access Code 登入。
- LIFF / LINE idToken 驗證，但正式 scope 可在後續階段繼續穩定化。
- 任務列表。
- 任務搜尋 / 篩選。
- 建立任務。
- 任務詳情。
- 編輯任務。
- 計時器啟動 / 暫停。
- 任務完成 / 重新啟動 / 刪除。

MVP 階段應優先確認這些流程在 Access Code 模式與 LIFF 模式下能穩定讀寫任務資料，並且錯誤狀態、loading 狀態與基本資料顯示一致。

## 3. 下一階段可穩定化功能

以下功能已經出現在 UI 中，或已經有部分 handler，可在 MVP 主線穩定後進一步定義與打磨。

- 日期快捷篩選 chips。
- 任務卡 play icon 行為定義。
- 任務完成成功畫面文案確認。
- 任務外部連結 URL 驗證。
- 任務顏色快速修改。
- 子任務新增 / 勾選 / 刪除 / 排序。
- 任務異動歷程。
- 日曆檢視。
- 日曆快速完成。
- Excel 匯出。
- 數據圖表。
- 使用幫助與 FAQ。

這些功能多半可保留在產品方向中，但不應優先於任務 CRUD、計時、詳情、完成與刪除的穩定性。

## 4. members 正式化後處理

以下功能目前可以保守相容，使用現有 API members 或 mock fallback 讓任務流程不中斷，但不應在正式 members collection、lineUserId 對應、sourceKey 與權限規則穩定前深入實作。

- 建立任務指派執行者。
- 子任務指派。
- 複製 user id。
- 成員與任務關聯。

正式化前的原則：

- 任務系統不能因 members API 回傳空陣列或失敗而無法使用。
- 任務指派可以先保留文字欄位與相容欄位。
- 不要太早假設 mock member id 等同正式 LINE userId。
- 不要在 members collection 尚未穩定前擴張角色、群組與權限功能。

## 5. LIFF / LINE user scope 後處理

以下功能應在 LIFF / LINE user scope 穩定後再集中處理。

- LINE 重新登入。
- LINE profile 顯示。
- LINE 連動與隱私。
- 非 LINE WebView / 無 LIFF SDK 場景處理。
- LINE group / room scope 相關功能。

這個階段應先確認個人任務 scope、`user_${lineUserId}`、Access Code fallback 與 LINE Bot 任務資料不會互相混用。group / room scope 會牽涉可見性、權限與成員關係，應獨立規劃，不應混入 MVP 任務 CRUD 階段。

## 6. 暫不處理 / 未來版本功能

以下功能目前不屬於主線 MVP。可以保留為 mock / demo / future UI，但應明確標示，不應在目前階段直接擴大實作。

- Chat AI 智慧助手。
- Chat 本地任務摘要。
- Google Sheets 同步。
- Dashboard 成員管理。
- Dashboard 角色切換。
- 群組切換 UI。
- 推播通知管理。
- 外觀樣式切換。
- 本機測試登入。

這些功能分別牽涉 AI 後端 proxy、同步策略、正式 members collection、權限模型、LINE group / room scope、排程推播、偏好設定與開發模式管理。若同時與 MVP 任務流程一起推進，容易造成範圍膨脹與資料模型混亂。

## 7. 需要產品決策的項目

以下項目在進一步實作前需要產品決策。

- 任務卡 play icon 是否直接啟動計時，或只是進入任務詳情。
- 任務完成成功畫面是否能宣稱「同步通知已發出」。
- Chat 頁是否保留在目前版本。
- Dashboard 是否是正式後台。
- 群組切換是否一定要支援 LINE group / room scope。
- Settings 頭像 edit icon 是否需要正式 profile 編輯功能。

這些項目如果沒有先決策，後續容易出現 UI 已存在但功能語意不清，或前端先行實作後又被正式資料模型推翻的情況。

## 8. 開發原則

- 不要因為 UI 已存在就直接實作大功能。
- 先確認功能階段，再決定是否實作。
- mock / demo / future 功能要明確標記。
- MVP 優先穩定任務 CRUD、計時、詳情、完成與刪除。
- members、LIFF、Dashboard、Chat、Google Sheets 不要混在同一階段一起做。

