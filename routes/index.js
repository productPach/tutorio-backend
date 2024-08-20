const router = require("express").Router();
const multer = require("multer");
const { UserController } = require("../controllers");

const uploadDestination = "uploads";

// Показываем где хранить файлы
const storage = multer.diskStorage({
  destination: uploadDestination,
  filename: function (req, file, next) {
    next(null, file.originalname);
  },
});

const uploads = multer({ storage: storage });

router.post("/register-user", UserController.register);
router.post("/register-tutor", UserController.register);
router.post("/register-student", UserController.register);
router.post("/register-employee", UserController.register);
router.post("/login", UserController.login);
router.get("/current", UserController.current);
router.get("/users/:id", UserController.getUserById);
router.put("/users/:id", UserController.updateUser);

module.exports = router;
