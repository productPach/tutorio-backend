const http = require("http");
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();
const { Server } = require("socket.io");
const startCrons = require("./cron");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3001", "http://158.160.74.139:3001"], // Разрешаем эти домены
    credentials: true, // Разрешаем передавать авторизационные заголовки и куки
    methods: ["GET", "POST"], // Разрешаем эти HTTP-методы
    allowedHeaders: ["Content-Type", "Authorization"], // Разрешаем эти заголовки
  },
});

// Подключаем WebSocket-модуль
require("./sockets/emailVerificationSocket")(io);

// CORS middleware setup
//app.use(cors({ origin: "http://localhost:3001" })); // Настраиваем разрешение запросов с определенного источника
app.use(
  cors({
    origin: ["http://localhost:3001", "http://158.160.74.139:3001"], // Разрешаем эти домены
    credentials: true, // Разрешаем передавать авторизационные заголовки и куки
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"], // Добавляем метод PATCH
    allowedHeaders: ["Content-Type", "Authorization"], // Разрешаем эти заголовки
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// view engine setup
app.set("view engine", "jade");
// Раздаем статические файлы из папки uploads
app.use("/uploads", express.static("uploads"));

app.use("/api", require("./routes"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

if (!fs.existsSync("uploads/diplomas")) {
  fs.mkdirSync("uploads/diplomas", { recursive: true });
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Запускаем крон-задачи
startCrons();

module.exports = { app, server };
