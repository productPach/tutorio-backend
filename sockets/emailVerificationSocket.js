const jwt = require("jsonwebtoken");

const socketConnections = {}; // Связь tutorId с socketId

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // При получении токена, связываем его с сокетом
    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded; // Получаем tutorId из токена
        console.log("Подтверждение почты для:", tutorId);

        // Если tutorId уже подключен, отправляем событие на все сокеты с этим tutorId
        if (socketConnections[tutorId]) {
          io.to(socketConnections[tutorId]).emit("emailVerified", { tutorId });
          console.log(`Отправлено событие "emailVerified" для: ${socket.id}`);
        }

        // Связываем текущий сокет с tutorId
        socketConnections[tutorId] = socket.id;
      } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        socket.emit("emailVerificationError", {
          error: "Неверный или истекший токен",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);
      // Убираем сокет из связи при отключении
      for (let tutorId in socketConnections) {
        if (socketConnections[tutorId] === socket.id) {
          delete socketConnections[tutorId];
          break;
        }
      }
    });
  });
};
