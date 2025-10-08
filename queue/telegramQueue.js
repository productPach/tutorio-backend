const { Queue } = require("bullmq");
const { connection } = require("./redis");

const telegramQueue = new Queue("telegramQueue", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 1000, // очищаем старые задачи
    attempts: 3, // до 3 попыток при сбое
    backoff: { type: "exponential", delay: 5000 }, // экспоненциальная задержка между попытками
  },
});

module.exports = { telegramQueue };
