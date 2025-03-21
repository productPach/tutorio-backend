const cron = require("node-cron");
const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const fs = require("fs").promises;

// Удаление пользователей с истекшим сроком удаления (каждый день в 00:00)
const deleteExpiredUsers = () => {
  cron.schedule("00 11 * * *", async () => {
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
          // Перед удалением репетитора удаляем связанные файлы дипломов
          const educations = await prisma.tutorEducation.findMany({
            where: { tutor: { userId } },
          });

          await Promise.all(
            educations.flatMap((education) =>
              education.educationDiplomUrl.map(async (url) => {
                const fileName = path.basename(url);
                const filePath = path.resolve("uploads/diplomas", fileName);
                try {
                  await fs.unlink(filePath); // Асинхронное удаление файла диплома
                  console.log(`🗑 Удалён файл диплома: ${filePath}`);
                } catch (error) {
                  console.error(
                    `❌ Ошибка при удалении файла диплома ${filePath}:`,
                    error
                  );
                }
              })
            )
          );

          // Удаление аватара репетитора (если есть)
          const tutor = await prisma.tutor.findUnique({
            where: { userId },
          });

          if (tutor && tutor.avatarUrl) {
            const avatarPath = path.resolve(
              "uploads",
              tutor.avatarUrl.replace(/^\/uploads\//, "") // Убираем `/uploads/` из пути
            );
            try {
              await fs.unlink(avatarPath);
              console.log(`🗑 Удалён файл аватара: ${avatarPath}`);
            } catch (error) {
              console.error(
                `❌ Ошибка при удалении файла аватара ${avatarPath}:`,
                error
              );
            }
          }

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
