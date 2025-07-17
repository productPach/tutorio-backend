const axios = require("axios");
const cron = require("node-cron");
const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const fs = require("fs").promises;
const MAILOPOST_API_URL = "https://api.mailopost.ru/v1";
const API_TOKEN = "bc45c119ceb875aaa808ef2ee561c5d9";

// Удаление пользователей с истекшим сроком удаления (каждый день в 00:00)
const deleteExpiredUsers = () => {
  cron.schedule("22 17 * * *", async () => {
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
        let email;

        if (role === "student") {
          if (!userId) {
            console.error(
              "⚠️ userId is null или undefined, пропускаем текущую запись."
            );
            continue; // Пропускаем текущую запись
          }

          const student = await prisma.student.findUnique({
            where: { userId },
          });
          if (student) {
            email = student.email; // Получаем email студента
            // Сделать удаление заказов и откликов!!!
            await prisma.student.deleteMany({ where: { userId } });
            console.log(`✅ Удалён студент с userId: ${userId}`);
          }
        } else if (role === "tutor") {
          if (!userId) {
            console.error(
              "⚠️ userId is null или undefined, пропускаем текущую запись."
            );
            continue; // Пропускаем только текущую запись и продолжаем обработку остальных
          }

          const tutor = await prisma.tutor.findUnique({ where: { userId } });
          if (tutor) {
            email = tutor.email; // Получаем email репетитора
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
                    await fs.unlink(filePath).catch((err) => {
                      if (err.code === "ENOENT") {
                        console.log(
                          `⚠️ Файл диплома уже отсутствует: ${filePath}`
                        );
                      } else {
                        console.error(
                          `❌ Ошибка при удалении файла диплома: ${filePath}`,
                          err
                        );
                      }
                    });
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

            if (tutor && tutor.avatarUrl) {
              const avatarPath = path.resolve(
                "uploads",
                tutor.avatarUrl.replace(/^\/uploads\//, "") // Убираем `/uploads/` из пути
              );
              try {
                await fs.unlink(avatarPath).catch((err) => {
                  if (err.code === "ENOENT") {
                    console.log(
                      `⚠️ Файл аватара уже отсутствует: ${avatarPath}`
                    );
                  } else {
                    console.error(
                      `❌ Ошибка при удалении файла аватара: ${avatarPath}`,
                      err
                    );
                  }
                });
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
        }

        if (email) {
          // Отправка уведомления о подтверждённом удалении
          try {
            const response = await axios.post(
              `${MAILOPOST_API_URL}/email/templates/1464084/messages`, // ID шаблона письма о подтверждённом удалении
              {
                to: email,
              },
              {
                headers: {
                  Authorization: `Bearer ${API_TOKEN}`, // Замена на реальный API токен
                  "Content-Type": "application/json",
                },
              }
            );
            console.log(
              `📧 Письмо об удалении отправлено на ${email}, статус: ${response.status}`
            );
          } catch (error) {
            console.error(
              `❌ Ошибка при отправке письма об удалении на ${email}:`,
              error
            );
          }
        }

        // Проверяем, осталась ли у пользователя другая роль
        const hasStudent = await prisma.student.findFirst({
          where: { userId },
        });
        const hasTutor = await prisma.tutor.findFirst({ where: { userId } });

        if (!hasStudent && !hasTutor) {
          await prisma.user.delete({ where: { id: userId } });
          console.log(
            `✅ Удалён пользователь ${userId}, так как у него не осталось ролей`
          );
        }

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
