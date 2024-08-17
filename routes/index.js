const router = require("express").Router();
const multer = require("multer");

const uploadDestination = "uploads";

// Показываем где хранить файлы
const storage = multer.diskStorage({
  destination: uploadDestination,
  filename: function (req, file, next) {
    next(null, file.originalname);
  },
});

const uploads = multer({ storage: storage });

router.get("/register", (req, res) => {
  res.send("register");
});

module.exports = router;
