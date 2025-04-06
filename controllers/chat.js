const { prisma } = require("../prisma/prisma-client");

const ChatController = {
  // Создание чата
  createChat: async (req, res) => {
    const { tutorId, studentId, orderId, initiatorRole } = req.body;

    if (!tutorId || !studentId || !orderId || !initiatorRole) {
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

      // Определяем, кто получатель сообщения
      const recipientId =
        chat.tutorId === senderId ? chat.studentId : chat.tutorId;

      // Получаем email получателя (репетитор или ученик)
      let recipientEmail = null;
      let templateId;

      if (chat.tutorId === recipientId) {
        // Получаем email репетитора
        const tutor = await prisma.tutor.findUnique({
          where: { id: recipientId },
          select: { email: true },
        });
        recipientEmail = tutor?.email;
        templateId = 1479204;
      } else {
        // Получаем email ученика
        const student = await prisma.student.findUnique({
          where: { id: recipientId },
          select: { email: true },
        });
        recipientEmail = student?.email;
        templateId = 1479198;
      }

      if (!recipientEmail) {
        return res.status(404).json({ error: "Email получателя не найден" });
      }

      // Определяем домен
      const domain =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001"
          : "https://tutorio.ru";

      const link = `${domain}/student/order/${orderId}`;

      // Отправка письма
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
};

module.exports = ChatController;
