const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const fs = require("fs");

const EmployeeController = {
  // Создание сотрудника
  createEmployee: async (req, res) => {
    const { name, phone, email, region, role, status } = req.body;
    const userId = req.user.userID;

    if (!name || !phone || !status || !role) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const existingEmployee = await prisma.employee.findFirst({
        where: { phone: phone },
      });

      if (existingEmployee) {
        return res.status(400).json({
          error: "Сотрудник уже существует",
        });
      }

      const employee = await prisma.employee.create({
        data: {
          userId,
          name,
          phone,
          email: email || undefined,
          region: region || undefined,
          role,
          status,
        },
      });

      res.json(employee);
    } catch (error) {
      console.log("Error Create Employee", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение всех сотрудников
  getAllEmployees: async (req, res) => {
    try {
      const allEmployees = await prisma.employee.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!allEmployees) {
        return res
          .status(404)
          .json({ error: "Не найдено ни одного сотрудника" });
      }

      res.json(allEmployees);
    } catch (error) {
      console.error("Get All Employees Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Получение сотрудника по ID
  // getEmployeeById: async (req, res) => {
  //   res.send("getEmployeeById");
  // },
  // Получение текущего сотрудника по токену
  currentEmployee: async (req, res) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.userID },
      });

      if (!employee) {
        return res.status(400).json({ error: "Не удалось найти сотрудника" });
      }

      res.json(employee);
    } catch (error) {
      console.error("Current Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Изменение сотрудника
  // updateEmployee: async (req, res) => {
  //   res.send("updateEmployee");
  // },
  // // Удаление сотрудника
  // deleteEmployee: async (req, res) => {
  //   res.send("deleteEmployee");
  // },

  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /*****************ЗАКАЗЫ************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */

  // Получение всех заказов админом
  getAllOrdersByAdmin: async (req, res) => {
    const userId = req.user.userID;
    try {
      // 🔍 Проверка: является ли пользователь сотрудником
      const isAdmin = await prisma.employee.findUnique({
        where: {
          userId: userId,
        },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      const allOrders = await prisma.order.findMany({
        include: {
          student: {
            include: { user: true },
          },
          chats: {
            include: { tutor: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!allOrders) {
        return res.status(404).json({ error: "Не найдено ни одного заказа" });
      }

      res.json(allOrders);
    } catch (error) {
      console.error("Get All Orders Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение заказа по ID админом
  getOrderByIdByAdmin: async (req, res) => {
    const { id } = req.params;
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          student: true,
          chats: {
            include: {
              tutor: true,
              student: true,
              // messages: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      res.json(order);
    } catch (error) {
      console.error("Get Order By Id Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Обновление заказа админом
  updateOrderByAdmin: async (req, res) => {
    const { id } = req.params;
    const {
      studentType,
      studentYears,
      studentClass,
      studentCourse,
      studentUniversity,
      studentExam,
      studyMethod,
      studyProgramm,
      deadline,
      studentLevel,
      tutorGender,
      studentSchedule,
      studentPlace,
      studentAdress,
      studentHomeLoc,
      studentTrip,
      tutorType,
      autoContactsOnResponse,
      studentWishes,
      region,
      responseCost,
      status,
    } = req.body;
    const userId = req.user.userID;

    try {
      // 🔍 Проверка: является ли пользователь сотрудником
      const isAdmin = await prisma.employee.findUnique({
        where: {
          userId: userId,
        },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      // 🔍 Проверка на существование заказа
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          student: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      // ✏️ Обновление
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          studentType: studentType || undefined,
          studentYears: studentYears || undefined,
          studentClass: studentClass || undefined,
          studentCourse: studentCourse || undefined,
          studentUniversity: studentUniversity || undefined,
          studentExam: studentExam || undefined,
          studyMethod: studyMethod || undefined,
          studyProgramm: studyProgramm || undefined,
          deadline: deadline || undefined,
          studentLevel: studentLevel || undefined,
          tutorGender: tutorGender || undefined,
          studentSchedule: studentSchedule || undefined,
          studentPlace: studentPlace || undefined,
          studentAdress: studentAdress || undefined,
          studentHomeLoc: studentHomeLoc || undefined,
          studentTrip: studentTrip || undefined,
          tutorType: tutorType || undefined,
          autoContactsOnResponse: autoContactsOnResponse ?? false,
          studentWishes: studentWishes || undefined,
          region: region || undefined,
          responseCost: responseCost || undefined,
          status: status || undefined,
        },
        include: {
          chats: {
            include: {
              tutor: true,
              messages: true,
            },
          },
        },
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Update Order by Admin Error", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Удаление заказа админом
  deleteOrderByAdmin: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;

    try {
      // 🔍 Проверка: является ли пользователь сотрудником
      const isAdmin = await prisma.employee.findUnique({
        where: {
          userId: userId,
        },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      // 🔍 Проверка на существование заказа
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      // 🗑 Удаление
      await prisma.order.delete({ where: { id } });
      res.send("Заказ удалён сотрудником");
    } catch (error) {
      console.error("Delete Order by Admin Error", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

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

  // Получение всех репетиторов
  getAllTutorsByAdmin: async (req, res) => {
    try {
      const allTutors = await prisma.tutor.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: true,
          educations: true,
          subjectPrices: true, // Включаем связанные места образования
        },
      });

      if (!allTutors) {
        return res
          .status(404)
          .json({ error: "Не найдено ни одного репетитора" });
      }

      res.json(allTutors);
    } catch (error) {
      console.error("Get All Tutors Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение репетитора по ID
  getTutorByIdByAdmin: async (req, res) => {
    const { id } = req.params;

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          user: true,
          educations: true,
          subjectPrices: true, // Включаем связанные места образования
        },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      res.json({ tutor });
    } catch (error) {
      console.error("Get Tutor By Id Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Обновление репетитора админом
  updateTutorByAdmin: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;

    // Проверка: сотрудник ли пользователь
    const isAdmin = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "Доступ запрещён: только для сотрудников" });
    }

    const {
      name,
      email,
      isVerifedEmail,
      telegram,
      skype,
      subject,
      subjectComments,
      region,
      tutorPlace,
      tutorAdress,
      tutorTrip,
      tutorTripCityData,
      tutorTripCity,
      tutorTripArea,
      profileInfo,
      experience,
      badges,
      isGroup,
      status,
      isPublicProfile,
      isStudentResponses,
      isNotifications,
      isNotificationsOrders,
      isNotificationsResponse,
      isNotificationsPromo,
      isNotificationsSms,
      isNotificationsEmail,
      isNotificationsTelegram,
      isNotificationsMobilePush,
      isNotificationsWebPush,
      isNotificationsVk,
      lastOnline,
    } = req.body;

    let avatarUrl;
    if (req.file) {
      avatarUrl = req.file.filename;
    }

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
        include: { subjectPrices: true },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      const oldSubjects = tutor.subject || [];
      const newSubjects = subject || [];
      const removedSubjects = oldSubjects.filter(
        (subj) => !newSubjects.includes(subj)
      );

      if (subject !== undefined && removedSubjects.length > 0) {
        await prisma.tutorSubjectPrice.deleteMany({
          where: {
            tutorId: id,
            subjectId: { in: removedSubjects },
          },
        });
      }

      let updatedComments = tutor.subjectComments;

      if (subject !== undefined) {
        updatedComments = updatedComments.filter(
          (comment) => !removedSubjects.includes(comment.subjectId)
        );
      }

      if (subjectComments !== undefined) {
        const newSubjectIds = subjectComments.map((c) => c.subjectId);
        updatedComments = updatedComments.filter((comment) =>
          newSubjectIds.includes(comment.subjectId)
        );

        for (const newComment of subjectComments) {
          const existingIndex = updatedComments.findIndex(
            (c) => c.subjectId === newComment.subjectId
          );
          if (existingIndex !== -1) {
            updatedComments[existingIndex] = newComment;
          } else {
            updatedComments.push(newComment);
          }
        }
      }

      const currentTime = new Date();
      const lastOnlineTime = lastOnline ? new Date(lastOnline) : currentTime;

      const updatedTutor = await prisma.tutor.update({
        where: { id },
        data: {
          name: name || undefined,
          email: email || undefined,
          isVerifedEmail:
            isVerifedEmail !== undefined
              ? isVerifedEmail
              : tutor.isVerifedEmail,
          telegram: telegram || undefined,
          skype: skype || undefined,
          avatarUrl: avatarUrl ? `/uploads/${avatarUrl}` : tutor.avatarUrl,
          subject: subject || undefined,
          region: region || undefined,
          tutorPlace: tutorPlace || undefined,
          tutorAdress: tutorAdress || undefined,
          tutorTrip: tutorTrip || undefined,
          tutorTripCityData: tutorTripCityData || undefined,
          tutorTripCity: tutorTripCity || undefined,
          tutorTripArea: tutorTripArea || undefined,
          profileInfo: profileInfo || undefined,
          experience: experience || undefined,
          badges: badges !== undefined ? badges : tutor.badges,
          isGroup: isGroup !== undefined ? isGroup : tutor.isGroup,
          isPublicProfile:
            isPublicProfile !== undefined
              ? isPublicProfile
              : tutor.isPublicProfile,
          isStudentResponses:
            isStudentResponses !== undefined
              ? isStudentResponses
              : tutor.isStudentResponses,
          isNotifications:
            isNotifications !== undefined
              ? isNotifications
              : tutor.isNotifications,
          isNotificationsOrders:
            isNotificationsOrders !== undefined
              ? isNotificationsOrders
              : tutor.isNotificationsOrders,
          isNotificationsResponse:
            isNotificationsResponse !== undefined
              ? isNotificationsResponse
              : tutor.isNotificationsResponse,
          isNotificationsPromo:
            isNotificationsPromo !== undefined
              ? isNotificationsPromo
              : tutor.isNotificationsPromo,
          isNotificationsSms:
            isNotificationsSms !== undefined
              ? isNotificationsSms
              : tutor.isNotificationsSms,
          isNotificationsEmail:
            isNotificationsEmail !== undefined
              ? isNotificationsEmail
              : tutor.isNotificationsEmail,
          isNotificationsTelegram:
            isNotificationsTelegram !== undefined
              ? isNotificationsTelegram
              : tutor.isNotificationsTelegram,
          isNotificationsVk:
            isNotificationsVk !== undefined
              ? isNotificationsVk
              : tutor.isNotificationsVk,
          isNotificationsMobilePush:
            isNotificationsMobilePush !== undefined
              ? isNotificationsMobilePush
              : tutor.isNotificationsMobilePush,
          isNotificationsWebPush:
            isNotificationsWebPush !== undefined
              ? isNotificationsWebPush
              : tutor.isNotificationsWebPush,
          status: status || undefined,
          lastOnline: lastOnlineTime,
          ...(subject !== undefined || subjectComments !== undefined
            ? {
                subjectComments: JSON.parse(
                  JSON.stringify([...updatedComments])
                ),
              }
            : {}),
        },
        include: { subjectPrices: true },
      });

      const tutorNew = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true,
          subjectPrices: true,
        },
      });

      res.json(tutorNew);
    } catch (error) {
      console.error("Update Tutor by Admin Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление репетитора админом
  // СДЕЛАТЬ УДАЛЕНИЕ ФОТОГРАФИЙ АВАТАРОВ И ДОКУМЕНТОВ!! ОТКЛИКИ И ПЕРЕПИСКУ НЕ УДАЛЯТЬ
  deleteTutorByAdmin: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;

    try {
      // Проверяем, является ли пользователь сотрудником
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // // Удаляем отклики этого репетитора
      // await prisma.response.deleteMany({
      //   where: {
      //     tutorId: id,
      //   },
      // });

      // Удаляем самого репетитора
      await prisma.tutor.delete({
        where: { id },
      });

      res.send("Репетитор удалён администратором");
    } catch (error) {
      console.error("Delete Tutor by Admin Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateTutorAvatarByAdmin: async (req, res) => {
    const { id } = req.params;

    // Проверяем, есть ли загруженный файл
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    const avatarUrl = req.file.filename; // Получаем имя загруженного файла

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Обновляем фотографию
      const updatedTutor = await prisma.tutor.update({
        where: { id },
        data: {
          avatarUrl: `/uploads/${avatarUrl}`, // Указываем путь к загруженному файлу
        },
      });

      res.json(updatedTutor);
    } catch (error) {
      console.error("Update Tutor Avatar Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Контроллер для удаления аватара репетитора
  deleteTutorAvatarByAdmin: async (req, res) => {
    try {
      const { id } = req.params;

      // Найти репетитора в базе данных
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ message: "Репетитор не найден" });
      }

      // Проверить, есть ли у репетитора аватар
      if (!tutor.avatarUrl) {
        return res
          .status(400)
          .json({ message: "У репетитора нет аватара для удаления" });
      }

      // Удалить файл аватара с сервера
      const avatarPath = path.resolve(
        "uploads",
        tutor.avatarUrl.replace(/^\/uploads\//, "")
      ); // Убираем /uploads из пути
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath); // Удаление файла
      }

      // Обновляем фотографию
      const updatedTutor = await prisma.tutor.update({
        where: { id },
        data: {
          avatarUrl: null, // Указываем путь к загруженному файлу
        },
      });

      res.json(updatedTutor);
    } catch (error) {
      console.error("Ошибка при удалении аватара:", error);
      res.status(500).json({ message: "Ошибка при удалении аватара" });
    }
  },

  // Добавление нового места образования
  addEducationByAdmin: async (req, res) => {
    const {
      educationInfo,
      educationStartYear,
      educationEndYear,
      isShowDiplom,
    } = req.body;
    const { id } = req.params;

    if (!educationInfo || !educationStartYear) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      let diplomaUrls = [];

      if (req.files && req.files.length > 0) {
        diplomaUrls = req.files.map(
          (file) => `/uploads/diplomas/${file.filename}`
        );
      }

      const education = await prisma.tutorEducation.create({
        data: {
          tutorId: id,
          educationInfo,
          educationStartYear: educationStartYear,
          educationEndYear: educationEndYear ? educationEndYear : null,
          educationDiplomUrl: diplomaUrls, // Сохраняем массив URL
          isShowDiplom: isShowDiplom === "true",
        },
      });

      const updatedTutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        },
      });

      res.json(updatedTutor);
    } catch (error) {
      console.error("Error adding education:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Обновление места образования
  updateEducationByAdmin: async (req, res) => {
    const {
      educationInfo,
      educationStartYear,
      educationEndYear,
      isShowDiplom,
    } = req.body;
    const { id, educationId } = req.params; // id репетитора и id образования

    if (!educationInfo || !educationStartYear) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      // Проверяем, существует ли репетитор
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      let diplomaUrls = [];

      if (req.files && req.files.length > 0) {
        diplomaUrls = req.files.map(
          (file) => `/uploads/diplomas/${file.filename}`
        );
      }

      // Проверяем, существует ли образование
      const education = await prisma.tutorEducation.findUnique({
        where: { id: educationId },
      });

      if (!education) {
        return res.status(404).json({ error: "Место образования не найдено" });
      }

      // Обновляем место образования
      const updatedEducation = await prisma.tutorEducation.update({
        where: { id: educationId },
        data: {
          educationInfo,
          educationStartYear,
          educationEndYear,
          educationDiplomUrl:
            diplomaUrls.length > 0
              ? [...education.educationDiplomUrl, ...diplomaUrls] // Добавляем новые дипломы к старым
              : education.educationDiplomUrl, // Если новых дипломов нет, оставляем старые
          isShowDiplom: isShowDiplom === "true", // Если приходит как строка
        },
      });

      // Возвращаем обновленного репетитора с местами образования
      const updatedTutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        },
      });

      res.json(updatedTutor);
    } catch (error) {
      console.error("Error updating education:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление места образования
  deleteEducationByAdmin: async (req, res) => {
    const { id, educationId } = req.params; // id репетитора и id образования

    try {
      // Проверяем, существует ли репетитор
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Проверяем, существует ли образование
      const education = await prisma.tutorEducation.findUnique({
        where: { id: educationId },
      });

      if (!education) {
        return res.status(404).json({ error: "Место образования не найдено" });
      }

      // Если у образования есть файлы дипломов, удаляем их
      if (
        education.educationDiplomUrl &&
        Array.isArray(education.educationDiplomUrl)
      ) {
        education.educationDiplomUrl.forEach((diplomUrl) => {
          const diplomPath = path.resolve(
            "uploads/diplomas", // Папка, где хранятся дипломы
            diplomUrl.replace(/^\/uploads\/diplomas\//, "") // Убираем /uploads/diplomas из пути
          );

          if (fs.existsSync(diplomPath)) {
            try {
              fs.unlinkSync(diplomPath); // Удаление файла диплома
            } catch (err) {
              console.error(`Не удалось удалить файл: ${diplomPath}`, err);
            }
          }
        });
      }

      // Удаляем место образования
      await prisma.tutorEducation.delete({
        where: { id: educationId },
      });

      // Обновляем репетитора, чтобы вернуть его данные с актуализированным списком образований
      const updatedTutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        },
      });

      // Возвращаем обновленного репетитора
      res.json(updatedTutor);
    } catch (error) {
      console.error("Ошибка при удалении образования:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление документа из образования
  deleteDiplomaByAdmin: async (req, res) => {
    const { id, educationId } = req.params;
    const { fileName } = req.body; // Получаем имя файла из тела запроса

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      const education = await prisma.tutorEducation.findUnique({
        where: { id: educationId },
      });

      if (!education) {
        return res.status(404).json({ error: "Место образования не найдено" });
      }

      // Удаляем конкретный файл
      const filePath = path.resolve("uploads/diplomas", fileName); // Путь к файлу
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Удаляем файл
      }

      // Обновляем данные о дипломах
      const updatedEducation = await prisma.tutorEducation.update({
        where: { id: educationId },
        data: {
          educationDiplomUrl: {
            // Убираем удаленное фото из списка
            set: education.educationDiplomUrl.filter(
              (url) => !url.includes(fileName)
            ),
          },
        },
      });

      // Обновляем репетитора, чтобы вернуть его данные с актуализированным списком образований
      const updatedTutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        },
      });

      return res.json(updatedTutor);
    } catch (error) {
      console.error("Ошибка при удалении фото:", error);
      res.status(500).json({ error: "Произошла ошибка при удалении фото" });
    }
  },

  // Добавление новой цены по предмету
  addSubjectPriceByAdmin: async (req, res) => {
    const { tutorId, subjectId, format, price, duration } = req.body;

    try {
      await prisma.tutorSubjectPrice.create({
        data: {
          tutorId,
          subjectId,
          format,
          price: Number(price),
          duration,
        },
      });

      // Получаем репетитора с актуальными ценами
      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        }, // Загружаем цены
      });

      res.status(201).json(tutor);
    } catch (error) {
      console.error("Add Subject Price Error:", error);
      res.status(500).json({ error: "Ошибка при добавлении цены" });
    }
  },

  // Обновление цены по предмету
  updateSubjectPriceByAdmin: async (req, res) => {
    const { id } = req.params; // Берем ID цены из URL
    const { price, duration } = req.body;

    try {
      const existingPrice = await prisma.tutorSubjectPrice.findUnique({
        where: { id },
      });

      if (!existingPrice) {
        return res.status(404).json({ error: "Цена не найдена" });
      }

      await prisma.tutorSubjectPrice.update({
        where: { id },
        data: {
          price: Number(price),
          duration,
        },
      });

      // Получаем обновленного репетитора с ценами
      const tutor = await prisma.tutor.findUnique({
        where: { id: existingPrice.tutorId },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        },
      });

      res.json(tutor);
    } catch (error) {
      console.error("Update Subject Price Error:", error);
      res.status(500).json({ error: "Ошибка при обновлении цены" });
    }
  },
};

module.exports = EmployeeController;
