const { prisma } = require("../prisma/prisma-client");
const axios = require("axios");

const MAILOPOST_API_URL = "https://api.mailopost.ru/v1";
const API_TOKEN = "bc45c119ceb875aaa808ef2ee561c5d9";

const ChatController = {
  // Создание чата
  createChat: async (req, res) => {
    const { tutorId, studentId, orderId, initiatorRole, themeOrder } = req.body;

    if (!tutorId || !studentId || !orderId || !initiatorRole || !themeOrder) {
      return res
        .status(400)
        .json({ error: "Не все обязательные поля переданы" });
    }

    try {
      const existingChat = await prisma.chat.findFirst({
        where: { studentId, tutorId, orderId },
      });

      if (existingChat) {
        return res.status(409).json({ error: "Чат уже существует" });
      }

      const tutorHasAccess = initiatorRole === "tutor";

      const newChat = await prisma.chat.create({
        data: {
          studentId,
          tutorId,
          orderId,
          tutorHasAccess,
        },
      });

      // --- Отправка письма ---
      // Получатель — это тот, кто НЕ является инициатором
      const recipientId = initiatorRole === "tutor" ? studentId : tutorId;

      let recipientEmail = null;
      let templateId;

      if (initiatorRole === "tutor") {
        const student = await prisma.student.findUnique({
          where: { id: recipientId },
          select: { email: true },
        });
        recipientEmail = student?.email;
        templateId = 1479198; // Шаблон для ученика
      } else {
        const tutor = await prisma.tutor.findUnique({
          where: { id: recipientId },
          select: { email: true },
        });
        recipientEmail = tutor?.email;
        templateId = 1479204; // Шаблон для репетитора
      }

      if (!recipientEmail) {
        console.warn("Email получателя не найден");
      } else {
        const domain =
          process.env.NODE_ENV === "development"
            ? "http://localhost:3001"
            : "https://tutorio.ru";

        const link = `${domain}/student/order/${orderId}`;

        try {
          const response = await axios.post(
            `${MAILOPOST_API_URL}/email/templates/${templateId}/messages`,
            {
              to: recipientEmail,
              params: {
                link: link,
                themeOrder: themeOrder,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          console.log(
            `Письмо отправлено на ${recipientEmail}, статус:`,
            response.status
          );
        } catch (mailError) {
          console.error(
            "Ошибка при отправке письма:",
            mailError.response?.data || mailError.message
          );
        }
      }

      res.json(newChat);
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Отправка сообщения в чат
  sendMessage: async (req, res) => {
    const { chatId, senderId, text, orderId, themeOrder } = req.body;

    if (!chatId || !senderId || !text || !orderId || !themeOrder) {
      return res
        .status(400)
        .json({ error: "Не все обязательные поля переданы" });
    }

    try {
      // Получаем чат по chatId
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
      });

      if (!chat) {
        return res.status(404).json({ error: "Чат не найден" });
      }

      // Проверка доступа репетитора
      if (chat.tutorId === senderId && !chat.tutorHasAccess) {
        return res.status(403).json({ error: "Нет доступа к чату до оплаты" });
      }

      // Создаем новое сообщение
      const newMessage = await prisma.message.create({
        data: {
          chatId,
          senderId,
          text,
        },
      });

      // Возвращаем сообщение
      res.json(newMessage);
    } catch (error) {
      console.error(
        "Ошибка при отправке сообщения и письма:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Ошибка при отправке сообщения и письма",
        details: error.response?.data || error.message,
      });
    }
  },

  // Обновление сообщения (текст и статус прочтения)
  updateMessage: async (req, res) => {
    const { messageId, text, isRead, studentId, tutorId } = req.body;
    const userId = req.user.userID;

    if (!messageId) {
      return res.status(400).json({ error: "Не передан messageId" });
    }

    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          chat: true, // получаем studentId и tutorId из чата
        },
      });

      if (!message) {
        return res.status(404).json({ error: "Сообщение не найдено" });
      }

      const { senderId, chat } = message;

      // Проверка: можно редактировать текст, только если это отправитель
      if (text !== undefined && senderId !== userId) {
        return res
          .status(403)
          .json({ error: "Только отправитель может редактировать текст" });
      }

      // Проверка: можно менять isRead, только если это получатель и только на true
      if (isRead !== undefined) {
        // Кто получатель?
        const recipientId =
          chat.tutorId === senderId ? chat.studentId : chat.tutorId;

        // Сравниваем переданный studentId/tutorId с получателем
        if (
          (recipientId === chat.studentId && studentId !== recipientId) ||
          (recipientId === chat.tutorId && tutorId !== recipientId) ||
          isRead !== true
        ) {
          return res.status(403).json({
            error: "Только получатель может пометить сообщение как прочитанное",
          });
        }
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          ...(text !== undefined ? { text } : {}),
          ...(isRead !== undefined ? { isRead } : {}),
        },
      });

      res.json(updatedMessage);
    } catch (error) {
      console.error("Ошибка при обновлении сообщения:", error.message);
      res.status(500).json({
        error: "Ошибка при обновлении сообщения",
        details: error.message,
      });
    }
  },
};

module.exports = ChatController;
