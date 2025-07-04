const { prisma } = require("../prisma/prisma-client");

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
  /***************************************** */
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
};

module.exports = EmployeeController;
