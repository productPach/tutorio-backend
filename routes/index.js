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
  SubjectController,
  ContractController,
  ReviewController,
} = require("../controllers");
const authenticateToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ПОЛЬЗОВАТЕЛИ************ */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************УЧЕНИКИ***************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************РЕПЕТИТОРЫ************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************СОТРУДНИКИ************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для сотрудника
router.post("/employees", authenticateToken, EmployeeController.createEmployee);
router.get(
  "/currentEmployee",
  authenticateToken,
  EmployeeController.currentEmployee
);
router.get("/employees", authenticateToken, EmployeeController.getAllEmployees);
// router.get(
//   "/employees/:id",
//   authenticateToken,
//   EmployeeController.getEmployeeById
// );
// router.put(
//   "/employees/:id",
//   authenticateToken,
//   EmployeeController.updateEmployee
// );
// router.delete(
//   "/employees/:id",
//   authenticateToken,
//   EmployeeController.deleteEmployee
// );
router.get(
  "/employees/orders",
  authenticateToken,
  EmployeeController.getAllOrdersByAdmin
);
router.get(
  "/employees/orders/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.getOrderByIdByAdmin
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
router.get(
  "/employees/tutors",
  authenticateToken,
  isAdmin,
  EmployeeController.getAllTutorsByAdmin
);
router.get(
  "/employees/tutors/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.getTutorByIdByAdmin
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
// Роут для обновления фотографии репетитора
router.put(
  "/employees/tutors/:id/avatar",
  authenticateToken,
  isAdmin,
  uploads.single("avatar"),
  (req, res, next) => {
    console.log(req.file); // Логируем файл
    next();
  },
  EmployeeController.updateTutorAvatarByAdmin
);
router.delete(
  "/employees/tutors/:id/avatar",
  authenticateToken,
  isAdmin,
  EmployeeController.deleteTutorAvatarByAdmin
);
router.post(
  "/employees/tutorsEducation/:id",
  authenticateToken,
  isAdmin,
  diplomaUploads.array("diploma", 5),
  EmployeeController.addEducationByAdmin
);
router.patch(
  "/employees/tutorsEducation/:id/:educationId",
  authenticateToken,
  isAdmin,
  diplomaUploads.array("diploma", 5),
  EmployeeController.updateEducationByAdmin
);
router.delete(
  "/employees/tutorsEducation/:id/:educationId",
  authenticateToken,
  isAdmin,
  EmployeeController.deleteEducationByAdmin
);
router.delete(
  "/employees/tutorsFileEducation/:id/:educationId",
  authenticateToken,
  isAdmin,
  EmployeeController.deleteDiplomaByAdmin
);
router.post(
  "/employees/tutorsSubjectPrice",
  authenticateToken,
  isAdmin,
  EmployeeController.addSubjectPriceByAdmin
);
router.patch(
  "/employees/tutorsSubjectPrice/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.updateSubjectPriceByAdmin
);
router.post(
  "/employees/delete-request-tutor/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.deleteRequestTutorByAdmin
);
router.post(
  "/employees/delete-request-student/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.deleteRequestStudentByAdmin
);
router.post(
  "/employees/init-tutor-fields",
  authenticateToken,
  EmployeeController.initTutorFieldsOnce
);

router.patch(
  "/employees/chats",
  authenticateToken,
  isAdmin,
  EmployeeController.updateChats
);

// Создание отзыва
router.post(
  "/employees/review",
  authenticateToken,
  isAdmin,
  EmployeeController.createReviewByAdmin
);

// Создание комментария
router.post(
  "/employees/comment",
  authenticateToken,
  isAdmin,
  EmployeeController.createCommentByAdmin
);

// Обновление отзыва
router.patch(
  "/employees/review/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.updateReviewByAdmin
);

// Обновление комментария
router.patch(
  "/employees/comment/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.updateCommentByAdmin
);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ЗАКАЗЫ****************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для заказа
router.post("/orders", authenticateToken, OrderController.createOrder);
router.get("/orders", authenticateToken, OrderController.getAllOrders);
router.get("/public/orders", OrderController.getAllOrdersPublic);
router.get("/orders/student/:studentId", OrderController.getOrdersByStudentId);
router.get("/orders/:id", authenticateToken, OrderController.getOrderById);
router.get("/public/orders/:id", OrderController.getOrderByIdPublic);
router.patch("/orders/:id", authenticateToken, OrderController.updateOrder);
router.delete("/orders/:id", authenticateToken, OrderController.deleteOrder);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ВЕЛКОМ-СКРИНЫ*********** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ЛОКАЦИИ***************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для городов, областей, локаций города и областей
router.post("/cities", authenticateToken, LocationController.createCity);
router.post(
  "/districts/:cityId",
  authenticateToken,
  LocationController.createDistrict
);
router.post(
  "/metros/:districtId",
  authenticateToken,
  LocationController.createMetro
);
router.post(
  "/regional-cities/:cityId",
  authenticateToken,
  LocationController.createRegionalCity
);
router.get("/cities", LocationController.getAllCity);
router.get("/city/:id", LocationController.getCityById);
router.put("/city/:id", authenticateToken, LocationController.updateCityById);
router.put(
  "/district/:id",
  authenticateToken,
  LocationController.updateDistrictById
);
router.put("/metro/:id", authenticateToken, LocationController.updateMetroById);
router.put(
  "/regional-city/:id",
  authenticateToken,
  LocationController.updateRegionalCityById
);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ПРЕДМЕТЫ**************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для предметов
router.post(
  "/subjects",
  authenticateToken,
  isAdmin,
  SubjectController.createSubject
);
router.get("/subjects", SubjectController.getAllSubjects);
router.get("/subjects/:id", SubjectController.getSubjectById);
router.patch(
  "/subjects/:id",
  authenticateToken,
  isAdmin,
  SubjectController.updateSubject
);
router.delete(
  "/subjects/:id",
  authenticateToken,
  isAdmin,
  SubjectController.deleteSubject
);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ТОПИКИ****************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для топиков (Topic)
router.post("/topics", authenticateToken, WikiController.createTopic);
router.get("/topics", WikiController.getAllTopics);
router.get("/topics/:id", WikiController.getTopicById);
router.patch("/topics/:id", authenticateToken, WikiController.updateTopic);
router.delete("/topics/:id", authenticateToken, WikiController.deleteTopic);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ТЕМЫ******************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/**************E-MAIL РАССЫЛКИ************ */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для e-mail рассылок
router.post("/send-email", authenticateToken, MailController.sendEmail);
router.post(
  "/send-verification-email",
  authenticateToken,
  MailController.sendVerificationEmail
);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/**************ЧАТЫ И СООБЩЕНИЯ*********** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************КОНТРАКТЫ***************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Создание контракта
router.post("/contract", authenticateToken, ContractController.createContract);
// Отмена контракта
router.post(
  "/contract/:id/cancel",
  authenticateToken,
  ContractController.cancelContract
);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************ОТЗЫВЫ****************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Создание отзыва
router.post("/review", authenticateToken, ReviewController.createReviewByUser);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*****************КОММЕНТАРИИ************* */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Создание комментария
router.post(
  "/comment",
  authenticateToken,
  ReviewController.createCommentByUser
);

module.exports = router;
