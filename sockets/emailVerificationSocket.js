module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    socket.on("verifyEmail", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const { tutorId } = decoded;

        console.log("Подтверждение почты для:", tutorId);

        // Проверяем, подключен ли пользователь перед отправкой события
        if (socket.connected) {
          socket.emit("emailVerified", { tutorId });
        } else {
          console.log("Клиент отключился до получения подтверждения.");
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
    });
  });
};
