import "dotenv/config"
import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import { Client, middleware } from "@line/bot-sdk"
import { initializeApp, getApps } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, "dist")
const FIRESTORE_DATABASE_ID = "line-todo-bot"
const firebaseApp = getApps().length === 0 ? initializeApp() : getApps()[0]
const db = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID)
const WEB_SCOPE = {
  sourceType: "web",
  sourceId: "default",
  sourceKey: "web_default",
  userId: null,
  groupId: null,
  roomId: null,
  createdBy: "web_default"
}
const ALLOWED_TASK_UPDATE_FIELDS = new Set([
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
  "assignee",
  "department",
  "reminders",
  "color",
  "tags",
  "notes",
  "subTasks",
  "actualHours",
  "history"
])
const VALID_TASK_STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"])
const VALID_TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"])

class ValidationError extends Error {}
class ConfigurationError extends Error {}

// ===== 讀取環境變數 =====
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
}

if (!config.channelAccessToken || !config.channelSecret) {
  console.error("Missing LINE environment variables")
  process.exit(1)
}

const client = new Client(config)

// ===== Webhook =====
app.post("/webhook", middleware(config), async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : []

    if (events.length === 0) {
      return res.status(200).send("OK")
    }

    await Promise.allSettled(events.map(handleEvent))
    res.status(200).send("OK")
  } catch (err) {
    console.error(err)
    res.status(500).end()
  }
})

app.use("/api", express.json())

app.post("/api/auth/line", async (req, res) => {
  try {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : ""

    if (!idToken) {
      return res.status(400).json({
        ok: false,
        error: "idToken is required"
      })
    }

    const verifiedToken = await verifyLineIdToken(idToken)
    const lineUserId = verifiedToken.sub

    res.status(200).json({
      ok: true,
      user: {
        lineUserId,
        displayName: verifiedToken.name || "",
        pictureUrl: verifiedToken.picture || ""
      },
      scope: {
        sourceType: "user",
        sourceId: lineUserId,
        sourceKey: `user_${lineUserId}`,
        createdBy: lineUserId
      }
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(401).json({
        ok: false,
        error: "LINE idToken 驗證失敗"
      })
    }

    if (err instanceof ConfigurationError) {
      return res.status(500).json({
        ok: false,
        error: err.message
      })
    }

    console.error("LINE auth failed", {
      message: err?.message,
      status: err?.status
    })
    res.status(500).json({
      ok: false,
      error: "LINE 登入驗證暫時發生問題，請稍後再試。"
    })
  }
})

app.use("/api/tasks", resolveTaskScope)

app.get("/api/tasks", async (req, res) => {
  try {
    const scope = req.taskScope
    const snapshot = await db.collection("tasks")
      .where("sourceKey", "==", scope.sourceKey)
      .where("deletedAt", "==", null)
      .orderBy("lineTaskNo", "asc")
      .get()

    const tasks = snapshot.docs.map(firestoreTaskToReactTask)
    res.status(200).json({ ok: true, tasks })
  } catch (err) {
    console.error("API get tasks failed", err)
    res.status(500).json({
      ok: false,
      error: "任務系統暫時發生問題，請稍後再試。"
    })
  }
})

app.post("/api/tasks", async (req, res) => {
  try {
    const scope = req.taskScope
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : ""

    if (!title) {
      return res.status(400).json({
        ok: false,
        error: "title is required"
      })
    }

    const taskRef = db.collection("tasks").doc()
    let lineTaskNo = 1

    await db.runTransaction(async (transaction) => {
      lineTaskNo = await getNextTaskNoForScope(transaction, scope)
      transaction.set(taskRef, createWebTaskDocument({ ...req.body, title }, lineTaskNo, scope))
    })

    const taskSnapshot = await taskRef.get()
    res.status(201).json({
      ok: true,
      task: firestoreTaskToReactTask(taskSnapshot)
    })
  } catch (err) {
    console.error("API create task failed", err)
    res.status(500).json({
      ok: false,
      error: "任務系統暫時發生問題，請稍後再試。"
    })
  }
})

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const scope = req.taskScope
    const taskRef = db.collection("tasks").doc(req.params.id)
    const taskSnapshot = await taskRef.get()

    if (!taskSnapshot.exists) {
      return res.status(404).json({
        ok: false,
        error: "找不到任務"
      })
    }

    const currentTask = taskSnapshot.data()

    if (currentTask.sourceKey !== scope.sourceKey || currentTask.deletedAt != null) {
      return res.status(404).json({
        ok: false,
        error: "找不到任務"
      })
    }

    const updatePayload = buildTaskUpdatePayload(req.body, currentTask)

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        ok: false,
        error: "沒有可更新的欄位"
      })
    }

    updatePayload.updatedAt = FieldValue.serverTimestamp()

    await taskRef.update(updatePayload)

    const updatedSnapshot = await taskRef.get()
    res.status(200).json({
      ok: true,
      task: firestoreTaskToReactTask(updatedSnapshot)
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        ok: false,
        error: err.message
      })
    }

    console.error("API update task failed", err)
    res.status(500).json({
      ok: false,
      error: "任務系統暫時發生問題，請稍後再試。"
    })
  }
})

app.patch("/api/tasks/:id/complete", async (req, res) => {
  try {
    const scope = req.taskScope
    const taskRef = db.collection("tasks").doc(req.params.id)
    const taskSnapshot = await taskRef.get()
    const task = taskSnapshot.exists ? taskSnapshot.data() : null

    if (!taskSnapshot.exists || task.sourceKey !== scope.sourceKey || task.deletedAt != null) {
      return res.status(404).json({
        ok: false,
        error: "找不到任務"
      })
    }

    await taskRef.update({
      completed: true,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: "COMPLETED"
    })

    const updatedSnapshot = await taskRef.get()
    res.status(200).json({
      ok: true,
      task: firestoreTaskToReactTask(updatedSnapshot)
    })
  } catch (err) {
    console.error("API complete task failed", err)
    res.status(500).json({
      ok: false,
      error: "任務系統暫時發生問題，請稍後再試。"
    })
  }
})

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const scope = req.taskScope
    const taskRef = db.collection("tasks").doc(req.params.id)
    const taskSnapshot = await taskRef.get()
    const task = taskSnapshot.exists ? taskSnapshot.data() : null

    if (!taskSnapshot.exists || task.sourceKey !== scope.sourceKey || task.deletedAt != null) {
      return res.status(404).json({
        ok: false,
        error: "找不到任務"
      })
    }

    await taskRef.update({
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error("API delete task failed", err)
    res.status(500).json({
      ok: false,
      error: "任務系統暫時發生問題，請稍後再試。"
    })
  }
})

// ===== 健康檢查 =====
app.get("/healthz", (req, res) => {
  res.status(200).send("Service running")
})

app.use(express.static(distPath))

app.use((req, res, next) => {
  if (req.method !== "GET") {
    return next()
  }

  if (
    req.path.startsWith("/api") ||
    req.path === "/webhook" ||
    req.path === "/healthz"
  ) {
    return next()
  }

  res.sendFile(path.join(distPath, "index.html"))
})

function getBearerToken(req) {
  const authorization = req.get("Authorization") || ""
  const prefix = "Bearer "

  if (!authorization.startsWith(prefix)) {
    return ""
  }

  return authorization.slice(prefix.length).trim()
}

function createLineUserScope(lineUserId) {
  return {
    sourceType: "user",
    sourceId: lineUserId,
    sourceKey: `user_${lineUserId}`,
    userId: lineUserId,
    groupId: null,
    roomId: null,
    createdBy: lineUserId
  }
}

async function resolveTaskScope(req, res, next) {
  const bearerToken = getBearerToken(req)

  if (bearerToken) {
    try {
      const verifiedToken = await verifyLineIdToken(bearerToken)
      req.taskScope = createLineUserScope(verifiedToken.sub)
      return next()
    } catch (err) {
      if (err instanceof ConfigurationError) {
        return res.status(500).json({
          ok: false,
          error: err.message
        })
      }

      return res.status(401).json({
        ok: false,
        error: "LINE idToken 驗證失敗"
      })
    }
  }

  const expectedCode = process.env.WEB_ACCESS_CODE

  if (!expectedCode) {
    console.error("WEB_ACCESS_CODE is not configured")
    return res.status(500).json({
      ok: false,
      error: "WEB_ACCESS_CODE is not configured"
    })
  }

  const providedCode = req.get("X-Web-Access-Code")

  if (providedCode !== expectedCode) {
    return res.status(401).json({
      ok: false,
      error: "未授權，請輸入正確的 access code。"
    })
  }

  req.taskScope = WEB_SCOPE
  next()
}

async function verifyLineIdToken(idToken) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID

  if (!channelId) {
    throw new ConfigurationError("LINE_LOGIN_CHANNEL_ID is not configured")
  }

  const body = new URLSearchParams({
    id_token: idToken,
    client_id: channelId
  })

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  })

  if (!response.ok) {
    console.error("LINE idToken verify failed", {
      status: response.status
    })
    throw new ValidationError("LINE idToken verify failed")
  }

  const data = await response.json()

  if (!data.sub || data.aud !== channelId) {
    console.error("LINE idToken payload invalid", {
      hasSub: Boolean(data.sub),
      audMatches: data.aud === channelId
    })
    throw new ValidationError("LINE idToken payload invalid")
  }

  return data
}

function formatTimestamp(value) {
  if (!value) return ""
  if (typeof value.toDate === "function") return value.toDate().toLocaleString()
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function firestoreTaskToReactTask(doc) {
  const data = doc.data()

  return {
    id: doc.id,
    groupId: data.groupId || data.sourceKey || WEB_SCOPE.sourceKey,
    ticketNo: data.ticketNo || `WEB-${data.lineTaskNo || doc.id}`,
    title: data.title || data.content || "",
    description: data.description || "",
    status: data.status || (data.completed ? "COMPLETED" : "PENDING"),
    priority: data.priority || "MEDIUM",
    dueDate: data.dueDate || "",
    assignee: data.assignee || "Web User",
    department: data.department || "",
    reminders: Array.isArray(data.reminders) ? data.reminders : [],
    createdBy: data.createdBy || data.userId || WEB_SCOPE.createdBy,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
    color: data.color || "#17cfcf",
    tags: Array.isArray(data.tags) ? data.tags : [],
    notes: data.notes || "",
    subTasks: Array.isArray(data.subTasks) ? data.subTasks : [],
    lineTaskNo: data.lineTaskNo,
    sourceKey: data.sourceKey
  }
}

function createWebTaskDocument(payload, lineTaskNo, scope = WEB_SCOPE) {
  const allowedPriorities = new Set(["LOW", "MEDIUM", "HIGH"])
  const priority = allowedPriorities.has(payload.priority) ? payload.priority : "MEDIUM"
  const assignee = typeof payload.assignee === "string" && payload.assignee.trim()
    ? payload.assignee.trim()
    : "Web User"
  const description = typeof payload.description === "string" ? payload.description.trim() : ""
  const dueDate = typeof payload.dueDate === "string" ? payload.dueDate.trim() : ""

  return {
    content: payload.title,
    title: payload.title,
    description,
    completed: false,
    status: "PENDING",
    priority,
    dueDate,
    assignee,
    department: "",
    reminders: [],
    completedAt: null,
    deletedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lineTaskNo,
    sourceType: scope.sourceType,
    sourceId: scope.sourceId,
    sourceKey: scope.sourceKey,
    userId: scope.userId,
    groupId: scope.groupId,
    roomId: scope.roomId,
    createdBy: scope.createdBy,
    color: "#17cfcf",
    tags: [],
    notes: "",
    subTasks: []
  }
}

function assertStringField(value, field) {
  if (typeof value !== "string") {
    throw new ValidationError(`invalid field: ${field}`)
  }
  return value
}

function assertArrayField(value, field) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`invalid field: ${field}`)
  }
  return value
}

function buildTaskUpdatePayload(body, currentTask) {
  const updatePayload = {}

  for (const [field, value] of Object.entries(body || {})) {
    if (!ALLOWED_TASK_UPDATE_FIELDS.has(field)) {
      continue
    }

    if (field === "title") {
      const title = assertStringField(value, field).trim()
      if (!title) {
        throw new ValidationError("invalid field: title")
      }
      updatePayload.title = title
      updatePayload.content = title
      continue
    }

    if (["description", "dueDate", "assignee", "department", "color", "notes"].includes(field)) {
      updatePayload[field] = assertStringField(value, field)
      continue
    }

    if (field === "status") {
      const status = assertStringField(value, field)
      if (!VALID_TASK_STATUSES.has(status)) {
        throw new ValidationError("invalid field: status")
      }
      updatePayload.status = status
      continue
    }

    if (field === "priority") {
      const priority = assertStringField(value, field)
      if (!VALID_TASK_PRIORITIES.has(priority)) {
        throw new ValidationError("invalid field: priority")
      }
      updatePayload.priority = priority
      continue
    }

    if (["reminders", "tags", "subTasks", "history"].includes(field)) {
      updatePayload[field] = assertArrayField(value, field)
      continue
    }

    if (field === "actualHours") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new ValidationError("invalid field: actualHours")
      }
      updatePayload.actualHours = value
    }
  }

  if (updatePayload.status === "COMPLETED") {
    updatePayload.completed = true
    if (!currentTask.completedAt) {
      updatePayload.completedAt = FieldValue.serverTimestamp()
    }
  } else if (["PENDING", "IN_PROGRESS", "OVERDUE"].includes(updatePayload.status)) {
    updatePayload.completed = false
    updatePayload.completedAt = null
  }

  return updatePayload
}

async function getNextTaskNoForScope(transaction, scope) {
  const counterRef = db.collection("taskCounters").doc(scope.sourceKey)
  const counterSnapshot = await transaction.get(counterRef)
  const lineTaskNo = counterSnapshot.exists ? counterSnapshot.data().nextTaskNo : 1

  transaction.set(counterRef, {
    sourceType: scope.sourceType,
    sourceId: scope.sourceId,
    nextTaskNo: lineTaskNo + 1,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true })

  return lineTaskNo
}

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null
  }

  const text = event.message.text.trim()
  const scope = getSourceScope(event)
  const replyText = await handleTextCommand(text, scope)

  try {
    return await client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText
    })
  } catch (err) {
    console.error("LINE replyMessage failed", {
      message: err.message,
      status: err.status || err.response?.status,
      data: err.response?.data
    })
    return null
  }
}

function getSourceScope(event) {
  const source = event.source || {}

  if (source.type === "group") {
    return {
      sourceType: "group",
      sourceId: source.groupId,
      sourceKey: `group_${source.groupId}`,
      userId: source.userId || null,
      groupId: source.groupId,
      roomId: null,
      createdBy: source.userId || null
    }
  }

  if (source.type === "room") {
    return {
      sourceType: "room",
      sourceId: source.roomId,
      sourceKey: `room_${source.roomId}`,
      userId: source.userId || null,
      groupId: null,
      roomId: source.roomId,
      createdBy: source.userId || null
    }
  }

  return {
    sourceType: "user",
    sourceId: source.userId,
    sourceKey: `user_${source.userId}`,
    userId: source.userId || null,
    groupId: null,
    roomId: null,
    createdBy: source.userId || null
  }
}

function getHelpText() {
  return `可用指令：

新增 任務內容
任務
查看任務
完成 任務編號
刪除 任務編號
說明`
}

function getLiffTaskLinkText(scope) {
  const liffUrl = process.env.LIFF_URL

  if (!liffUrl) {
    return ""
  }

  if (!scope || scope.sourceType !== "user") {
    return ""
  }

  return `

開啟任務管理頁：
${liffUrl}`
}

function parseTaskId(idText) {
  const id = Number(idText)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function addTask(content, scope) {
  if (!content) {
    return `請輸入任務內容。

範例：
新增 買牛奶`
  }

  try {
    const taskRef = db.collection("tasks").doc()
    let lineTaskNo = 1

    await db.runTransaction(async (transaction) => {
      const counterRef = db.collection("taskCounters").doc(scope.sourceKey)
      const counterSnapshot = await transaction.get(counterRef)
      lineTaskNo = counterSnapshot.exists ? counterSnapshot.data().nextTaskNo : 1
      const nextTaskNo = lineTaskNo + 1

      transaction.set(counterRef, {
        sourceType: scope.sourceType,
        sourceId: scope.sourceId,
        nextTaskNo,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true })

      transaction.set(taskRef, {
        content,
        completed: false,
        createdAt: FieldValue.serverTimestamp(),
        completedAt: null,
        deletedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
        lineTaskNo,
        sourceType: scope.sourceType,
        sourceId: scope.sourceId,
        sourceKey: scope.sourceKey,
        userId: scope.userId,
        groupId: scope.groupId,
        roomId: scope.roomId,
        createdBy: scope.createdBy
      })
    })

    return `已新增任務 #${lineTaskNo}
${content}`
  } catch (err) {
    console.error("Firestore addTask failed", err)
    return "任務系統暫時發生問題，請稍後再試。"
  }
}

async function listTasks(scope) {
  try {
    const snapshot = await db.collection("tasks")
      .where("sourceKey", "==", scope.sourceKey)
      .where("completed", "==", false)
      .where("deletedAt", "==", null)
      .orderBy("lineTaskNo", "asc")
      .limit(21)
      .get()

    const activeTasks = snapshot.docs.map((doc) => doc.data())

    if (activeTasks.length === 0) {
      return `目前沒有未完成任務。

輸入「新增 任務內容」來建立第一個任務。${getLiffTaskLinkText(scope)}`
    }

    const visibleTasks = activeTasks.slice(0, 20)
    const taskLines = visibleTasks.map((task) => `#${task.lineTaskNo} ${task.content}`).join("\n")
    const limitText = activeTasks.length > 20 ? "\n\n僅顯示前 20 筆未完成任務。" : ""

    return `目前未完成任務：

${taskLines}${limitText}

輸入「完成 1」可完成任務。${getLiffTaskLinkText(scope)}`
  } catch (err) {
    console.error("Firestore listTasks failed", err)
    return "任務系統暫時發生問題，請稍後再試。"
  }
}

async function completeTask(idText, scope) {
  const id = parseTaskId(idText)

  if (!id) {
    return `請輸入有效的任務編號。

範例：
完成 1`
  }

  try {
    const snapshot = await db.collection("tasks")
      .where("sourceKey", "==", scope.sourceKey)
      .where("lineTaskNo", "==", id)
      .where("deletedAt", "==", null)
      .where("completed", "==", false)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return `找不到未完成任務 #${id}。

請輸入「任務」查看目前未完成任務。`
    }

    const taskDoc = snapshot.docs[0]
    const task = taskDoc.data()

    await taskDoc.ref.update({
      completed: true,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return `已完成任務 #${task.lineTaskNo}
${task.content}`
  } catch (err) {
    console.error("Firestore completeTask failed", err)
    return "任務系統暫時發生問題，請稍後再試。"
  }
}

async function deleteTask(idText, scope) {
  const id = parseTaskId(idText)

  if (!id) {
    return `請輸入有效的任務編號。

範例：
刪除 1`
  }

  try {
    const snapshot = await db.collection("tasks")
      .where("sourceKey", "==", scope.sourceKey)
      .where("lineTaskNo", "==", id)
      .where("deletedAt", "==", null)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return `找不到任務 #${id}。

請輸入「任務」查看目前未完成任務。`
    }

    const taskDoc = snapshot.docs[0]
    const task = taskDoc.data()

    await taskDoc.ref.update({
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return `已刪除任務 #${task.lineTaskNo}
${task.content}`
  } catch (err) {
    console.error("Firestore deleteTask failed", err)
    return "任務系統暫時發生問題，請稍後再試。"
  }
}

async function handleTextCommand(text, scope) {
  if (text === "說明") {
    return getHelpText()
  }

  if (text === "任務" || text === "查看任務") {
    return await listTasks(scope)
  }

  if (text.startsWith("新增 ")) {
    const content = text.slice("新增 ".length).trim()
    return await addTask(content, scope)
  }

  if (text.startsWith("完成 ")) {
    const idText = text.slice("完成 ".length).trim()
    return await completeTask(idText, scope)
  }

  if (text.startsWith("刪除 ")) {
    const idText = text.slice("刪除 ".length).trim()
    return await deleteTask(idText, scope)
  }

  return `我目前看不懂這個指令。

輸入「說明」查看可用指令。`
}

//  Cloud Run 必須這樣寫
const PORT = process.env.PORT || 8080

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})
