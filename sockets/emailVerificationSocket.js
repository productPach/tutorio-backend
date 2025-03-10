const jwt = require("jsonwebtoken");

module.exports = (io) => {
  // Мапа для отслеживания текущих пользователей, уже подключенных к комнате
  const connectedTutors = new Map();

  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Сохраняем связь tutorId с socket.id, но только если пользователь ещё не подключен
    socket.on("registerTutor", (tutorId) => {
      if (!connectedTutors.has(tutorId)) {
        // Если репетитор ещё не подключен, подключаем к комнате
        socket.join(tutorId);
        connectedTutors.set(tutorId, socket.id); // Добавляем tutorId в мапу
        console.log(`Tutor ${tutorId} подключился к комнате ${tutorId}`);
      } else {
        // Если уже подключен, просто сообщаем
        console.log(`Tutor ${tutorId} уже в комнате`);
      }
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
      // Удаляем tutorId из мапы при отключении
      for (let [tutorId, socketId] of connectedTutors) {
        if (socketId === socket.id) {
          connectedTutors.delete(tutorId);
          console.log(`Tutor ${tutorId} отключился от комнаты`);
          break;
        }
      }
      console.log("Пользователь отключился:", socket.id);
    });
  });
};
