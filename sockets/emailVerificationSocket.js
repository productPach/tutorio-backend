const jwt = require("jsonwebtoken");

const socketConnections = {}; // tutorId => массив socketId

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Получаем `tutorId` через событие `verifyEmail`
    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;
        console.log("Подтверждение почты для tutorId:", tutorId);

        // Если у этого tutorId уже есть сокеты, отправляем событие на все из них
        if (socketConnections[tutorId]) {
          socketConnections[tutorId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { tutorId });
            console.log(
              `✅ Отправлено событие "emailVerified" для tutorId: ${tutorId} на сокет: ${socketId}`
            );
          });
        }

        // Добавляем новый socket.id в массив
        if (!socketConnections[tutorId]) {
          socketConnections[tutorId] = [];
        }
        socketConnections[tutorId].push(socket.id);
      } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        socket.emit("emailVerificationError", {
          error: "Неверный или истекший токен",
        });
      }
    });

    // Обработчик отключения
    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);

      // Удаляем сокет из списка для tutorId
      for (let tutorId in socketConnections) {
        socketConnections[tutorId] = socketConnections[tutorId].filter(
          (id) => id !== socket.id
        );
        if (socketConnections[tutorId].length === 0) {
          delete socketConnections[tutorId]; // Удаляем tutorId, если сокетов не осталось
        }
      }
    });
  });
};
