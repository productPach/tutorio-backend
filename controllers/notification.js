const { prisma } = require("../prisma/prisma-client");
const findTutorsForOrders = require("../services/findTutorsForOrder");
const enqueueTelegramNotification = require("../services/enqueueTelegramNotification");

const NotificationController = {
  // Генерация ссылки для подключения Telegram
  connectTelegram: async (req, res) => {
    const { tutorId } = req.body;

    if (!tutorId) {
      return res.status(400).json({ error: "ID репетитора обязателен" });
    }

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Если токен уже есть, используем его, иначе создаём новый
      const token = tutor.telegramConnectToken || crypto.randomUUID();

      if (!tutor.telegramConnectToken) {
        // Сохраняем новый токен в базе
        await prisma.tutor.update({
          where: { id: tutorId },
          data: { telegramConnectToken: token },
        });
      }

      // Формируем ссылку для бота
      const botUsername = process.env.TELEGRAM_BOT_USERNAME; // например, "YourBot"
      const link = `https://t.me/${botUsername}?start=${token}`;

      res.status(200).json({
        message: "Ссылка для подключения Telegram сгенерирована",
        link,
      });
    } catch (error) {
      console.error("Ошибка при генерации ссылки для Telegram:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Вебхук от Telegram
  telegramWebhook: async (req, res) => {
    const update = req.body;

    try {
      // Логируем все апдейты для дебага
      console.log("Telegram update received:", JSON.stringify(update, null, 2));

      // Определяем источник сообщения
      const message =
        update.message ||
        update.edited_message ||
        update.channel_post ||
        update.callback_query?.message;

      if (!message || !message.chat) {
        // Игнорируем апдейты без чата
        return res.status(200).json({ ok: true });
      }

      const chatId = message.chat.id;
      const text = message.text || "";

      // Проверяем команду /start <token>
      if (text.startsWith("/start ")) {
        const token = text.split(" ")[1];
        if (!token) {
          return res.status(400).json({ error: "Не передан токен" });
        }

        // Ищем репетитора по токену ИЛИ уже сохранённому Telegram ID
        const tutor = await prisma.tutor.findFirst({
          where: {
            OR: [
              { telegramConnectToken: token }, // новый токен из ссылки
              { telegramId: String(chatId) }, // уже привязанный Telegram ID
            ],
          },
        });

        if (!tutor) {
          return res
            .status(404)
            .json({ error: "Репетитор с таким токеном не найден" });
        }

        // Сохраняем Telegram ID (не обнуляем telegramConnectToken)
        await prisma.tutor.update({
          where: { id: tutor.id },
          data: { telegramId: String(chatId) },
        });

        // Отправляем подтверждение в Telegram
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "✅ Уведомления в Telegram подключены!",
            }),
          }
        );

        return res.status(200).json({ message: "Telegram ID сохранён" });
      }

      // Обработка других апдейтов можно добавить здесь
      return res.status(200).json({ message: "Апдейт Telegram обработан" });
    } catch (error) {
      console.error("Ошибка при обработке webhook:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Проверка подключения Telegram через webhook
  connectWebhook: async (req, res) => {
    const { tutorId } = req.body;

    if (!tutorId) {
      return res.status(400).json({ error: "ID репетитора обязателен" });
    }

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Если telegramId уже есть, возвращаем сразу 200
      if (tutor.telegramId) {
        return res.status(200).json({ message: "Telegram уже подключён" });
      }

      // Ждём обновления telegramId вебхуком
      const waitForTelegram = (timeout = 15000) => {
        const interval = 500; // проверка каждые 0.5с
        const start = Date.now();

        return new Promise((resolve) => {
          const check = async () => {
            const current = await prisma.tutor.findUnique({
              where: { id: tutorId },
            });
            if (current?.telegramId) return resolve(true);
            if (Date.now() - start > timeout) return resolve(false);
            setTimeout(check, interval);
          };
          check();
        });
      };

      const connected = await waitForTelegram();

      if (connected) {
        return res.status(200).json({ message: "Telegram успешно подключён" });
      } else {
        return res
          .status(408)
          .json({ error: "Превышено время ожидания подключения Telegram" });
      }
    } catch (error) {
      console.error("Ошибка при подключении Telegram:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // // Отправка уведомления репетитору в Telegram
  // sendTelegramNotification: async (req, res) => {
  //   const { tutorId, text, url } = req.body;

  //   if (!tutorId || !text) {
  //     return res
  //       .status(400)
  //       .json({ error: "ID репетитора и текст обязательны" });
  //   }

  //   try {
  //     // Ищем репетитора
  //     const tutor = await prisma.tutor.findUnique({
  //       where: { id: tutorId },
  //     });

  //     if (!tutor || !tutor.telegramId) {
  //       return res
  //         .status(404)
  //         .json({ error: "Репетитор не найден или Telegram не подключён" });
  //     }

  //     // Формируем сообщение
  //     const message = url ? `${text}\n${url}` : text;

  //     // Отправляем через Telegram API
  //     await fetch(
  //       `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           chat_id: tutor.telegramId,
  //           text: message,
  //           parse_mode: "HTML", // Можно менять на Markdown, если нужно
  //         }),
  //       }
  //     );

  //     res.status(200).json({ message: "Уведомление отправлено" });
  //   } catch (error) {
  //     console.error("Ошибка при отправке уведомления:", error);
  //     res.status(500).json({ error: "Внутренняя ошибка сервера" });
  //   }
  // },

  // Уведомления репетиторам по заказу (ниже новая версия, v2)
  // notifyTutorsForOrder: async (req, res) => {
  //   const { orderId } = req.params;
  //   const { sendTelegram = true, sendEmail = true } = req.body; // <-- флаги рассылки

  //   try {
  //     // Получаем заказ
  //     const order = await prisma.order.findUnique({
  //       where: { id: orderId },
  //       include: {
  //         goalRef: true,
  //       },
  //     });

  //     if (!order) {
  //       return res.status(404).json({ error: "Заказ не найден" });
  //     }

  //     const subject = await prisma.subject.findUnique({
  //       where: { id_p: order.subject },
  //       select: { for_request: true },
  //     });

  //     // Находим подходящих репетиторов
  //     const tutors = await findTutorsForOrders(order); // Функция поиска репетиторов по заказу

  //     // Статистика отправки
  //     let telegramSuccess = 0;
  //     let telegramFailed = 0;
  //     let emailSuccess = 0;
  //     let emailFailed = 0;

  //     for (const tutor of tutors) {
  //       // Telegram
  //       if (
  //         sendTelegram &&
  //         tutor.isNotifications &&
  //         tutor.isNotificationsOrders &&
  //         tutor.isNotificationsTelegram &&
  //         tutor.telegramId
  //       ) {
  //         try {
  //           await enqueueTelegramNotification(tutor, order, subject); // Функция добавления в очередь уведомлений Telegram
  //           telegramSuccess++;
  //         } catch (err) {
  //           console.error(`Ошибка Telegram для репетитора ${tutor.id}:`, err);
  //           telegramFailed++;
  //         }
  //       }

  //       // Email
  //       if (
  //         sendEmail &&
  //         tutor.isNotifications &&
  //         tutor.isNotificationsOrders &&
  //         tutor.isNotificationsEmail &&
  //         tutor.isVerifedEmail &&
  //         tutor.email
  //       ) {
  //         try {
  //           // Сделать массовую рассылку Email позже
  //           // await enqueueEmailNotification(tutor, order, subject.for_request); // Функция добавления в очередь уведомлений Email
  //           emailSuccess++;
  //         } catch (err) {
  //           console.error(`Ошибка Email для репетитора ${tutor.id}:`, err);
  //           emailFailed++;
  //         }
  //       }
  //     }

  //     const selectedTutors = tutors.map((t) => ({
  //       id: t.id,
  //       name: t.name ?? "",
  //       avatarUrl: t.avatarUrl ?? "",
  //       userRating: t.userRating,
  //       reviewsCount: t.reviewsCount,
  //     }));

  //     res.json({
  //       ...order,
  //       selectedTutors,
  //       notificationStats: {
  //         totalTutors: tutors.length,
  //         telegramSuccess,
  //         telegramFailed,
  //         emailSuccess,
  //         emailFailed,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("notifyTutorsForOrder Error", error);
  //     res.status(500).json({ error: "Internal server error" });
  //   }
  // },

  // Уведомления репетиторам по заказу, v2. Масштабируемая рассылка уведомлений репетиторам по заказу
  notifyTutorsForOrder: async (req, res) => {
    const { orderId } = req.params;
    const { sendTelegram = true, sendEmail = true } = req.body;

    try {
      // === 1️⃣ Получаем заказ ===
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { goalRef: true },
      });

      if (!order) return res.status(404).json({ error: "Заказ не найден" });

      const subject = await prisma.subject.findUnique({
        where: { id_p: order.subject },
        select: { for_request: true },
      });

      // === 2️⃣ Находим подходящих репетиторов ===
      const tutors = await findTutorsForOrders(order);

      // === 3️⃣ Добавляем задачи в очередь Telegram ===
      if (sendTelegram) {
        // Используем батчинг, чтобы не блокировать Node.js
        const batchSize = 200;
        for (let i = 0; i < tutors.length; i += batchSize) {
          const batch = tutors.slice(i, i + batchSize);
          batch.forEach((tutor) => {
            if (
              tutor.isNotifications &&
              tutor.isNotificationsOrders &&
              tutor.isNotificationsTelegram &&
              tutor.telegramId
            ) {
              // НЕ ждём результата — просто пушим в очередь
              enqueueTelegramNotification(tutor, order, subject).catch((err) =>
                console.error(
                  `Ошибка enqueue Telegram для репетитора ${tutor.id}:`,
                  err
                )
              );
            }
          });
        }
      }

      // === 4️⃣ Email (отправка аналогично) ===
      // Тут можно добавить отдельную очередь для email, без await
      // if (sendEmail) { ... }

      // === 5️⃣ Подготавливаем ответ ===
      const selectedTutors = tutors.map((t) => ({
        id: t.id,
        name: t.name ?? "",
        avatarUrl: t.avatarUrl ?? "",
        userRating: t.userRating,
        // reviewsCount: t.reviewsCount,
        totalRating: t.totalRating ?? 0,
      }));

      res.json({
        ...order,
        selectedTutors,
        notificationStats: {
          totalTutors: tutors.length,
          telegramQueued: sendTelegram ? tutors.length : 0,
          emailQueued: sendEmail ? tutors.length : 0,
        },
      });
    } catch (error) {
      console.error("notifyTutorsForOrder Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = NotificationController;
