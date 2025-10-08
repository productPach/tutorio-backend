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
          goalCategoryId,
          // goal_id,
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
          !goalCategoryId
          // !goal_id
        ) {
          return res.status(400).json({
            error:
              "Все поля (title, for_request, for_chpu, id_cat, general, nextPage, id_p, goalCategoryId) являются обязательными",
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

        // ✅ Проверка, что категория целей существует
        const category = await prisma.goalCategory.findUnique({
          where: { id: goalCategoryId },
        });

        if (!category) {
          return res.status(400).json({
            error: `Категория целей с id "${goalCategoryId}" не найдена`,
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
            //goal_id,
            goalCategoryId,
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
          //goal_id,
          goalCategoryId,
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
          //!goal_id
          !goalCategoryId
        ) {
          return res.status(400).json({
            error:
              "Все поля (id, title, for_request, for_chpu, id_cat, general, nextPage, id_p, goalCategoryId) являются обязательными",
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
            //goal_id,
            goalCategoryId,
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

  // Получение целей по предмету
  getGoalsBySubject: async (req, res) => {
    const { subjectId } = req.params;

    try {
      // 1️⃣ Получаем предмет с его категорией целей
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { goalCategoryId: true },
      });

      if (!subject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      // 2️⃣ Получаем все связи GoalToCategory для этой категории
      const goalLinks = await prisma.goalToCategory.findMany({
        where: { categoryId: subject.goalCategoryId },
        include: { goal: true },
      });

      // 3️⃣ Формируем массив целей
      const goals = goalLinks.map((link) => link.goal);

      res.status(200).json(goals);
    } catch (error) {
      console.error("Ошибка при получении целей для предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
};

module.exports = SubjectController;
