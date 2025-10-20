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
  NotificationController,
  GoalController,
  SmsController,
  LandingController,
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

router.post("/sms/secret", SmsController.sendSms);
router.post("/sms/verify", SmsController.verifyCode);
router.post(
  "/sms/verify-update",
  authenticateToken,
  SmsController.verifyCodeAndUpdatePhone
);

// Роуты для пользователя
router.post("/register-user", UserController.register);
router.post("/login", UserController.login);
router.post("/refresh", UserController.refreshTokens);
router.post("/logout", authenticateToken, UserController.logout);

router.get(
  "/sessions",
  authenticateToken,
  UserController.getUserActiveSessions
);
router.post(
  "/sessions/revoke",
  authenticateToken,
  UserController.revokeSession
);

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
// Получение телефона ученика по ID
router.get(
  "/students/:id/phone",
  authenticateToken,
  StudentController.getStudentPhoneById
);
// Получение ученика по телефону
router.post("/students-phone", StudentController.getStudentByPhone);
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
// Получение телефона репетитора по ID
router.get(
  "/tutors/:id/phone",
  authenticateToken,
  TutorController.getTutorPhoneById
);
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
router.get(
  "/tutors/:tutorId/incompleteSubjectPrice",
  authenticateToken,
  TutorController.incompleteSubjectPrices
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
// Роуты для управления целями
router.get(
  "/tutors/:tutorId/:subjectId/goals",
  authenticateToken,
  TutorController.getTutorGoalsBySubject
);
router.get(
  "/tutors/:tutorId/goals",
  authenticateToken,
  TutorController.getTutorSelectedGoalsGrouped
);
router.get(
  "/tutors/:tutorId/subjectsWithGoals",
  authenticateToken,
  TutorController.getTutorSubjectsWithGoals
);
router.patch(
  "/tutors/:tutorId/:subjectId/goals",
  authenticateToken,
  TutorController.updateTutorGoalsBySubject
);
router.get(
  "/tutors/order/:orderId",
  authenticateToken,
  TutorController.getTutorsForOrderById
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
// Получение сотрудника по телефону
router.post("/employee-phone", EmployeeController.getEmployeeByPhone);
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
  "/employees/orders/:orderId/relevant-tutors",
  authenticateToken,
  isAdmin,
  EmployeeController.getRelevantTutorsForOrder
);

router.patch(
  "/employees/orders/:id/publish",
  authenticateToken,
  isAdmin,
  EmployeeController.publishOrder
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
// router.post(
//   "/employees/init-tutor-fields",
//   authenticateToken,
//   EmployeeController.initTutorFieldsOnce
// );

router.get(
  "/employees/:tutorId/incompleteSubjectPrice",
  authenticateToken,
  isAdmin,
  EmployeeController.incompleteSubjectPrices
);
// Роуты для управления целями
router.get(
  "/employees/:tutorId/:subjectId/goals",
  authenticateToken,
  isAdmin,
  EmployeeController.getTutorGoalsBySubject
);
router.get(
  "/employees/:tutorId/goals",
  authenticateToken,
  isAdmin,
  EmployeeController.getTutorSelectedGoalsGrouped
);
router.get(
  "/employees/:tutorId/subjectsWithGoals",
  authenticateToken,
  isAdmin,
  EmployeeController.getTutorSubjectsWithGoals
);
router.patch(
  "/employees/:tutorId/:subjectId/goals",
  authenticateToken,
  isAdmin,
  EmployeeController.updateTutorGoalsBySubject
);
router.post(
  "/employees/recalculate-rating-tutor-all",
  authenticateToken,
  isAdmin,
  EmployeeController.recalculateRatingTutorAll
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

// Получение всех отзывов
router.get(
  "/employees/review",
  authenticateToken,
  isAdmin,
  EmployeeController.getAllReviews
);

// Получение всех отзывов
router.get(
  "/employees/review/:id",
  authenticateToken,
  isAdmin,
  EmployeeController.getReviewById
);

// Удаление отзыва по ID
router.delete("/employees/review/:id", EmployeeController.deleteReviewById);

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
/****************УВЕДОМЛЕНИЯ************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
// Генерация ссылки для подключения Telegram
router.post("/telegram/connect", NotificationController.connectTelegram);
// Вебхук от Telegram
router.post("/telegram/webhook", NotificationController.telegramWebhook);
// Проверка подключения Telegram через webhook
router.post("/telegram/connectWebhook", NotificationController.connectWebhook);
// Отправка уведомлений о новом заказе
router.post(
  "/order/:orderId/notifications/new-order",
  NotificationController.notifyTutorsForOrder
);

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
  "/districts/:cityId/bulk",
  authenticateToken,
  LocationController.createDistrictsBulk
);
router.post(
  "/metros/:cityId",
  authenticateToken,
  LocationController.createMetro
);
router.post(
  "/metros/:cityId/bulk",
  authenticateToken,
  LocationController.createMetrosToCityBulk
);
router.post(
  "/regional-cities/:cityId",
  authenticateToken,
  LocationController.createRegionalCity
);
router.post(
  "/regional-cities/:cityId/bulk",
  authenticateToken,
  LocationController.createRegionalCitiesBulk
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
router.get("/region", LocationController.detectUserRegion);

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

// Наполнение полей goalCategoryId, goal_id и nextPage для предметов
router.patch(
  "/subjects/update-subjects-data",
  authenticateToken,
  isAdmin,
  SubjectController.migrateGoalIdsToGoalCategories
);

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
// Получение целей для конкретного предмета
router.get("/subjects/:subjectId/goals", SubjectController.getGoalsBySubject);

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/*************ЦЕЛИ И КАТЕГОРИИ************ */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Роуты для целей
router.post("/goals", authenticateToken, isAdmin, GoalController.createGoal);
router.get("/goals", GoalController.getAllGoals);
router.get("/goals/:id", GoalController.getGoalById);
router.patch(
  "/goals/:id",
  authenticateToken,
  isAdmin,
  GoalController.updateGoal
);

// Привязка целей к категории
router.patch(
  "/categories-goals/:id/goals",
  authenticateToken,
  isAdmin,
  GoalController.updateCategoryGoals
);
router.delete(
  "/goals/:id",
  authenticateToken,
  isAdmin,
  GoalController.deleteGoal
);

// Роуты для категорий целей
router.post(
  "/categories-goals",
  authenticateToken,
  isAdmin,
  GoalController.createCategory
);
router.get("/categories-goals", GoalController.getAllCategories);
router.get("/categories-goals/:id", GoalController.getCategoryById);
router.patch(
  "/categories-goals/:id",
  authenticateToken,
  isAdmin,
  GoalController.updateCategory
);
// Привязка категорий к цели
router.patch(
  "/goals/:id/categories",
  authenticateToken,
  isAdmin,
  GoalController.updateGoalCategories
);
router.delete(
  "/categories-goals/:id",
  authenticateToken,
  isAdmin,
  GoalController.deleteCategory
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

// Обновление отзыва (можно менять только текст и рейтинг)
router.patch(
  "/review/:id",
  authenticateToken,
  ReviewController.updateReviewByUser
);

// Получение отзывов по репетитору
router.get(
  "/review/tutor/:tutorId",
  authenticateToken,
  ReviewController.getReviewsByTutorId
);

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

/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/************SITEMAP И ЛЕНДИНГИ*********** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */
/***************************************** */

// Получение предметов, по которым есть хотя бы один репетитор
router.get("/landing/subjects", LandingController.getSubjectWithTutor);
// Получение категорий, по которым есть хотя бы один репетитор
router.get(
  "/landing/subject/:for_chpu",
  LandingController.getCategoryWithTutor
);

module.exports = router;
