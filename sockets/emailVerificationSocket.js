const jwt = require("jsonwebtoken");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Сохраняем связь tutorId с socket.id
    socket.on("registerTutor", (tutorId) => {
      socket.join(tutorId); // Сохраняем сокет в комнате, соответствующей tutorId
      console.log(`Tutor ${tutorId} подключился к комнате ${socket.id}`);
    });

    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;

        console.log("Подтверждение почты для:", tutorId);

        // Отправляем событие только в комнату с tutorId
        io.to(tutorId).emit("emailVerified", { tutorId });
        console.log(`Email verified for tutor ${tutorId}`);
      } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        socket.emit("emailVerificationError", {
          error: "Неверный или истекший токен",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);
    });
  });
};
