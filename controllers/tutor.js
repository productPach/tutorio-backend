const { prisma } = require("../prisma/prisma-client");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { connect } = require("http2");

const TutorController = {
  // Создание репетитора
  createTutor: async (req, res) => {
    const {
      name,
      phone,
      email,
      subject,
      region,
      tutorPlace,
      tutorAdress,
      tutorTrip,
      status,
    } = req.body;
    const userId = req.user.userID;

    if (!phone || !status) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const existingTutor = await prisma.tutor.findFirst({
        where: { phone: phone },
      });

      if (existingTutor) {
        return res.status(400).json({
          error: "Репетитор уже существует",
        });
      }

      const tutor = await prisma.tutor.create({
        data: {
          userId,
          name: name || undefined,
          phone,
          email: email || undefined,
          subject: subject || undefined,
          region: region || undefined,
          tutorPlace: tutorPlace || undefined,
          tutorAdress: tutorAdress || undefined,
          tutorTrip: tutorTrip || undefined,
          status: status,
        },
      });
      res.json(tutor);
    } catch (error) {
      console.log("Error Create Tutor", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  verifyEmail: async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Токен обязателен" });
    }

    try {
      // 🔹 Расшифровываем токен, извлекаем tutorId и email
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const { userId, email } = decoded;

      // 🔹 Ищем репетитора по ID и email
      const tutor = await prisma.tutor.findUnique({
        where: { id: userId, email },
      });

      if (!tutor) {
        return res.status(400).json({ error: "Неверный или истекший токен" });
      }

      // 🔹 Если email уже подтвержден, возвращаем ошибку
      if (tutor.isVerifedEmail) {
        return res.status(400).json({ error: "Email уже подтвержден" });
      }

      // 🔹 Подтверждаем email
      await prisma.tutor.update({
        where: { id: userId },
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

  // Получение всех репетиторов (SECURE)
  getAllTutors: async (req, res) => {
    try {
      const allTutors = await prisma.tutor.findMany({
        orderBy: {
          createdAt: "desc",
        },
        // include: {
        //   educations: true,
        //   subjectPrices: true, // Включаем связанные места образования
        // },
        select: {
          id: true,
          userId: true,
          // user: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          avatarUrl: true,
          subject: true,
          subjectComments: true,
          region: true,
          tutorPlace: true,
          tutorAdress: true,
          tutorHomeLoc: true,
          tutorTrip: true,
          tutorTripCityData: true,
          tutorTripCity: true,
          tutorTripArea: true,
          profileInfo: true,
          experience: true,
          educations: true,
          documents: true,
          isGroup: true,
          status: true,
          subjectPrices: true,
          isPublicProfile: true,
          isStudentResponses: true,
          isNotifications: true,
          isNotificationsOrders: true,
          isNotificationsResponse: true,
          isNotificationsPromo: true,
          isNotificationsSms: true,
          isNotificationsEmail: true,
          isNotificationsTelegram: true,
          isNotificationsMobilePush: true,
          isNotificationsWebPush: true,
          isNotificationsVk: true,
          badges: true,
          lastOnline: true,
          reviews: {
            include: {
              comments: true,
              student: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
              order: {
                select: {
                  id: true,
                  goal: true,
                  subject: true,
                },
              },
            },
          },
          publicRating: true,
          reviewsCount: true,
          averageReviewScore: true,
          // Исключаем: phone, email, telegram, skype, response, chats
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

  // Получение репетитора по ID (SECURE)
  getTutorById: async (req, res) => {
    const { id } = req.params;

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
        // include: {
        //   educations: true,
        //   subjectPrices: true, // Включаем связанные места образования
        // },
        select: {
          id: true,
          userId: true,
          // user: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          avatarUrl: true,
          subject: true,
          subjectComments: true,
          region: true,
          tutorPlace: true,
          tutorAdress: true,
          tutorHomeLoc: true,
          tutorTrip: true,
          tutorTripCityData: true,
          tutorTripCity: true,
          tutorTripArea: true,
          profileInfo: true,
          experience: true,
          educations: true,
          documents: true,
          isGroup: true,
          status: true,
          subjectPrices: true,
          isPublicProfile: true,
          isStudentResponses: true,
          isNotifications: true,
          isNotificationsOrders: true,
          isNotificationsResponse: true,
          isNotificationsPromo: true,
          isNotificationsSms: true,
          isNotificationsEmail: true,
          isNotificationsTelegram: true,
          isNotificationsMobilePush: true,
          isNotificationsWebPush: true,
          isNotificationsVk: true,
          badges: true,
          lastOnline: true,
          reviews: {
            include: {
              comments: true,
              student: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
              order: {
                select: {
                  id: true,
                  goal: true,
                  subject: true,
                },
              },
            },
          },
          publicRating: true,
          reviewsCount: true,
          averageReviewScore: true,
          // Исключаем: phone, email, telegram, skype, response, chats
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

  // Получение репетитора по ID (SECURE)
  getTutorByIdPublic: async (req, res) => {
    const { id } = req.params;

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
        // include: {
        //   educations: true,
        //   subjectPrices: true, // Включаем связанные места образования
        // },
        select: {
          id: true,
          userId: true,
          // user: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          avatarUrl: true,
          subject: true,
          subjectComments: true,
          region: true,
          tutorPlace: true,
          tutorAdress: true,
          tutorHomeLoc: true,
          tutorTrip: true,
          tutorTripCityData: true,
          tutorTripCity: true,
          tutorTripArea: true,
          profileInfo: true,
          experience: true,
          educations: true,
          documents: true,
          isGroup: true,
          status: true,
          subjectPrices: true,
          isPublicProfile: true,
          isStudentResponses: true,
          isNotifications: true,
          isNotificationsOrders: true,
          isNotificationsResponse: true,
          isNotificationsPromo: true,
          isNotificationsSms: true,
          isNotificationsEmail: true,
          isNotificationsTelegram: true,
          isNotificationsMobilePush: true,
          isNotificationsWebPush: true,
          isNotificationsVk: true,
          badges: true,
          lastOnline: true,
          reviews: {
            include: {
              comments: true,
              student: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
              order: {
                select: {
                  id: true,
                  goal: true,
                  subject: true,
                },
              },
            },
          },
          publicRating: true,
          reviewsCount: true,
          averageReviewScore: true,
          // Исключаем: phone, email, telegram, skype, response, chats
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

  // Получение текущего репетитора по токену
  currentTutor: async (req, res) => {
    try {
      const tutor = await prisma.tutor.findUnique({
        where: { userId: req.user.userID },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
          reviews: {
            include: {
              comments: true,
              student: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
              order: {
                select: {
                  id: true,
                  goal: true,
                  subject: true,
                },
              },
            },
          },
        },
      });

      if (!tutor) {
        return res.status(400).json({ error: "Не удалось найти репетитора" });
      }

      res.json(tutor);
    } catch (error) {
      console.error("Current Tutor Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Изменение репетитора
  updateTutor: async (req, res) => {
    const { id } = req.params;
    const {
      name,
      email,
      isVerifedEmail,
      telegram,
      skype,
      subject, // Список предметов
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
        include: {
          subjectPrices: true,
          educations: true,
        }, // Загружаем цены
      });

      if (!tutor) {
        return res.status(400).json({ error: "Не удалось найти репетитора" });
      }

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      // Находим удалённые предметы
      const oldSubjects = tutor.subject || [];
      const newSubjects = subject || [];
      const removedSubjects = oldSubjects.filter(
        (subj) => !newSubjects.includes(subj)
      );

      // Удаляем цены, если предмет был удалён (НО ТОЛЬКО ЕСЛИ subject ПРИШЕЛ В ЗАПРОСЕ)
      if (subject !== undefined && removedSubjects.length > 0) {
        await prisma.tutorSubjectPrice.deleteMany({
          where: {
            tutorId: id,
            subjectId: { in: removedSubjects },
          },
        });
      }

      // Обновляем комментарии
      let updatedComments = tutor.subjectComments;

      if (subject !== undefined) {
        // Удаляем комментарии к удалённым предметам
        updatedComments = updatedComments.filter(
          (comment) => !removedSubjects.includes(comment.subjectId)
        );
      }

      // 🔥 Удаляем комментарии, если их нет в переданном `subjectComments`
      if (subjectComments !== undefined) {
        const newSubjectIds = subjectComments.map((c) => c.subjectId);
        updatedComments = updatedComments.filter((comment) =>
          newSubjectIds.includes(comment.subjectId)
        );
      }

      // Если в запросе пришли новые комментарии, обновляем их
      if (subjectComments !== undefined) {
        for (const newComment of subjectComments) {
          const existingIndex = updatedComments.findIndex(
            (c) => c.subjectId === newComment.subjectId
          );
          if (existingIndex !== -1) {
            updatedComments[existingIndex] = newComment; // Обновляем существующий комментарий
          } else {
            updatedComments.push(newComment); // Добавляем новый
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

      // Обновляем время последнего онлайна, если параметр был передан
      const currentTime = new Date();
      const lastOnlineTime = lastOnline ? new Date(lastOnline) : currentTime;

      // Обновляем данные репетитора
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
          subject: subject || undefined, // Обновляем список предметов
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

          hasSubjectPrices: autoHasSubjectPrices,
          hasPriceComments: autoHasPriceComments,
          hasProfileInfo: autoHasProfileInfo,
          hasEducation: autoHasEducation,
          hasEducationPhotos: autoHasEducationPhotos,

          status: status || undefined,
          lastOnline: lastOnlineTime, // Обновляем статус "онлайн"
          ...(subject !== undefined || subjectComments !== undefined
            ? {
                subjectComments: JSON.parse(
                  JSON.stringify([...updatedComments])
                ),
              }
            : {}), // Обновляем, если пришли новые предметы или комментарии
        },
        include: { subjectPrices: true },
      });

      // if (phone !== undefined) {
      //   const student = await prisma.student.findUnique({
      //     where: { userId: userID },
      //   });

      //   if (student) {
      //     await prisma.student.update({
      //       where: { userId: userID },
      //       data: {
      //         phone: phone || undefined,
      //       },
      //     });
      //   }
      // }

      // Получаем обновлённые данные с вложениями
      const tutorNew = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true,
          subjectPrices: true, // Подгрузит цены репетитора
        },
      });

      res.json(tutorNew);
    } catch (error) {
      console.error("Update Tutor Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Обновление фотографии репетитора
  updateTutorAvatar: async (req, res) => {
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

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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
  deleteTutorAvatar: async (req, res) => {
    try {
      const { id } = req.params;

      // Найти репетитора в базе данных
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ message: "Репетитор не найден" });
      }

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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

  // Удаление репетитора
  deleteTutor: async (req, res) => {
    const { id } = req.params;

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(400).json({ error: "Не удалось найти репетитора" });
      }

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      // СДЕЛАТЬ УДАЛЕНИЕ ОТКЛИКОВ!!!
      //   await prisma.response.deleteMany({
      //     where: {
      //       studentId: id,
      //     },
      //   });

      await prisma.tutor.delete({
        where: { id },
      });

      res.send("Репетитор удален");
    } catch (error) {
      console.error("Delete Tutor Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Запрос на удаление от репетитора
  deleteRequest: async (req, res) => {
    const { id } = req.params;
    const { answer } = req.body; // Получаем причину удаления

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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

  // Добавление нового места образования
  addEducation: async (req, res) => {
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

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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
  updateEducation: async (req, res) => {
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

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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
  deleteEducation: async (req, res) => {
    const { id, educationId } = req.params; // id репетитора и id образования

    try {
      // Проверяем, существует ли репетитор
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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
  deleteDiploma: async (req, res) => {
    const { id, educationId } = req.params;
    const { fileName } = req.body; // Получаем имя файла из тела запроса

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
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
  addSubjectPrice: async (req, res) => {
    const { tutorId, subjectId, format, price, duration } = req.body;

    try {
      // Получаем репетитора с актуальными ценами
      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
        include: {
          educations: true, // Включаем связанные места образования
          subjectPrices: true, // Включаем связанные цены
        }, // Загружаем цены
      });

      if (tutor.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }
      await prisma.tutorSubjectPrice.create({
        data: {
          tutorId,
          subjectId,
          format,
          price: Number(price),
          duration,
        },
      });

      res.status(201).json(tutor);
    } catch (error) {
      console.error("Add Subject Price Error:", error);
      res.status(500).json({ error: "Ошибка при добавлении цены" });
    }
  },

  // Обновление цены по предмету
  updateSubjectPrice: async (req, res) => {
    const { id } = req.params; // Берем ID цены из URL
    const { price, duration } = req.body;

    try {
      const existingPrice = await prisma.tutorSubjectPrice.findUnique({
        where: { id },
      });

      if (existingPrice.tutorId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

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

module.exports = TutorController;
