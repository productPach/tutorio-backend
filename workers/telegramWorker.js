const { Worker } = require("bullmq");
const axios = require("axios");
const { connection } = require("../queue/redis");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

const worker = new Worker(
  "telegramQueue",
  async (job) => {
    const { telegramId, message, parse_mode, disable_web_page_preview } =
      job.data;

    try {
      await axios.post(TELEGRAM_API, {
        chat_id: telegramId,
        text: message,
        parse_mode: parse_mode || "HTML",
        disable_web_page_preview: disable_web_page_preview ?? true,
      });

      console.log(`✅ Telegram уведомление отправлено: ${telegramId}`);
    } catch (err) {
      console.error(
        `❌ Ошибка при отправке ${telegramId}:`,
        err.response?.data || err.message
      );
      throw err; // чтобы BullMQ сделал retry
    }

    // задержка для ограничения частоты
    await new Promise((r) => setTimeout(r, 200)); // 25 msg/sec
  },
  {
    connection,
    concurrency: 5, // до 5 сообщений параллельно
  }
);

worker.on("failed", (job, err) => {
  console.error(`🔁 Задача ${job.id} не отправлена:`, err.message);
});

console.log("🚀 Telegram worker запущен");
