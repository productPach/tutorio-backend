const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = (io) => {
  let socketConnections = {
    // Храним сокеты для пользователей
    tutors: {},
    students: {},
    chats: {},
  };

  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Когда клиент отправляет tutorId или studentId, связываем сокет с соответствующим ID
    socket.on("setUser", (data) => {
      const { tutorId, studentId } = data;

      if (tutorId) {
        if (!socketConnections.tutors[tutorId]) {
          socketConnections.tutors[tutorId] = [];
        }
        socketConnections.tutors[tutorId].push(socket.id);
        console.log(`Сокет ${socket.id} привязан к tutorId: ${tutorId}`);
      }

      if (studentId) {
        if (!socketConnections.students[studentId]) {
          socketConnections.students[studentId] = [];
        }
        socketConnections.students[studentId].push(socket.id);
        console.log(`Сокет ${socket.id} привязан к studentId: ${studentId}`);
      }
    });

    // Обработка события подтверждения email
    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { userId, userType } = decoded;

        console.log("Подтверждение почты для:", userId);

        if (userType === "tutor" && socketConnections.tutors[userId]) {
          socketConnections.tutors[userId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { tutorId: userId });
          });
        }

        if (userType === "student" && socketConnections.students[userId]) {
          socketConnections.students[userId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { studentId: userId });
          });
        }
      } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        socket.emit("emailVerificationError", {
          error: "Неверный или истекший токен",
        });
      }
    });

    // Обработка событий для чатов
    socket.on("joinChat", async ({ userId, chatIds }) => {
      if (!userId || !chatIds?.length) return;

      if (!socketConnections[userId]) socketConnections[userId] = [];
      socketConnections[userId].push(socket.id);

      for (const chatId of chatIds) {
        socket.join(chatId);

        if (!socketConnections.chats[chatId])
          socketConnections.chats[chatId] = [];
        socketConnections.chats[chatId].push(socket.id);

        console.log(`Пользователь ${userId} присоединился к чату ${chatId}`);

        // Отправляем актуальное количество непрочитанных сообщений
        const unreadCount = await getUnreadCount(chatId, userId);
        io.to(socket.id).emit("chatState", { chatId, unreadCount });
      }
    });

    // Отправка нового сообщения
    socket.on("sendMessage", async ({ chatId, message }) => {
      if (!chatId || !message) return;

      console.log(`Получено новое сообщение для чата ${chatId}:`, message);

      socket.to(chatId).emit("newMessage", message);

      const participants = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          tutorId: true,
          studentId: true,
        },
      });

      if (!participants) {
        console.warn(`Чат ${chatId} не найден`);
        return;
      }

      const receiverId =
        message.senderId === participants.tutorId
          ? participants.studentId
          : participants.tutorId;

      const unreadCount = await getUnreadCount(chatId, receiverId);
      io.to(chatId).emit("updateUnreadCount", {
        chatId,
        userId: receiverId,
        unreadCount,
      });
    });

    // Сообщения прочитаны
    socket.on("markAsRead", async ({ chatId, messageIds, userId }) => {
      if (!chatId || !messageIds?.length || !userId) return;

      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      io.to(chatId).emit("messagesRead", { chatId, messageIds });

      const unreadCount = await getUnreadCount(chatId, userId);
      io.to(chatId).emit("updateUnreadCount", {
        chatId,
        userId,
        unreadCount,
      });
    });

    socket.on("leaveChat", ({ chatId }) => {
      socket.leave(chatId);
      if (socketConnections.chats[chatId]) {
        socketConnections.chats[chatId] = socketConnections.chats[
          chatId
        ].filter((id) => id !== socket.id);
        console.log(`Сокет ${socket.id} покинул чат ${chatId}`);
      }
    });

    // Список чатов в сайдбаре
    socket.on("getUserChats", async ({ userId }) => {
      if (!userId) return;

      const chats = await prisma.chat.findMany({
        where: {
          OR: [{ tutorId: userId }, { studentId: userId }],
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      const formatted = await Promise.all(
        chats.map(async (chat) => {
          const unreadCount = await getUnreadCount(chat.id, userId);
          return {
            chatId: chat.id,
            lastMessage: chat.messages[0]?.text || "",
            lastMessageDate: chat.messages[0]?.createdAt || null,
            unreadCount,
          };
        })
      );

      socket.emit("userChats", formatted);
    });

    // Создание нового чата
    socket.on("createChat", async ({ chatId }) => {
      if (!chatId) return;

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!chat) {
        console.warn(`Чат ${chatId} не найден`);
        return;
      }

      const chatData = {
        chatId: chat.id,
        lastMessage: chat.messages[0]?.text || "",
        lastMessageDate: chat.messages[0]?.createdAt || null,
        unreadCount: 0,
      };

      if (chat.owner === "tutor" && chat.studentId) {
        const studentSockets = socketConnections.students[chat.studentId] || [];
        studentSockets.forEach((socketId) => {
          io.to(socketId).emit("newChatCreated", chatData);
        });
        console.log(
          `Отправлено событие newChatCreated студенту ${chat.studentId}`
        );
      }

      if (chat.owner === "student" && chat.tutorId) {
        const tutorSockets = socketConnections.tutors[chat.tutorId] || [];
        tutorSockets.forEach((socketId) => {
          io.to(socketId).emit("newChatCreated", chatData);
        });
        console.log(
          `Отправлено событие newChatCreated репетитору ${chat.tutorId}`
        );
      }
    });

    // Отключение пользователя
    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);

      Object.keys(socketConnections.tutors).forEach((tutorId) => {
        socketConnections.tutors[tutorId] = socketConnections.tutors[
          tutorId
        ].filter((id) => id !== socket.id);
      });

      Object.keys(socketConnections.students).forEach((studentId) => {
        socketConnections.students[studentId] = socketConnections.students[
          studentId
        ].filter((id) => id !== socket.id);
      });

      Object.keys(socketConnections.chats).forEach((chatId) => {
        socketConnections.chats[chatId] = socketConnections.chats[
          chatId
        ].filter((id) => id !== socket.id);
      });
    });
  });

  async function getUnreadCount(chatId, userId) {
    try {
      const count = await prisma.message.count({
        where: {
          chatId,
          isRead: false,
          NOT: {
            senderId: userId,
          },
        },
      });
      return count;
    } catch (err) {
      console.error("Ошибка при подсчете непрочитанных сообщений:", err);
      return 0;
    }
  }
};
