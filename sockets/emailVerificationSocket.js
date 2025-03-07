module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Пользователь подключился:", socket.id);

    socket.on("verifyEmail", (tutorId) => {
      console.log("Подтверждение почты для:", tutorId);

      // Отправляем обновление всем клиентам
      io.emit("emailVerified", { tutorId });
    });

    socket.on("disconnect", () => {
      console.log("Пользователь отключился:", socket.id);
    });
  });
};
