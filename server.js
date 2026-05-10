import express from "express"
import line from "@line/bot-sdk"

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

const client = new line.Client(config)

// ===== Webhook =====
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent))
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

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `你說了：${event.message.text}`
  })
}

//  Cloud Run 必須這樣寫
const PORT = process.env.PORT || 8080

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})
