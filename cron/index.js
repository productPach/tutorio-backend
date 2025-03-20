const deleteExpiredUsers = require("./deleteExpiredUsers");
// const someOtherCron = require("./someOtherCron"); // Можно добавить другие задачи

const startCrons = () => {
  console.log("⏳ Запуск всех крон-задач...");
  deleteExpiredUsers();
  // someOtherCron();
  console.log("✅ Все крон-задачи запущены.");
};

module.exports = startCrons;
