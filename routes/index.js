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
  LocationController,
  WikiController,
  MailController,
  ChatController,
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
router.post(
  "/users/cancel-delete-request",
  authenticateToken,
  UserController.cancelDeleteRequest
);

// Роуты для ученика
router.post("/students", authenticateToken, StudentController.createStudent);
// Подтверждение email по токену
router.get("/students/verify-email", StudentController.verifyEmailStudent);
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
router.patch(
  "/students/:id",
  authenticateToken,
  StudentController.updateStudent
);
router.delete(
  "/students/:id",
  authenticateToken,
  StudentController.deleteStudent
);
router.post(
  "/students/delete-request/:id",
  authenticateToken,
  StudentController.deleteRequest
);

// Роуты для репетитора
router.post("/tutors", authenticateToken, TutorController.createTutor);
// Подтверждение email по токену
router.get("/tutors/verify-email", TutorController.verifyEmail);
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
router.get("/tutors", TutorController.getAllTutors);
router.get("/tutors/:id", authenticateToken, TutorController.getTutorById);
router.get("/public/tutors/:id", TutorController.getTutorByIdPublic);
router.patch("/tutors/:id", authenticateToken, TutorController.updateTutor);
router.post(
  "/tutors/delete-request/:id",
  authenticateToken,
  TutorController.deleteRequest
);
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
  diplomaUploads.array("diploma", 5),
  TutorController.updateEducation
);
// Роуты для управления ценами
router.post(
  "/tutorsSubjectPrice",
  authenticateToken,
  TutorController.addSubjectPrice
);
router.patch(
  "/tutorsSubjectPrice/:id",
  authenticateToken,
  TutorController.updateSubjectPrice
);
router.delete(
  "/tutorsEducation/:id/:educationId",
  authenticateToken,
  TutorController.deleteEducation
);
router.delete(
  "/tutorsFileEducation/:id/:educationId",
  authenticateToken,
  TutorController.deleteDiploma
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
router.get(
  "/employees/orders",
  authenticateToken,
  EmployeeController.getAllOrders
);
router.patch(
  "/employees/orders/:id",
  authenticateToken,
  EmployeeController.updateOrderByAdmin
);
router.delete(
  "/employees/orders/:id",
  authenticateToken,
  EmployeeController.deleteOrderByAdmin
);
router.patch(
  "/employees/tutors/:id",
  authenticateToken,
  EmployeeController.updateTutorByAdmin
);
router.delete(
  "/employees/tutors/:id",
  authenticateToken,
  EmployeeController.deleteTutorByAdmin
);

// Роуты для заказа
router.post("/orders", authenticateToken, OrderController.createOrder);
router.get("/orders", authenticateToken, OrderController.getAllOrders);
router.get("/public/orders", OrderController.getAllOrdersPublic);
router.get("/orders/student/:studentId", OrderController.getOrdersByStudentId);
router.get("/orders/:id", authenticateToken, OrderController.getOrderById);
router.get("/public/orders/:id", OrderController.getOrderByIdPublic);
router.patch("/orders/:id", authenticateToken, OrderController.updateOrder);
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

// Роуты для городов, областей, локаций города и областей
router.post("/cities", LocationController.createCity);
router.post("/districts/:cityId", LocationController.createDistrict);
router.post("/metros/:districtId", LocationController.createMetro);
router.post("/regional-cities/:cityId", LocationController.createRegionalCity);
router.get("/cities", LocationController.getAllCity);
router.get("/city/:id", LocationController.getCityById);
router.put("/city/:id", LocationController.updateCityById);
router.put("/district/:id", LocationController.updateDistrictById);
router.put("/metro/:id", LocationController.updateMetroById);
router.put("/regional-city/:id", LocationController.updateRegionalCityById);

// Роуты для топиков (Topic)
router.post("/topics", authenticateToken, WikiController.createTopic);
router.get("/topics", WikiController.getAllTopics);
router.get("/topics/:id", WikiController.getTopicById);
router.patch("/topics/:id", authenticateToken, WikiController.updateTopic);
router.delete("/topics/:id", authenticateToken, WikiController.deleteTopic);

// Роуты для тем (Theme)
router.get("/themes", WikiController.getAllThemes);
router.get("/topics/:id/themes", WikiController.getThemesByTopic);
router.post(
  "/topics/:id/themes",
  authenticateToken,
  WikiController.createTheme
);
router.get("/themes/:id", WikiController.getThemeById);
router.patch("/themes/:id", authenticateToken, WikiController.updateTheme);
router.delete("/themes/:id", authenticateToken, WikiController.deleteTheme);

// Роуты для e-mail рассылок
router.post("/send-email", authenticateToken, MailController.sendEmail);
router.post(
  "/send-verification-email",
  authenticateToken,
  MailController.sendVerificationEmail
);

// Роуты для чатов и сообщений
router.post("/chat", authenticateToken, ChatController.createChat);
router.patch("/chat", authenticateToken, ChatController.updateChat);
router.post("/message", authenticateToken, ChatController.sendMessage);
router.put("/message", authenticateToken, ChatController.updateMessage);
router.get(
  "/order/:orderId/chats",
  authenticateToken,
  ChatController.getChatsByOrderId
);
router.get("/chat/:chatId", authenticateToken, ChatController.getChatById);
// Получение всех чатов для пользователя (тутора или студента)
router.get(
  "/user/:userId/role/:role/chats",
  authenticateToken,
  ChatController.getChatsByUserIdAndRole
);

module.exports = router;
