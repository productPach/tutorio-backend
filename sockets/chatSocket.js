const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = (io) => {
  let chatConnections = {}; // { chatId: [socketId, ...] }
  let userConnections = {}; // { userId: [socketId, ...] }

  io.on("connection", (socket) => {
    console.log("Сокет подключен для чата:", socket.id);

    // Пользователь присоединяется к чатам
    socket.on("joinChat", async ({ userId, chatIds }) => {
      if (!userId || !chatIds?.length) return;

      if (!userConnections[userId]) userConnections[userId] = [];
      userConnections[userId].push(socket.id);

      for (const chatId of chatIds) {
        socket.join(chatId);

        if (!chatConnections[chatId]) chatConnections[chatId] = [];
        chatConnections[chatId].push(socket.id);

        console.log(`Пользователь ${userId} присоединился к чату ${chatId}`);

        // Отправляем актуальное количество непрочитанных сообщений
        const unreadCount = await getUnreadCount(chatId, userId);
        io.to(socket.id).emit("chatState", { chatId, unreadCount });
      }
    });

    // Отправка нового сообщения
    socket.on("sendMessage", async ({ chatId, message }) => {
      if (!chatId || !message) return;

      socket.to(chatId).emit("newMessage", message);

      const participants = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          tutorId: true,
          studentId: true,
        },
      });

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

    socket.on("disconnect", () => {
      console.log("Сокет отключен:", socket.id);

      Object.keys(userConnections).forEach((userId) => {
        userConnections[userId] = userConnections[userId].filter(
          (id) => id !== socket.id
        );
        if (!userConnections[userId].length) delete userConnections[userId];
      });

      Object.keys(chatConnections).forEach((chatId) => {
        chatConnections[chatId] = chatConnections[chatId].filter(
          (id) => id !== socket.id
        );
        if (!chatConnections[chatId].length) delete chatConnections[chatId];
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
