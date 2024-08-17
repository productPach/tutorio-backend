const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");
const userRouter = require("./routes/users");

// Вызываем функцию конфигурации
dotenv.config();

const app = express();

const { PORT = 3000, API_URL = "http://127.0.0.1" } = process.env;

const helloWorld = (request, response) => {
  response.status(200);
  response.send("Сервер Tutorio запущен");
};

// подключаем cors
app.use(cors());
app.use(bodyParser.json());

app.get("/", helloWorld);

app.post("/", (request, response) => {
  response.status(200);
  response.send("POST");
});

// Используем роуты для работы с пользователями
app.use(userRouter);

// Запускаем приложение
app.listen(PORT, () => {
  console.log(`Сервер Tutorio запущен по адресу ${API_URL}:${PORT}`);
});
