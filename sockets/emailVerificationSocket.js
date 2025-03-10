const jwt = require("jsonwebtoken");

const socketConnections = {}; // Связь tutorId с socketId

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // При получении токена, связываем его с сокетом
    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;
        console.log("Подтверждение почты для:", socket.id);

        // Проверяем, подключен ли уже этот tutorId
        if (socketConnections[tutorId]) {
          console.log("Этот tutorId уже подключен к сокету:", tutorId);
          // Здесь можно отключить старый сокет, если нужно:
          // io.to(socketConnections[tutorId]).disconnect();
        }

        // Сохраняем связь между tutorId и текущим сокетом
        socketConnections[tutorId] = socket.id;

        // Отправляем подтверждение на этот сокет
        io.to(socket.id).emit("emailVerified", { tutorId });
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
