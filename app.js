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

const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { ratingQueue } = require("./queue/ratingQueue");
const { telegramQueue } = require("./queue/telegramQueue");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3001",
      "http://localhost:3002",
      "http://51.250.20.10",
      "http://dev-tutorio.ru",
      "http://www.dev-tutorio.ru",
      "https://dev-tutorio.ru",
      "https://www.dev-tutorio.ru",
      "https://dashboard.dev-tutorio.ru",
    ], // Разрешаем эти домены
    credentials: true, // Разрешаем передавать авторизационные заголовки и куки
    methods: ["GET", "POST"], // Разрешаем эти HTTP-методы
    allowedHeaders: ["Content-Type", "Authorization"], // Разрешаем эти заголовки
  },
});

// Подключаем WebSocket-модуль
require("./sockets/socketHandler")(io);

// CORS middleware setup
//app.use(cors({ origin: "http://localhost:3001" })); // Настраиваем разрешение запросов с определенного источника
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3002",
      "http://51.250.20.10",
      "http://dev-tutorio.ru",
      "http://www.dev-tutorio.ru",
      "https://dev-tutorio.ru",
      "https://www.dev-tutorio.ru",
      "https://dashboard.dev-tutorio.ru",
    ], // Разрешаем эти домены
    credentials: true, // Разрешаем передавать авторизационные заголовки и куки
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"], // Добавляем метод PATCH
    allowedHeaders: ["Content-Type", "Authorization"], // Разрешаем эти заголовки
  })
);

// --- Настройка Bull Board ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(ratingQueue),
    // добавь сюда другие очереди, если нужно
    new BullMQAdapter(telegramQueue),
  ],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// view engine setup
// app.set("view engine", "jade");
// Раздаем статические файлы из папки uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
  // res.status(err.status || 500);
  // res.render("error");
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

// Запускаем крон-задачи
startCrons();

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

module.exports = { app, server };
