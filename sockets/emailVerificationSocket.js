const jwt = require("jsonwebtoken");

module.exports = (io) => {
  let socketConnections = {}; // Храним все сокеты для каждого tutorId

  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Когда клиент отправляет tutorId, связываем сокет с tutorId
    socket.on("setUser", (data) => {
      const { tutorId } = data;

      // Если tutorId существует, сохраняем сокет
      if (tutorId) {
        if (!socketConnections[tutorId]) {
          socketConnections[tutorId] = [];
        }
        socketConnections[tutorId].push(socket.id);
        console.log(`Сокет ${socket.id} привязан к tutorId: ${tutorId}`);
      }
    });

    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;

        console.log("Подтверждение почты для tutorId:", tutorId);

        // Отправляем событие на все сокеты для этого tutorId
        if (socketConnections[tutorId]) {
          socketConnections[tutorId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { tutorId });
            console.log(
              `Отправлено событие "emailVerified" для tutorId: ${tutorId} на сокет: ${socketId}`
            );
          });
        }
      } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        socket.emit("emailVerificationError", {
          error: "Неверный или истекший токен",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);

      // Удаляем сокет из списка при отключении
      Object.keys(socketConnections).forEach((tutorId) => {
        socketConnections[tutorId] = socketConnections[tutorId].filter(
          (id) => id !== socket.id
        );
      });
    });
  });
};
