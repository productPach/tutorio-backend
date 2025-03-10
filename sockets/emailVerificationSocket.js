const jwt = require("jsonwebtoken");

const socketConnections = {}; // { tutorId: [socketId1, socketId2] }
const pendingMessages = {}; // { tutorId: true }

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔗 Новый пользователь подключился: ${socket.id}`);

    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;

        console.log(
          `📩 Получен запрос подтверждения почты для tutorId: ${tutorId}`
        );

        if (!socketConnections[tutorId]) {
          socketConnections[tutorId] = [];
        }

        // Добавляем сокет в список
        if (!socketConnections[tutorId].includes(socket.id)) {
          socketConnections[tutorId].push(socket.id);
        }

        console.log(
          `📡 Активные сокеты для tutorId ${tutorId}:`,
          socketConnections[tutorId]
        );

        // Отправляем подтверждение всем активным сокетам этого tutorId
        if (socketConnections[tutorId].length > 0) {
          socketConnections[tutorId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { tutorId });
            console.log(
              `✅ Отправлено событие "emailVerified" для tutorId: ${tutorId} на сокет: ${socketId}`
            );
          });
        } else {
          console.log(
            `⚠️ Нет активных сокетов для tutorId: ${tutorId}, сохраняем событие`
          );
          pendingMessages[tutorId] = true;
        }
      } catch (error) {
        console.error("❌ Ошибка верификации токена:", error.message);
        socket.emit("emailVerificationError", {
          error: "Неверный или истекший токен",
        });
      }
    });

    // Проверяем, есть ли отложенные сообщения при новом подключении
    socket.on("authenticate", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;

        if (!socketConnections[tutorId]) {
          socketConnections[tutorId] = [];
        }

        // Добавляем сокет в список
        if (!socketConnections[tutorId].includes(socket.id)) {
          socketConnections[tutorId].push(socket.id);
        }

        console.log(
          `🔓 Аутентифицирован tutorId: ${tutorId}, сокет: ${socket.id}`
        );

        // Если были отложенные события, отправляем их
        if (pendingMessages[tutorId]) {
          socket.emit("emailVerified", { tutorId });
          console.log(
            `📤 Отправлено отложенное событие "emailVerified" для tutorId: ${tutorId}`
          );
          delete pendingMessages[tutorId]; // Удаляем после отправки
        }
      } catch (error) {
        console.error("❌ Ошибка аутентификации:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Отключился сокет: ${socket.id}`);

      // Удаляем сокет из списка tutorId
      for (let tutorId in socketConnections) {
        socketConnections[tutorId] = socketConnections[tutorId].filter(
          (id) => id !== socket.id
        );

        if (socketConnections[tutorId].length === 0) {
          delete socketConnections[tutorId];
          console.log(`🗑️ Удалены все сокеты для tutorId: ${tutorId}`);
        }
      }
    });
  });
};
