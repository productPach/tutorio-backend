const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const fs = require("fs");
const findTutorsForOrders = require("../services/findTutorsForOrder");
const {
  recalculateAllTutorRatings,
} = require("../services/rating/recalculateAllTutorRatings");
const { getNextSequence } = require("../services/counterId/counterId");

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

      // Получаем актуальный номер сущности в каунтере для создания человекопонятного ID
      const employeeNumber = await getNextSequence("employee");

      const employee = await prisma.employee.create({
        data: {
          employeeNumber,
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

  // Получение студента по номеру телефона
  getEmployeeByPhone: async (req, res) => {
    const { phone } = req.body;

    try {
      const existingEmployee = await prisma.employee.findFirst({
        where: { phone: phone },
      });

      if (!existingEmployee) {
        return res.status(400).json({
          error: "Сотрудника не существует",
        });
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error("Get Employee By Phone Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

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
          contracts: {
            where: {
              canceledAt: null,
            },
            select: {
              tutorId: true,
            },
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
          contracts: {
            where: {
              canceledAt: null,
            },
            select: {
              tutorId: true,
              tutor: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  userRating: true,
                  // reviewsCount: true,
                  reviews: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const selectedTutors = Array.isArray(order.contracts)
        ? order.contracts.map((c) => ({
            id: c.tutorId,
            name: c.tutor?.name ?? "",
            avatarUrl: c.tutor?.avatarUrl ?? "",
            userRating: c.tutor?.userRating,
            // reviewsCount: c.tutor?.reviewsCount,
            reviews: c.tutor?.reviews,
          }))
        : [];

      res.json({
        ...order,
        selectedTutors,
      });
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
      goalId, // ID цели в БД
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
          goalId: goalId || undefined, // сохраняем ссылку на цель в БД
          status: status || undefined,
        },
        include: {
          chats: {
            include: {
              tutor: true,
              messages: true,
            },
          },
          contracts: {
            where: {
              canceledAt: null,
            },
            select: {
              tutorId: true,
              tutor: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  userRating: true,
                  reviewsCount: true,
                },
              },
            },
          },
        },
      });

      res.json({
        ...updatedOrder,
      });
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

  // Подходящие репетиторы для заказа
  getRelevantTutorsForOrder: async (req, res) => {
    const { orderId } = req.params;

    try {
      // Получаем заказ
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          subject: true,
          goalId: true,
          studentPlace: true,
          region: true,
          studentTrip: true,
          studentHomeLoc: true,
          tutorType: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      // Подбираем репетиторов
      const tutors = await findTutorsForOrders(order);
      console.log(`Заказ ${orderId}: ${tutors.length} tutors`);

      // Считаем, кому реально уйдет рассылка
      let telegramCount = 0;
      let emailCount = 0;

      tutors.forEach((tutor) => {
        if (
          tutor.isNotifications &&
          tutor.isNotificationsOrders &&
          tutor.isNotificationsTelegram &&
          tutor.telegramId
        )
          telegramCount++;
        if (
          tutor.isNotifications &&
          tutor.isNotificationsOrders &&
          tutor.isNotificationsEmail &&
          tutor.isVerifedEmail &&
          tutor.email
        )
          emailCount++;
      });

      res.json({
        total: tutors.length,
        telegram: telegramCount,
        email: emailCount,
      });
    } catch (err) {
      console.error("getRelevantTutorsForOrder Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Отдельный endpoint для публикации заказа
  publishOrder: async (req, res) => {
    const { id } = req.params;

    try {
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

      // ✅ Дополнительные проверки готовности заказа к публикации
      const validationErrors = [];

      if (!order.responseCost)
        validationErrors.push("Не указана стоимость отклика");

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Заказ не готов к публикации",
          details: validationErrors,
        });
      }

      // ✏️ Обновление - устанавливаем publishedAt и статус
      const publishedOrder = await prisma.order.update({
        where: { id },
        data: {
          publishedAt: new Date(), // Дата публикации
          status: "Active", // Явный статус публикации
        },
      });

      res.json({
        message: "Заказ успешно опубликован",
        order: publishedOrder,
      });
    } catch (error) {
      console.error("Publish Order Error", error);
      res.status(500).json({ error: "Ошибка при публикации заказа" });
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
          contracts: true,
          reviews: true,
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
          user: {
            include: {
              deletedRequests: true, // Включаем связанные запросы на удаление
            },
          },
          educations: true,
          subjectPrices: true, // Включаем связанные места образования
          contracts: {
            include: {
              order: true,
            },
          },
          reviews: {
            include: {
              student: true,
              tutor: true,
              order: true,
              comments: true,
            },
          },
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
      tutorHomeLoc,
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
      hasQualityAvatar,
    } = req.body;

    let avatarUrl;
    if (req.file) {
      avatarUrl = req.file.filename;
    }

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
        include: { subjectPrices: true, educations: true },
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

      // 📌 Автоматический пересчёт логических флагов
      const autoHasSubjectPrices =
        tutor.subjectPrices && tutor.subjectPrices.length > 0;
      const autoHasPriceComments =
        Array.isArray(updatedComments) &&
        updatedComments.some((c) => c.comment && c.comment.trim().length > 0);
      const profileText = profileInfo || tutor.profileInfo || "";
      const autoHasProfileInfo = profileText.replace(/\s/g, "").length >= 300;
      const autoHasEducation = tutor.educations && tutor.educations.length > 0;
      const autoHasEducationPhotos =
        tutor.educations &&
        tutor.educations.some(
          (edu) =>
            Array.isArray(edu.educationDiplomUrl) &&
            edu.educationDiplomUrl.length > 0
        );

      const currentTime = new Date();

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
          tutorHomeLoc: tutorHomeLoc || undefined,
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

          hasQualityAvatar:
            hasQualityAvatar !== undefined
              ? hasQualityAvatar
              : tutor.hasQualityAvatar,

          hasSubjectPrices: autoHasSubjectPrices,
          hasPriceComments: autoHasPriceComments,
          hasProfileInfo: autoHasProfileInfo,
          hasEducation: autoHasEducation,
          hasEducationPhotos: autoHasEducationPhotos,

          status: status || undefined,
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

  // Запрос на удаление репетитора от админа
  deleteRequestTutorByAdmin: async (req, res) => {
    const { id } = req.params;
    const { answer } = req.body; // Получаем причину удаления

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Проверяем, существует ли уже запрос на удаление для репетитора
      const existingRequest = await prisma.deletedRequest.findUnique({
        where: {
          userId_role: {
            userId: tutor.userId,
            role: "tutor",
          },
        },
      });

      if (existingRequest) {
        return res
          .status(409)
          .json({ message: "Запрос на удаление уже существует" });
      }

      // Устанавливаем дату удаления через 30 дней
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const deleteRequest = await prisma.deletedRequest.create({
        data: {
          userId: tutor.userId,
          role: "tutor", // Теперь указываем роль
          answer, // Сохраняем причину удаления
          requestedAt: new Date(),
          expiresAt,
        },
      });

      res.status(201).json(deleteRequest);
    } catch (error) {
      console.error("Delete Request Tutor Error", error);
      res.status(500).json({ error: "Ошибка сервера" });
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

      // Проверяем, есть ли у репетитора образование (после создания)
      const educations = await prisma.tutorEducation.findMany({
        where: { tutorId: id },
      });

      const hasEducation = educations.length > 0;
      const hasEducationPhotos = educations.some(
        (edu) =>
          Array.isArray(edu.educationDiplomUrl) &&
          edu.educationDiplomUrl.length > 0
      );

      const updatedTutor = await prisma.tutor.update({
        where: { id },
        data: {
          hasEducation,
          hasEducationPhotos,
        },
        include: {
          educations: true,
          subjectPrices: true,
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

      // Получаем актуальные места образования
      const educations = await prisma.tutorEducation.findMany({
        where: { tutorId: id },
      });

      // Пересчёт autoHasEducationPhotos
      const autoHasEducationPhotos = educations.some(
        (edu) =>
          Array.isArray(edu.educationDiplomUrl) &&
          edu.educationDiplomUrl.length > 0
      );

      // Возвращаем обновленного репетитора с местами образования
      const updatedTutor = await prisma.tutor.update({
        where: { id },
        data: {
          hasEducationPhotos: autoHasEducationPhotos,
        },
        include: {
          educations: true,
          subjectPrices: true,
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

      // Проверяем, есть ли у репетитора образование (после создания)
      const educations = await prisma.tutorEducation.findMany({
        where: { tutorId: id },
      });

      const hasEducation = educations.length > 0;
      const hasEducationPhotos = educations.some(
        (edu) =>
          Array.isArray(edu.educationDiplomUrl) &&
          edu.educationDiplomUrl.length > 0
      );

      // Обновляем репетитора, чтобы вернуть его данные с актуализированным списком образований
      const updatedTutor = await prisma.tutor.update({
        where: { id },
        data: { hasEducation, hasEducationPhotos },
        include: {
          educations: true,
          subjectPrices: true,
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

  // Запрос на удаление ученика от админа
  deleteRequestStudentByAdmin: async (req, res) => {
    const { id } = req.params;
    const { answer } = req.body; // Получаем причину удаления

    try {
      const student = await prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        return res.status(404).json({ error: "Ученик не найден" });
      }

      // Проверяем, существует ли уже запрос на удаление для репетитора
      const existingRequest = await prisma.deletedRequest.findUnique({
        where: {
          userId_role: {
            userId: student.userId,
            role: "student",
          },
        },
      });

      if (existingRequest) {
        return res
          .status(409)
          .json({ message: "Запрос на удаление уже существует" });
      }

      // Устанавливаем дату удаления через 30 дней
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const deleteRequest = await prisma.deletedRequest.create({
        data: {
          userId: student.userId,
          role: "student", // Теперь указываем роль
          answer, // Сохраняем причину удаления
          requestedAt: new Date(),
          expiresAt,
        },
      });

      res.status(201).json(deleteRequest);
    } catch (error) {
      console.error("Delete Request Student Error", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // initTutorFieldsOnce: async (req, res) => {
  //   try {
  //     const tutors = await prisma.tutor.findMany({
  //       select: { id: true },
  //     });

  //     let updatedCount = 0;

  //     for (const tutor of tutors) {
  //       await prisma.tutor.update({
  //         where: { id: tutor.id },
  //         data: {
  //           publicRating: 4.5,
  //           internalRating: 4.5,
  //           employeesRating: 0,
  //           contractCount: 0,
  //           contractRejectCount: 0,
  //           averagePay: 0,
  //           refundsPayCount: 0,
  //           reviewsCount: 0,
  //           averageReviewScore: 0,
  //           responseTimeSeconds: 0,
  //           responseCount: 0,
  //           sessionCount: 0,
  //           hasQualityAvatar: false,
  //           hasSubjectPrices: false,
  //           hasPriceComments: false,
  //           hasProfileInfo: false,
  //           hasEducation: false,
  //           hasEducationPhotos: false,
  //         },
  //       });

  //       updatedCount++;
  //     }

  //     res.json({ message: `✅ Обновлено ${updatedCount} репетиторов` });
  //   } catch (error) {
  //     console.error("❌ Ошибка инициализации полей репетитора:", error);
  //     res.status(500).json({ error: "Ошибка при инициализации данных" });
  //   }
  // },
  // ***************************************** */

  // Проверка предметов без полной стоимости
  incompleteSubjectPrices: async (req, res) => {
    try {
      const tutorId = req.params.tutorId;

      if (!tutorId) {
        return res.status(400).json({ error: "ID репетитора обязателен" });
      }

      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
        select: { subjectPrices: true, subject: true },
      });

      if (!tutor) {
        return res.status(400).json({ error: "Не удалось найти репетитора" });
      }

      const subjectsWithoutFullPrices = tutor.subject
        .map((subjId) => {
          const pricesForSubject = tutor.subjectPrices.filter(
            (p) => p.subjectId === subjId
          );
          return pricesForSubject.length === 0 ? subjId : null;
        })
        .filter(Boolean);

      res.json({
        hasIncompletePrices: subjectsWithoutFullPrices.length > 0,
        subjectsWithoutFullPrices,
      });
    } catch (error) {
      console.error("Incomplete Prices Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение целей по предмету + помечаем выбранные цели репетитора по данному предмету
  getTutorGoalsBySubject: async (req, res) => {
    const { subjectId, tutorId } = req.params;

    if (!tutorId) {
      return res.status(400).json({ error: "tutorId обязателен" });
    }

    try {
      const subject = await prisma.subject.findFirst({
        where: { id_p: subjectId },
        select: { goalCategoryId: true },
      });
      // ИСПРАВИТЬ НА ВАРИАНТ НИЖЕ КОГДА ПЕРЕДЕЛАЕМ СОХРАНЕНИЕ ПРЕДМЕТОВ ПО ИХ ID В MONGOBD
      // const subject = await prisma.subject.findUnique({
      //   where: { id: subjectId },
      //   select: { goalCategoryId: true },
      // });

      if (!subject) return res.status(404).json({ error: "Предмет не найден" });

      const goalLinks = await prisma.goalToCategory.findMany({
        where: { categoryId: subject.goalCategoryId },
        include: {
          goal: {
            include: {
              tutorGoals: {
                where: { tutorId, subjectId }, // фильтруем по tutorId + subjectId
              },
            },
          },
        },
      });

      const goals = goalLinks.map((link) => ({
        ...link.goal,
        selected: link.goal.tutorGoals.length > 0, // помечаем выбранные цели
      }));

      res.status(200).json(goals);
    } catch (error) {
      console.error("Ошибка при получении целей для предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение выбранных целей репетитора по каждому предмету
  getTutorSelectedGoalsGrouped: async (req, res) => {
    const { tutorId } = req.params;

    try {
      const selectedGoals = await prisma.tutorGoal.findMany({
        where: { tutorId },
        include: { goal: true },
      });

      // Группируем по subjectId
      const goalsBySubject = selectedGoals.reduce((acc, tg) => {
        if (!acc[tg.subjectId]) acc[tg.subjectId] = [];
        acc[tg.subjectId].push({
          id: tg.goal.id,
          title: tg.goal.title,
        });
        return acc;
      }, {});

      res.status(200).json(goalsBySubject);
    } catch (error) {
      console.error("Ошибка при получении целей репетитора:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получаем предметы репетитора с целями
  getTutorSubjectsWithGoals: async (req, res) => {
    const { tutorId } = req.params;

    if (!tutorId) return res.status(400).json({ error: "tutorId обязателен" });

    try {
      // Находим репетитора
      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
        select: { subject: true }, // массив id_p предметов
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Берём предметы только из tutor.subject
      const subjects = await prisma.subject.findMany({
        where: { id_p: { in: tutor.subject } },
        select: {
          id_p: true,
          title: true,
          goalCategoryId: true,
        },
      });

      const categoryIds = subjects.map((s) => s.goalCategoryId);

      // Берём все цели для категорий предметов одной пачкой
      const goalsInCategories = await prisma.goalToCategory.findMany({
        where: { categoryId: { in: categoryIds } },
        include: { goal: true },
      });

      // Берём все цели репетитора
      const tutorGoals = await prisma.tutorGoal.findMany({
        where: { tutorId },
      });

      // Сопоставляем цели с предметами
      const result = subjects.map((subject) => {
        const goalsForSubject = goalsInCategories.filter(
          (link) => link.categoryId === subject.goalCategoryId
        );

        const goalsWithSelected = goalsForSubject.map((link) => {
          const selected = tutorGoals.some(
            (tg) => tg.goalId === link.goal.id && tg.subjectId === subject.id_p
          );
          return { id: link.goal.id, title: link.goal.title, selected };
        });

        return {
          subjectId: subject.id_p,
          subjectTitle: subject.title,
          goals: goalsWithSelected,
          hasNoSelectedGoals: goalsWithSelected.every((g) => !g.selected),
        };
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("Ошибка при получении предметов с целями:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Изменение целей по предмету + помечаем выбранные цели репетитора по данному предмету
  updateTutorGoalsBySubject: async (req, res) => {
    const { tutorId, subjectId } = req.params;
    const { goalIds } = req.body; // массив ID целей, которые выбрал репетитор

    if (!Array.isArray(goalIds)) {
      return res
        .status(400)
        .json({ error: "goalIds обязателен и должен быть массивом" });
    }

    try {
      // 1️⃣ Удаляем все старые цели репетитора для этого предмета
      await prisma.tutorGoal.deleteMany({
        where: {
          tutorId,
          subjectId,
        },
      });

      // 2️⃣ Создаём новые выбранные цели
      const newGoals = goalIds.map((goalId) => ({
        tutorId,
        subjectId,
        goalId,
      }));

      if (newGoals.length > 0) {
        await prisma.tutorGoal.createMany({ data: newGoals });
      }

      res.status(200).json({ message: "Цели репетитора обновлены" });
    } catch (error) {
      console.error("Ошибка при обновлении целей репетитора:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Тестовый запуск пересчёта рейтингов для всех репетиторов
  recalculateRatingTutorAll: async (req, res) => {
    try {
      console.log("🚀 Пользователь запустил пересчёт рейтингов");

      await recalculateAllTutorRatings();

      res.json({
        message:
          "✅ Все задачи на пересчёт рейтингов репетиторов добавлены в очередь!",
      });
    } catch (error) {
      console.error("Ошибка при запуске пересчета рейтингов:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /*****************ЧАТЫ******************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */

  // Изменение чатов
  updateChats: async (req, res) => {
    const { orderId, status } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Не передан orderId" });
    }

    try {
      const updatedChats = await prisma.chat.updateMany({
        where: { orderId },
        data: {
          ...(status !== undefined ? { status } : {}),
        },
      });

      res.json({
        message: "Статусы чатов успешно обновлены",
        updatedCount: updatedChats.count,
      });
    } catch (error) {
      console.error("Ошибка при обновлении чатов:", error.message);
      res.status(500).json({
        error: "Ошибка при обновлении чатов",
        details: error.message,
      });
    }
  },

  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /*****************ОТЗЫВЫ******************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */
  /***************************************** */

  // Создание отзыва от админа
  createReviewByAdmin: async (req, res) => {
    const { name, orderId, message, authorRole, tutorId, studentId, rating } =
      req.body;

    if (!name || !message || !authorRole || typeof rating !== "number") {
      return res.status(400).json({ error: "Поля обязательны" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Рейтинг должен быть от 1 до 5" });
    }

    try {
      let order = null;
      if (orderId) {
        order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: "Заказ не найден" });
      }

      const reviewData = {
        message,
        name,
        authorRole,
        rating,
        status: "Pending",
      };

      // Привязка к заказу (опционально)
      if (orderId) {
        reviewData.order = { connect: { id: orderId } };
      }

      // Привязка к репетитору (если отзыв от студента)
      if (authorRole === "student" && tutorId) {
        reviewData.tutor = { connect: { id: tutorId } };
      }

      // Привязка к студенту (если отзыв от репетитора)
      if (authorRole === "tutor" && studentId) {
        reviewData.student = { connect: { id: studentId } };
      }

      const review = await prisma.review.create({ data: reviewData });

      res.json(review);
    } catch (e) {
      console.error("createReviewByAdmin error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Создание комментария от админа
  createCommentByAdmin: async (req, res) => {
    const { reviewId, text, senderId } = req.body;

    if (!reviewId || !text || !senderId) {
      return res.status(400).json({ error: "Поля обязательны" });
    }

    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });
      if (!review) return res.status(404).json({ error: "Отзыв не найден" });

      const comment = await prisma.comment.create({
        data: {
          reviewId,
          text,
          senderId,
          senderRole: "admin",
        },
      });

      res.json(comment);
    } catch (e) {
      console.error("createCommentByAdmin error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Обновление отзыва от админа
  updateReviewByAdmin: async (req, res) => {
    const { id } = req.params;
    const { name, message, status, rating } = req.body;

    if (
      rating !== undefined &&
      (typeof rating !== "number" || rating < 1 || rating > 5)
    ) {
      return res.status(400).json({ error: "Рейтинг должен быть от 1 до 5" });
    }

    try {
      // Получаем автора и айдишники, чтобы понять, кому обновлять рейтинг
      const existingReview = await prisma.review.findUnique({
        where: { id },
        select: {
          authorRole: true,
          tutorId: true,
          studentId: true,
        },
      });

      if (!existingReview) {
        return res.status(404).json({ error: "Отзыв не найден" });
      }

      const updated = await prisma.review.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(message !== undefined && { message }),
          ...(status !== undefined && { status }),
          ...(rating !== undefined && { rating }),
        },
        select: {
          id: true,
          tutorId: true,
          studentId: true,
          status: true,
        },
      });

      const isActive = updated.status === "Active";

      // Если автор — студент, пересчитываем рейтинг репетитора
      if (
        isActive &&
        existingReview.authorRole === "student" &&
        updated.tutorId
      ) {
        const activeReviewsRaw = await prisma.review.findMany({
          where: {
            tutorId: updated.tutorId,
            status: "Active",
            authorRole: "student",
          },
          select: { rating: true },
        });

        const activeReviews = activeReviewsRaw.filter((r) => r.rating !== null);

        const userRating =
          activeReviews.reduce((acc, r) => acc + r.rating, 0) /
          activeReviews.length;

        await prisma.tutor.update({
          where: { id: updated.tutorId },
          data: {
            userRating: Number(userRating.toFixed(1)),
            reviewsCount: activeReviews.length,
          },
        });
      }

      // Если автор — репетитор, пересчитываем рейтинг ученика
      if (
        isActive &&
        existingReview.authorRole === "tutor" &&
        updated.studentId
      ) {
        const activeReviewsRaw = await prisma.review.findMany({
          where: {
            studentId: updated.studentId,
            status: "Active",
            authorRole: "tutor",
          },
          select: { rating: true },
        });

        const activeReviews = activeReviewsRaw.filter((r) => r.rating !== null);

        const averageRating =
          activeReviews.reduce((acc, r) => acc + r.rating, 0) /
          activeReviews.length;

        await prisma.student.update({
          where: { id: updated.studentId },
          data: {
            userRating: Number(averageRating.toFixed(1)),
          },
        });
      }

      res.json(updated);
    } catch (e) {
      console.error("updateReviewByAdmin error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Обновление комментария от админа
  updateCommentByAdmin: async (req, res) => {
    const { id } = req.params;
    const { name, text } = req.body;

    if (!name || !text)
      return res.status(400).json({ error: "Поля обязательны" });

    try {
      const updated = await prisma.comment.update({
        where: { id },
        data: { name, text },
      });

      res.json(updated);
    } catch (e) {
      console.error("updateCommentByAdmin error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение всех отзывов (включая комментарии)
  getAllReviews: async (req, res) => {
    try {
      const reviews = await prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
          },
          tutor: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, name: true },
          },
          order: {
            select: { id: true, subject: true, goal: true },
          },
        },
      });

      res.json(reviews);
    } catch (e) {
      console.error("getAllReviews error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение одного отзыва по ID (с комментариями и связями)
  getReviewById: async (req, res) => {
    try {
      const { id } = req.params;

      const review = await prisma.review.findUnique({
        where: { id },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
          },
          tutor: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, name: true },
          },
          order: {
            select: { id: true, subject: true, goal: true },
          },
        },
      });

      if (!review) {
        return res.status(404).json({ error: "Отзыв не найден" });
      }

      res.json(review);
    } catch (e) {
      console.error("getReviewById error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Удаление отзыва по ID
  deleteReviewById: async (req, res) => {
    try {
      const { id } = req.params;

      // Проверяем, существует ли отзыв
      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        return res.status(404).json({ error: "Отзыв не найден" });
      }

      // Удаляем отзыв
      await prisma.review.delete({
        where: { id },
      });

      res.json({ message: "Отзыв успешно удалён", id });
    } catch (e) {
      console.error("deleteReviewById error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = EmployeeController;
