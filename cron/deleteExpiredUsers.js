const cron = require("node-cron");
const { prisma } = require("../prisma/prisma-client");

// Удаление пользователей с истекшим сроком удаления (каждый день в 00:00)
const deleteExpiredUsers = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log(
      "🔄 Запуск cron-задачи по удалению учеников и репетиторов с истекщим сроком запроса..."
    );

    try {
      const now = new Date();

      // Находим запросы на удаление, срок которых истёк
      const expiredRequests = await prisma.deletedRequest.findMany({
        where: {
          expiresAt: { lte: now },
        },
      });

      for (const request of expiredRequests) {
        const { userId, student, tutor } = request;

        if (student) {
          await prisma.student.delete({ where: { userId } });
          console.log(`✅ Удалён студент с userId: ${userId}`);
        } else if (tutor) {
          await prisma.tutor.delete({ where: { userId } });
          console.log(`✅ Удалён репетитор с userId: ${userId}`);
        }

        // Проверяем, осталась ли у пользователя другая роль
        // const hasStudent = await prisma.student.findUnique({ where: { userId } });
        // const hasTutor = await prisma.tutor.findUnique({ where: { userId } });

        // if (!hasStudent && !hasTutor) {
        //   await prisma.user.delete({ where: { id: userId } });
        //   console.log(`✅ Удалён пользователь ${userId}, так как у него не осталось ролей`);
        // }

        // // Удаляем запись из DeletedRequest
        // await prisma.deletedRequest.delete({ where: { userId } });
        // console.log(`🗑 Удалён запрос на удаление для userId: ${userId}`);
      }

      console.log("✅ Завершение cron-задачи.");
    } catch (error) {
      console.error("❌ Ошибка при удалении пользователей:", error);
    }
  });
};

module.exports = deleteExpiredUsers;
