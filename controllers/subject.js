const { prisma } = require("../prisma/prisma-client");

const SubjectController = {
  // Добавление нового предмета
  createSubject: async (req, res) => {
    try {
      const subjects = Array.isArray(req.body) ? req.body : [req.body];
      const createdSubjects = [];

      for (const subject of subjects) {
        const {
          title,
          for_request,
          for_chpu,
          id_cat,
          general,
          nextPage,
          id_p,
          goal_id,
        } = subject;

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

        // 🔍 Проверка на уникальность title
        const existing = await prisma.subject.findUnique({
          where: { title },
        });

        if (existing) {
          return res.status(400).json({
            error: `Предмет с названием "${title}" уже существует`,
          });
        }

        // ✅ Создание предмета
        const created = await prisma.subject.create({
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

        createdSubjects.push(created);
      }

      return res.status(201).json(createdSubjects);
    } catch (error) {
      console.error("Ошибка при создании предмета(ов):", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
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
    try {
      const subjects = Array.isArray(req.body) ? req.body : [req.body];

      const updatedSubjects = [];

      for (const subject of subjects) {
        const {
          id, // теперь `id` приходит из тела, не из `req.params`
          title,
          for_request,
          for_chpu,
          id_cat,
          general,
          nextPage,
          id_p,
          goal_id,
        } = subject;

        // Проверка обязательных полей
        if (
          !id ||
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
              "Все поля (id, title, for_request, for_chpu, id_cat, general, nextPage, id_p, goal_id) являются обязательными",
          });
        }

        // Проверка существования
        const existingSubject = await prisma.subject.findUnique({
          where: { id },
        });

        if (!existingSubject) {
          return res
            .status(404)
            .json({ error: `Предмет с id ${id} не найден` });
        }

        const updated = await prisma.subject.update({
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

        updatedSubjects.push(updated);
      }

      return res
        .status(200)
        .json(Array.isArray(req.body) ? updatedSubjects : updatedSubjects[0]);
    } catch (error) {
      console.error("Ошибка при обновлении предмета(ов):", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
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
