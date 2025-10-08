const { Redis } = require("ioredis");

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // ⬅️ обязательно для BullMQ
  enableReadyCheck: false, // ⬅️ безопасно для воркеров
});

connection.on("connect", () => console.log("Redis подключён"));
connection.on("error", (err) => console.error("Ошибка Redis:", err));

module.exports = { connection };
