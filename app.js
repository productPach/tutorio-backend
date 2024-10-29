const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS middleware setup
app.use(cors({ origin: "http://localhost:3001" })); // Настраиваем разрешение запросов с определенного источника

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

module.exports = app;
