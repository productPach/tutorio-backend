const { prisma } = require("../prisma/prisma-client");
const axios = require("axios");

const MAILOPOST_API_URL = "https://api.mailopost.ru/v1";
const API_TOKEN = "bc45c119ceb875aaa808ef2ee561c5d9";

const ChatController = {
  // Создание чата
  createChat: async (req, res) => {
    const { tutorId, studentId, orderId, initiatorRole, themeOrder, status } =
      req.body;

    if (
      !tutorId ||
      !studentId ||
      !orderId ||
      !initiatorRole ||
      !themeOrder ||
      !status
    ) {
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
          themeOrder,
          initiatorRole,
          status,
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

  // Изменение чата
  updateChat: async (req, res) => {
    const { chatId, tutorHasAccess, status } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: "Не передан chatId" });
    }

    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
      });

      if (!chat) {
        return res.status(404).json({ error: "Чат не найден" });
      }

      const updatedChat = await prisma.chat.update({
        where: { id: chatId },
        data: {
          ...(tutorHasAccess !== undefined ? { tutorHasAccess } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });

      res.json(updatedChat);
    } catch (error) {
      console.error("Ошибка при обновлении чата:", error.message);
      res.status(500).json({
        error: "Ошибка при обновлении чата",
        details: error.message,
      });
    }
  },

  // Отправка сообщения в чат
  sendMessage: async (req, res) => {
    const { chatId, senderId, text, orderId } = req.body;

    if (!chatId || !senderId || !text || !orderId) {
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
        //return res.status(403).json({ error: "Нет доступа к чату до оплаты" });
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

  // Получение всех чатов по заказу с непрочитанными сообщениями (для текущего пользователя)
  getChatsByOrderId: async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user?.userID;

    if (!orderId || !userId) {
      return res.status(400).json({ error: "orderId или userId не переданы" });
    }

    try {
      const chats = await prisma.chat.findMany({
        where: { orderId },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              lastOnline: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              lastOnline: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              text: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            },
          },
        },
      });

      const enrichedChats = chats.map((chat) => {
        const unreadCount = chat.messages.filter(
          (msg) => !msg.isRead && msg.senderId !== userId
        ).length;

        const lastMessage = chat.messages[chat.messages.length - 1] || null;

        return {
          ...chat,
          unreadCount,
          lastMessage,
        };
      });

      res.json(enrichedChats);
    } catch (error) {
      console.error("Ошибка при получении чатов по заказу:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // GET /api/chats/:chatId
  getChatById: async (req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "chatId обязателен" });
    }

    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              lastOnline: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              lastOnline: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              senderId: true,
              text: true,
              createdAt: true,
              isRead: true,
            },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: "Чат не найден" });
      }

      res.json(chat);
    } catch (error) {
      console.error("Ошибка при получении чата:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение всех чатов для пользователя (тутора или студента) с непрочитанными сообщениями
  getChatsByUserIdAndRole: async (req, res) => {
    const { userId, role } = req.params;
    const currentUserId = req.user?.userID;

    if (!userId || !currentUserId || !role) {
      return res
        .status(400)
        .json({ error: "Не переданы userId, текущий пользователь или роль" });
    }

    if (userId !== currentUserId) {
      return res
        .status(403)
        .json({ error: "Вы не можете получить чаты другого пользователя" });
    }

    try {
      let participantId = null;
      let roleField = null;

      if (role === "student") {
        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student) {
          return res.status(404).json({ error: "Студент не найден" });
        }
        participantId = student.id;
        roleField = "studentId";
      } else if (role === "tutor") {
        const tutor = await prisma.tutor.findUnique({ where: { userId } });
        if (!tutor) {
          return res.status(404).json({ error: "Репетитор не найден" });
        }
        participantId = tutor.id;
        roleField = "tutorId";
      } else {
        return res
          .status(400)
          .json({ error: "Роль должна быть 'student' или 'tutor'" });
      }

      const chats = await prisma.chat.findMany({
        where: {
          [roleField]: participantId,
        },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              lastOnline: true,
              userId: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              lastOnline: true,
              userId: true,
              user: {
                select: {
                  phone: true,
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              createdAt: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              text: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            },
          },
        },
      });

      const enrichedChats = chats.map((chat) => {
        const unreadCount = chat.messages.filter(
          (msg) => !msg.isRead && msg.senderId !== participantId
        ).length;

        const lastMessage = chat.messages[chat.messages.length - 1] || null;

        return {
          ...chat,
          unreadCount,
          lastMessage,
        };
      });

      res.json(enrichedChats);
    } catch (error) {
      console.error("Ошибка при получении чатов:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = ChatController;
