const { prisma } = require("../prisma/prisma-client");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const { connect } = require("http2");

const TutorController = {
  // Создание репетитора
  createTutor: async (req, res) => {
    const {
      name,
      phone,
      email,
      avatarUrl,
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

    let avatarGenerateUrl;

    let filePath;

    if (req.file && req.file.path) {
      filePath = req.file.path;
    } else {
      const png = jdenticon.toPng(name, 200);
      const avatarName = `${name}_${Date.now()}.png`;
      avatarGenerateUrl = path.join(__dirname, "../uploads", avatarName);
      fs.writeFileSync(avatarGenerateUrl, png);
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
          avatarUrl: avatarUrl
            ? `/uploads/${avatarUrl}`
            : `/uploads/${avatarGenerateUrl}`,
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

  // Получение всех репетиторов
  getAllTutors: async (req, res) => {
    try {
      const allTutors = await prisma.tutor.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          educations: true, // Включаем связанные места образования
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
  getTutorById: async (req, res) => {
    const { id } = req.params;

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true, // Включаем связанные места образования
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
      subject,
      subjectPrices,
      region,
      tutorPlace,
      tutorAdress,
      tutorTrip,
      tutorTripCityData,
      tutorTripCity,
      tutorTripArea,
      profileInfo,
      experience,
      isGroup,
      status,
    } = req.body;

    let avatarUrl;
    if (req.file) {
      avatarUrl = req.file.filename;
    }

    try {
      const tutorId = new ObjectId(id); // Приводим id репетитора к ObjectId

      const tutor = await prisma.tutor.findUnique({
        where: { id: tutorId },
      });

      if (!tutor) {
        return res.status(400).json({ error: "Не удалось найти репетитора" });
      }

      if (tutor.userId.toString() !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      // Обновляем основные данные репетитора
      const updatedTutor = await prisma.tutor.update({
        where: { id: tutorId },
        data: {
          name: name || undefined,
          email: email || undefined,
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
          isGroup: isGroup || false,
          status: status || undefined,
        },
      });

      console.log(
        "subjectPrices received:",
        JSON.stringify(subjectPrices, null, 2)
      );

      // Если переданы subjectPrices, обновляем их
      if (Array.isArray(subjectPrices) && subjectPrices.length > 0) {
        console.log("Updating subjectPrices...");

        // Собираем массив subjectId, конвертируя их в ObjectId
        const subjectIdsToUpdate = subjectPrices.map(
          ({ subjectId }) => new ObjectId(subjectId)
        );

        // Удаляем только записи с этими subjectId для данного репетитора
        await prisma.tutorSubjectPrice.deleteMany({
          where: {
            tutorId: tutorId,
            subjectId: { in: subjectIdsToUpdate },
          },
        });

        // Создаём новые записи
        const newPrices = subjectPrices.flatMap(({ subjectId, prices }) =>
          prices.map(({ format, price, duration }) => ({
            tutorId: tutorId,
            subjectId: new ObjectId(subjectId),
            format,
            price: Number(price), // Приведение типа
            duration,
          }))
        );

        await prisma.tutorSubjectPrice.createMany({
          data: newPrices,
        });
      }

      // Загружаем обновлённые данные репетитора вместе с образованием
      const tutorNew = await prisma.tutor.findUnique({
        where: { id: tutorId },
        include: {
          educations: true,
          subjectPrices: true, // Подгружаем цены
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

      // Удаление цен по предметам репетитора
      await prisma.tutorSubjectPrice.deleteMany({
        where: { tutorId: id },
      });

      // Удаление откликов (если нужно)
      await prisma.response.deleteMany({
        where: { studentId: id },
      });

      // Удаление самого репетитора
      await prisma.tutor.delete({
        where: { id },
      });

      res.send("Репетитор удален");
    } catch (error) {
      console.error("Delete Tutor Error", error);
      res.status(500).json({ error: "Internal server error" });
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

    let diplomaUrls = [];

    if (req.files && req.files.length > 0) {
      diplomaUrls = req.files.map(
        (file) => `/uploads/diplomas/${file.filename}`
      );
    }

    try {
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
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
          educations: true,
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

    let diplomaUrls = [];

    if (req.files && req.files.length > 0) {
      diplomaUrls = req.files.map(
        (file) => `/uploads/diplomas/${file.filename}`
      );
    }

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

      // Обновляем репетитора, чтобы вернуть его данные с актуализированным списком образований
      const updatedTutor = await prisma.tutor.findUnique({
        where: { id },
        include: {
          educations: true, // Включаем все образования
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
          educations: true, // Включаем все образования
        },
      });

      return res.json(updatedTutor);
    } catch (error) {
      console.error("Ошибка при удалении фото:", error);
      res.status(500).json({ error: "Произошла ошибка при удалении фото" });
    }
  },
};

module.exports = TutorController;
