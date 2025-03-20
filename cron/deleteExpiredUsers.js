const cron = require("node-cron");
const { prisma } = require("../prisma/prisma-client");

// Удаление пользователей с истекшим сроком удаления (каждый день в 00:00)
const deleteExpiredUsers = () => {
  cron.schedule("10 21 * * *", async () => {
    console.log("🔄 Запуск cron-задачи по удалению учеников и репетиторов...");

    try {
      const nowUtc = new Date().toISOString(); // Приводим к UTC в формате ISO

      // Находим запросы на удаление, срок которых истёк
      const expiredRequests = await prisma.deletedRequest.findMany({
        where: { expiresAt: { lte: nowUtc } },
      });

      console.log("Текущее UTC время:", nowUtc);
      console.log("Найденные запросы:", expiredRequests);

      for (const request of expiredRequests) {
        const { userId, role } = request;

        if (role === "student") {
          await prisma.student.deleteMany({ where: { userId } });
          console.log(`✅ Удалён студент с userId: ${userId}`);
        } else if (role === "tutor") {
          await prisma.tutor.deleteMany({ where: { userId } });
          console.log(`✅ Удалён репетитор с userId: ${userId}`);
        }

        // Проверяем, осталась ли у пользователя другая роль
        //   const hasStudent = await prisma.student.findFirst({ where: { userId } });
        //   const hasTutor = await prisma.tutor.findFirst({ where: { userId } });

        //   if (!hasStudent && !hasTutor) {
        //     await prisma.user.delete({ where: { id: userId } });
        //     console.log(`✅ Удалён пользователь ${userId}, так как у него не осталось ролей`);
        //   }

        // Удаляем только **конкретный** запрос на удаление (по userId и role)
        // await prisma.deletedRequest.delete({
        //   where: { userId_role: { userId, role } },
        // });
        // console.log(
        //   `🗑 Удалён запрос на удаление для userId: ${userId}, role: ${role}`
        // );
      }

      console.log("✅ Завершение cron-задачи.");
    } catch (error) {
      console.error("❌ Ошибка при удалении пользователей:", error);
    }
  });
};

module.exports = deleteExpiredUsers;
