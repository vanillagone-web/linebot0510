import "dotenv/config"
import express from "express"
import { Client, middleware } from "@line/bot-sdk"

const app = express()

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

const tasks = []
let nextTaskId = 1

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
  const replyText = handleTextCommand(text)

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

function addTask(content) {
  if (!content) {
    return `請輸入任務內容。

範例：
新增 買牛奶`
  }

  const task = {
    id: nextTaskId,
    content,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  }

  tasks.push(task)
  nextTaskId += 1

  return `已新增任務 #${task.id}
${task.content}`
}

function listTasks() {
  const activeTasks = tasks.filter((task) => !task.completed)

  if (activeTasks.length === 0) {
    return `目前沒有未完成任務。

輸入「新增 任務內容」來建立第一個任務。`
  }

  const visibleTasks = activeTasks.slice(0, 20)
  const taskLines = visibleTasks.map((task) => `#${task.id} ${task.content}`).join("\n")
  const limitText = activeTasks.length > 20 ? "\n\n僅顯示前 20 筆未完成任務。" : ""

  return `目前未完成任務：

${taskLines}${limitText}

輸入「完成 1」可完成任務。`
}

function completeTask(idText) {
  const id = parseTaskId(idText)

  if (!id) {
    return `請輸入有效的任務編號。

範例：
完成 1`
  }

  const task = tasks.find((item) => item.id === id && !item.completed)

  if (!task) {
    return `找不到未完成任務 #${id}。

請輸入「任務」查看目前未完成任務。`
  }

  task.completed = true
  task.completedAt = new Date().toISOString()

  return `已完成任務 #${task.id}
${task.content}`
}

function deleteTask(idText) {
  const id = parseTaskId(idText)

  if (!id) {
    return `請輸入有效的任務編號。

範例：
刪除 1`
  }

  const taskIndex = tasks.findIndex((task) => task.id === id)

  if (taskIndex === -1) {
    return `找不到任務 #${id}。

請輸入「任務」查看目前未完成任務。`
  }

  const [task] = tasks.splice(taskIndex, 1)

  return `已刪除任務 #${task.id}
${task.content}`
}

function handleTextCommand(text) {
  if (text === "說明") {
    return getHelpText()
  }

  if (text === "任務" || text === "查看任務") {
    return listTasks()
  }

  if (text.startsWith("新增 ")) {
    const content = text.slice("新增 ".length).trim()
    return addTask(content)
  }

  if (text.startsWith("完成 ")) {
    const idText = text.slice("完成 ".length).trim()
    return completeTask(idText)
  }

  if (text.startsWith("刪除 ")) {
    const idText = text.slice("刪除 ".length).trim()
    return deleteTask(idText)
  }

  return `我目前看不懂這個指令。

輸入「說明」查看可用指令。`
}

//  Cloud Run 必須這樣寫
const PORT = process.env.PORT || 8080

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})
