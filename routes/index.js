const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const {
  UserController,
  OrderController,
  StudentController,
  TutorController,
  EmployeeController,
  WelcomeScreenController,
} = require("../controllers");
const authenticateToken = require("../middleware/auth");
const uploadDestination = "uploads";

// Показываем где хранить файлы
const storage = multer.diskStorage({
  destination: (req, file, next) => {
    next(null, uploadDestination);
  },
  filename: (req, file, next) => {
    const uniqueSuffix = Date.now() + "-" + Math.floor(Math.random() * 10000);
    const userId = req.user.userID; // Получаем ID пользователя
    const filename = `${userId}_${uniqueSuffix}${path.extname(
      file.originalname
    )}`; // Добавляем ID пользователя
    next(null, filename);
  },
});

const uploads = multer({ storage: storage });

// Хранилище для дипломов
const diplomaStorage = multer.diskStorage({
  destination: (req, file, next) => {
    next(null, "uploads/diplomas"); // Указываем папку для дипломов
  },
  filename: (req, file, next) => {
    const uniqueSuffix = Date.now() + "-" + Math.floor(Math.random() * 10000);
    const userId = req.user.userID;
    const filename = `${userId}_${uniqueSuffix}${path.extname(
      file.originalname
    )}`;
    next(null, filename);
  },
});

const diplomaUploads = multer({ storage: diplomaStorage });

// Роуты для пользователя
router.post("/register-user", UserController.register);
router.post("/login", UserController.login);
router.get("/current", authenticateToken, UserController.current);
router.get("/users/:id", authenticateToken, UserController.getUserById);
router.post("/users-phone", UserController.getUserByPhone);
router.put("/users-secret", UserController.updSecretUser);
router.put("/users/:id", authenticateToken, UserController.updateUser);
router.delete("/users/:id", authenticateToken, UserController.deleteUser);
router.post(
  "/show-welcome-screen/:id",
  authenticateToken,
  UserController.showWelcomeScreen
);

// Роуты для ученика
router.post("/students", authenticateToken, StudentController.createStudent);
router.get(
  "/currentStudent",
  authenticateToken,
  StudentController.currentStudent
);
router.get("/students", authenticateToken, StudentController.getAllStudents);
router.get(
  "/students/:id",
  authenticateToken,
  StudentController.getStudentById
);
router.put("/students/:id", authenticateToken, StudentController.updateStudent);
router.delete(
  "/students/:id",
  authenticateToken,
  StudentController.deleteStudent
);

// Роуты для репетитора
router.post(
  "/tutors",
  authenticateToken,
  uploads.single("avatar"),
  TutorController.createTutor
);
// Роут для обновления фотографии репетитора
router.put(
  "/tutors/:id/avatar",
  authenticateToken,
  uploads.single("avatar"),
  (req, res, next) => {
    console.log(req.file); // Логируем файл
    next();
  },
  TutorController.updateTutorAvatar
);
router.get("/currentTutor", authenticateToken, TutorController.currentTutor);
router.get("/tutors", authenticateToken, TutorController.getAllTutors);
router.get("/tutors/:id", authenticateToken, TutorController.getTutorById);
router.patch("/tutors/:id", authenticateToken, TutorController.updateTutor);
router.delete("/tutors/:id", authenticateToken, TutorController.deleteTutor);
router.delete(
  "/tutors/:id/avatar",
  authenticateToken,
  TutorController.deleteTutorAvatar
);
router.post(
  "/tutorsEducation/:id",
  authenticateToken,
  diplomaUploads.array("diploma", 5),
  TutorController.addEducation
);
router.patch(
  "/tutorsEducation/:id/:educationId",
  authenticateToken,
  diplomaUploads.single("diploma"),
  TutorController.updateEducation
);
router.delete(
  "/tutorsEducation/:id/:educationId",
  authenticateToken,
  TutorController.deleteEducation
);

// Роуты для сотрудника
router.post("/employees", authenticateToken, EmployeeController.createEmployee);
router.get(
  "/currentEmployee",
  authenticateToken,
  EmployeeController.currentEmployee
);
router.get("/employees", authenticateToken, EmployeeController.getAllEmployees);
router.get(
  "/employees/:id",
  authenticateToken,
  EmployeeController.getEmployeeById
);
router.put(
  "/employees/:id",
  authenticateToken,
  EmployeeController.updateEmployee
);
router.delete(
  "/employees/:id",
  authenticateToken,
  EmployeeController.deleteEmployee
);

// Роуты для заказа
router.post("/orders", authenticateToken, OrderController.createOrder);
router.get("/orders", authenticateToken, OrderController.getAllOrders);
router.get("/orders/:id", authenticateToken, OrderController.getOrderById);
router.put("/orders/:id", authenticateToken, OrderController.updateOrder);
router.delete("/orders/:id", authenticateToken, OrderController.deleteOrder);

// Роуты для отклика

// Роуты для велком-скринов
router.post(
  "/welcome-screens",
  authenticateToken,
  WelcomeScreenController.createWelcomeScreen
);
router.get(
  "/welcome-screens",
  authenticateToken,
  WelcomeScreenController.getAllWelcomeScreen
);
router.patch(
  "/welcome-screens/:id",
  authenticateToken,
  WelcomeScreenController.updateWelcomeScreen
);
router.delete(
  "/welcome-screens/:id",
  authenticateToken,
  WelcomeScreenController.deleteWelcomeScreen
);
router.get(
  "/welcome-screens-user/",
  authenticateToken,
  WelcomeScreenController.getWelcomeScreenForUser
);

module.exports = router;
