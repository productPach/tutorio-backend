const { prisma } = require("../prisma/prisma-client");

const StudentController = {
  // Создание ученика
  createStudent: async (req, res) => {
    const { name, phone, email, avatarUrl, region, status } = req.body;
    const userId = req.user.userID;

    if (!name || !phone || !region || !status) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const existingStudent = await prisma.student.findFirst({
        where: { phone: phone },
      });

      if (existingStudent) {
        return res.status(400).json({
          error: "Ученик уже существует",
        });
      }

      const student = await prisma.student.create({
        data: {
          userId,
          name,
          phone,
          email: email || undefined,
          avatarUrl,
          region,
          status,
        },
      });
      res.json(student);
    } catch (error) {
      console.log("Error Create Student", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  verifyEmailStudent: async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Токен обязателен" });
    }

    try {
      // 🔹 Расшифровываем токен, извлекаем tutorId и email
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const { studentId, email } = decoded;

      // 🔹 Ищем репетитора по ID и email
      const student = await prisma.student.findUnique({
        where: { id: studentId, email },
      });

      if (!student) {
        return res.status(400).json({ error: "Неверный или истекший токен" });
      }

      // 🔹 Если email уже подтвержден, возвращаем ошибку
      if (student.isVerifedEmail) {
        return res.status(400).json({ error: "Email уже подтвержден" });
      }

      // 🔹 Подтверждаем email
      await prisma.student.update({
        where: { id: studentId },
        data: {
          isVerifedEmail: true,
        },
      });

      res.json({ message: "Email подтверждён" });
    } catch (error) {
      console.error("Ошибка подтверждения email:", error.message);
      res.status(400).json({ error: "Неверный или истекший токен" });
    }
  },

  // Получение всех учеников
  getAllStudents: async (req, res) => {
    try {
      const allStudents = await prisma.student.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!allStudents) {
        return res.status(404).json({ error: "Не найдено ни одного ученика" });
      }

      res.json(allStudents);
    } catch (error) {
      console.error("Get All Students Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение ученика по ID
  getStudentById: async (req, res) => {
    const { id } = req.params;

    try {
      const student = await prisma.student.findUnique({ where: { id } });

      if (!student) {
        return res.status(404).json({ error: "Ученик не найден" });
      }

      res.json({ student });
    } catch (error) {
      console.error("Get Student By Id Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение текущего студента по токену
  currentStudent: async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userID },
      });

      if (!student) {
        return res.status(400).json({ error: "Не удалось найти ученика" });
      }

      res.json(student);
    } catch (error) {
      console.error("Current Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Изменение ученика
  updateStudent: async (req, res) => {
    const { id } = req.params;

    const {
      name,
      email,
      telegram,
      skype,
      region,
      status,
      isVerifedEmail,
      isNotifications,
      isNotificationsResponse,
      isNotificationsPromo,
      isNotificationsSms,
      isNotificationsEmail,
      isNotificationsTelegram,
      isNotificationsMobilePush,
      isNotificationsWebPush,
      isNotificationsVk,
    } = req.body;

    try {
      const student = await prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        return res.status(400).json({ error: "Не удалось найти ученика" });
      }

      if (student.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const updateStudent = await prisma.student.update({
        where: { id },
        data: {
          name: name || undefined,
          email: email || undefined,
          isVerifedEmail:
            isVerifedEmail !== undefined
              ? isVerifedEmail
              : student.isVerifedEmail,
          telegram: telegram || undefined,
          skype: skype || undefined,
          region: region || undefined,
          status: status || undefined,
          isNotifications:
            isNotifications !== undefined
              ? isNotifications
              : student.isNotifications,

          isNotificationsResponse:
            isNotificationsResponse !== undefined
              ? isNotificationsResponse
              : student.isNotificationsResponse,
          isNotificationsPromo:
            isNotificationsPromo !== undefined
              ? isNotificationsPromo
              : student.isNotificationsPromo,
          isNotificationsSms:
            isNotificationsSms !== undefined
              ? isNotificationsSms
              : student.isNotificationsSms,
          isNotificationsEmail:
            isNotificationsEmail !== undefined
              ? isNotificationsEmail
              : student.isNotificationsEmail,
          isNotificationsTelegram:
            isNotificationsTelegram !== undefined
              ? isNotificationsTelegram
              : student.isNotificationsTelegram,
          isNotificationsVk:
            isNotificationsVk !== undefined
              ? isNotificationsVk
              : student.isNotificationsVk,
          isNotificationsMobilePush:
            isNotificationsMobilePush !== undefined
              ? isNotificationsMobilePush
              : student.isNotificationsMobilePush,
          isNotificationsWebPush:
            isNotificationsWebPush !== undefined
              ? isNotificationsWebPush
              : student.isNotificationsWebPush,
        },
      });

      // if (phone !== undefined) {
      //   const tutor = await prisma.tutor.findUnique({
      //     where: { userId: userID },
      //   });

      //   if (tutor) {
      //     await prisma.tutor.update({
      //       where: { userId: userID },
      //       data: {
      //         phone: phone || undefined,
      //       },
      //     });
      //   }
      // }

      res.json(updateStudent);
    } catch (error) {
      console.error("Update Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление ученика
  deleteStudent: async (req, res) => {
    const { id } = req.params;

    try {
      const student = await prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        return res.status(400).json({ error: "Не удалось найти ученика" });
      }

      if (student.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      await prisma.order.deleteMany({
        where: {
          studentId: id,
        },
      });

      await prisma.student.delete({
        where: { id },
      });

      res.send("Ученик удален");
    } catch (error) {
      console.error("Delete Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Запрос на удаление от ученика
  deleteRequest: async (req, res) => {
    const { id } = req.params;
    const { answer } = req.body; // Получаем причину удаления

    try {
      const student = await prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        return res.status(404).json({ error: "Ученик не найден" });
      }

      if (student.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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
};

module.exports = StudentController;
