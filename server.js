import "dotenv/config"
import express from "express"
import { Client, middleware } from "@line/bot-sdk"
import { initializeApp, getApps } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

const app = express()
const FIRESTORE_DATABASE_ID = "line-todo-bot"
const firebaseApp = getApps().length === 0 ? initializeApp() : getApps()[0]
const db = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID)

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

// ===== 健康檢查 =====
app.get("/", (req, res) => {
  res.status(200).send("Service running")
})

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

輸入「新增 任務內容」來建立第一個任務。`
    }

    const visibleTasks = activeTasks.slice(0, 20)
    const taskLines = visibleTasks.map((task) => `#${task.lineTaskNo} ${task.content}`).join("\n")
    const limitText = activeTasks.length > 20 ? "\n\n僅顯示前 20 筆未完成任務。" : ""

    return `目前未完成任務：

${taskLines}${limitText}

輸入「完成 1」可完成任務。`
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
