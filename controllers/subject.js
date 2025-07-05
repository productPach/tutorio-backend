const { prisma } = require("../prisma/prisma-client");

const SubjectController = {
  // Добавление нового предмета
  createSubject: async (req, res) => {
    const {
      title,
      for_request,
      for_chpu,
      id_cat,
      general,
      nextPage,
      id_p,
      goal_id,
    } = req.body;

    const userId = req.user.userID;

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      // ✅ Проверка обязательных полей
      if (
        !title ||
        !for_request ||
        !for_chpu ||
        !id_cat ||
        general === undefined || // важно: general — булевый, проверяем явно
        !nextPage ||
        !id_p ||
        !goal_id
      ) {
        return res.status(400).json({
          error:
            "Все поля (title, for_request, for_chpu, id_cat, general, nextPage, id_p, goal_id) являются обязательными",
        });
      }

      // 🔍 Проверка на уникальность названия
      const existingSubject = await prisma.subject.findUnique({
        where: { title },
      });

      if (existingSubject) {
        return res.status(400).json({
          error: "Предмет с таким названием уже существует",
        });
      }

      // 🛠 Создание нового предмета
      const newSubject = await prisma.subject.create({
        data: {
          title,
          for_request,
          for_chpu,
          id_cat,
          general,
          nextPage,
          id_p,
          goal_id,
        },
      });

      res.status(201).json(newSubject);
    } catch (error) {
      console.error("Ошибка при создании предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех предметов
  getAllSubjects: async (req, res) => {
    try {
      const subjects = await prisma.subject.findMany();
      res.status(200).json(subjects);
    } catch (error) {
      console.error("Ошибка при получении списка предметов:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение предмета по ID
  getSubjectById: async (req, res) => {
    const { id } = req.params;

    try {
      const subject = await prisma.subject.findUnique({
        where: { id },
      });

      if (!subject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      res.status(200).json(subject);
    } catch (error) {
      console.error("Ошибка при получении предмета по id:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление предмета
  updateSubject: async (req, res) => {
    const { id } = req.params;
    const {
      title,
      for_request,
      for_chpu,
      id_cat,
      general,
      nextPage,
      id_p,
      goal_id,
    } = req.body;

    try {
      // ✅ Проверка обязательных полей
      if (
        !title ||
        !for_request ||
        !for_chpu ||
        !id_cat ||
        general === undefined ||
        !nextPage ||
        !id_p ||
        !goal_id
      ) {
        return res.status(400).json({
          error:
            "Все поля (title, for_request, for_chpu, id_cat, general, nextPage, id_p, goal_id) являются обязательными",
        });
      }

      // 🔍 Проверка: существует ли такой предмет
      const existingSubject = await prisma.subject.findUnique({
        where: { id },
      });

      if (!existingSubject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      // 🔄 Обновление предмета
      const updatedSubject = await prisma.subject.update({
        where: { id },
        data: {
          title,
          for_request,
          for_chpu,
          id_cat,
          general,
          nextPage,
          id_p,
          goal_id,
        },
      });

      res.status(200).json(updatedSubject);
    } catch (error) {
      console.error("Ошибка при обновлении предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление предмета
  deleteSubject: async (req, res) => {
    const { id } = req.params;

    try {
      // 🔍 Проверка: существует ли такой предмет
      const existingSubject = await prisma.subject.findUnique({
        where: { id },
      });

      if (!existingSubject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      // 🗑 Удаление предмета
      await prisma.subject.delete({
        where: { id },
      });

      res.status(200).json({ message: "Предмет успешно удалён" });
    } catch (error) {
      console.error("Ошибка при удалении предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
};

module.exports = SubjectController;
