const router = require("express").Router();
const multer = require("multer");
const {
  UserController,
  OrderController,
  StudentController,
  TutorController,
  EmployeeController,
} = require("../controllers");
const authenticateToken = require("../middleware/auth");

const uploadDestination = "uploads";

// Показываем где хранить файлы
const storage = multer.diskStorage({
  destination: uploadDestination,
  filename: function (req, file, next) {
    const uniqueSuffix = Date.now() + "-" + req.user.userID; // Добавляем временную метку и ID пользователя
    const originalExtension = path.extname(file.originalname); // Получаем расширение оригинального файла
    const filename = `${uniqueSuffix}${originalExtension}`; // Создаем новое имя файла
    next(null, filename);
  },
});

const uploads = multer({ storage: storage });

// Роуты для пользователя
router.post("/register-user", UserController.register);
router.post("/login", UserController.login);
router.get("/current", authenticateToken, UserController.current);
router.get("/users/:id", authenticateToken, UserController.getUserById);
router.post("/users-phone", UserController.getUserByPhone);
router.put("/users-secret", UserController.updSecretUser);
router.put("/users/:id", authenticateToken, UserController.updateUser);
router.delete("/users/:id", authenticateToken, UserController.deleteUser);

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

module.exports = router;
