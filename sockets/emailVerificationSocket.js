const jwt = require("jsonwebtoken");

module.exports = (io) => {
  // Хранение информации о подключенных репетиторах
  const connectedTutors = new Set();

  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Сохраняем связь tutorId с socket.id
    socket.on("registerTutor", (tutorId) => {
      // Проверяем, если tutorId уже подключен
      if (!connectedTutors.has(tutorId)) {
        connectedTutors.add(tutorId);
        socket.join(tutorId); // Подключаем сокет к комнате, если еще не подключен
        console.log(`Tutor ${tutorId} подключился к комнате ${tutorId}`);
      } else {
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
      console.log("Пользователь отключился:", socket.id);

      // Удаляем tutorId из connectedTutors при отключении
      for (let tutorId of connectedTutors) {
        if (socket.rooms.has(tutorId)) {
          connectedTutors.delete(tutorId);
          console.log(`Tutor ${tutorId} отключился.`);
          break;
        }
      }
    });
  });
};
