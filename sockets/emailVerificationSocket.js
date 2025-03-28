const jwt = require("jsonwebtoken");

module.exports = (io) => {
  let socketConnections = { tutors: {}, students: {} }; // Храним сокеты для tutorId и studentId

  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    // Когда клиент отправляет tutorId или studentId, связываем сокет с соответствующим ID
    socket.on("setUser", (data) => {
      const { tutorId, studentId } = data;

      // Связываем сокет с tutorId
      if (tutorId) {
        if (!socketConnections.tutors[tutorId]) {
          socketConnections.tutors[tutorId] = [];
        }
        socketConnections.tutors[tutorId].push(socket.id);
        console.log(`Сокет ${socket.id} привязан к tutorId: ${tutorId}`);
      }

      // Связываем сокет с studentId
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
        const { userId, userType } = decoded; // Декодируем userId и userType

        console.log("Подтверждение почты для:", userId);

        if (userType === "tutor" && socketConnections.tutors[userId]) {
          socketConnections.tutors[userId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { tutorId: userId });
            console.log(
              `Отправлено событие "emailVerified" для tutorId: ${userId} на сокет: ${socketId}`
            );
          });
        }

        if (userType === "student" && socketConnections.students[userId]) {
          socketConnections.students[userId].forEach((socketId) => {
            io.to(socketId).emit("emailVerified", { studentId: userId });
            console.log(
              `Отправлено событие "emailVerified" для studentId: ${userId} на сокет: ${socketId}`
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

    // Отключение пользователя
    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);

      // Удаляем сокет из списка при отключении для репетиторов
      Object.keys(socketConnections.tutors).forEach((tutorId) => {
        socketConnections.tutors[tutorId] = socketConnections.tutors[
          tutorId
        ].filter((id) => id !== socket.id);
      });

      // Удаляем сокет из списка при отключении для учеников
      Object.keys(socketConnections.students).forEach((studentId) => {
        socketConnections.students[studentId] = socketConnections.students[
          studentId
        ].filter((id) => id !== socket.id);
      });
    });
  });
};
