const { prisma } = require("../prisma/prisma-client");

const GoalController = {
  // Создание новой цели
  createGoal: async (req, res) => {
    try {
      const goals = Array.isArray(req.body) ? req.body : [req.body];
      const createdGoals = [];

      for (const goal of goals) {
        const { title, isGoalInOrder, isTutorFilter, categoryIds } = goal;

        if (!title) {
          return res.status(400).json({
            error: "Поле 'title' является обязательным",
          });
        }

        const existing = await prisma.goal.findUnique({ where: { title } });
        if (existing) {
          return res.status(400).json({
            error: `Цель с названием "${title}" уже существует`,
          });
        }

        const created = await prisma.goal.create({
          data: {
            title,
            isGoalInOrder: isGoalInOrder ?? true,
            isTutorFilter: isTutorFilter ?? true,
            goalCategories:
              categoryIds && categoryIds.length
                ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
                : undefined,
          },
          include: { goalCategories: true },
        });

        createdGoals.push(created);
      }

      return res.status(201).json(createdGoals);
    } catch (error) {
      console.error("Ошибка при создании цели(ей):", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех целей
  getAllGoals: async (req, res) => {
    try {
      const goals = await prisma.goal.findMany({
        include: { goalCategories: { include: { category: true } } },
      });
      res.status(200).json(goals);
    } catch (error) {
      console.error("Ошибка при получении всех целей:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение цели по ID
  getGoalById: async (req, res) => {
    const { id } = req.params;
    try {
      const goal = await prisma.goal.findUnique({
        where: { id },
        include: { goalCategories: { include: { category: true } } },
      });

      if (!goal) return res.status(404).json({ error: "Цель не найдена" });

      res.status(200).json(goal);
    } catch (error) {
      console.error("Ошибка при получении цели по id:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление цели
  updateGoal: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, isGoalInOrder, isTutorFilter } = req.body;

      if (!title && !isGoalInOrder && !isTutorFilter) {
        return res
          .status(400)
          .json({ error: "Нужно передать хотя бы одно поле для обновления" });
      }

      const existingGoal = await prisma.goal.findUnique({ where: { id } });
      if (!existingGoal)
        return res.status(404).json({ error: "Цель не найдена" });

      const updated = await prisma.goal.update({
        where: { id },
        data: {
          title: title ?? existingGoal.title,
          isGoalInOrder: isGoalInOrder ?? existingGoal.isGoalInOrder,
          isTutorFilter: isTutorFilter ?? existingGoal.isTutorFilter,
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error("Ошибка при обновлении цели:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление категории для цели
  updateGoalCategories: async (req, res) => {
    try {
      const { id } = req.params;
      const { categoryIds } = req.body;

      if (!categoryIds?.length) {
        return res.status(400).json({ error: "categoryIds обязателен" });
      }

      const existingGoal = await prisma.goal.findUnique({ where: { id } });
      if (!existingGoal)
        return res.status(404).json({ error: "Цель не найдена" });

      // Удаляем старые связи
      await prisma.goalToCategory.deleteMany({ where: { goalId: id } });

      // Создаем новые
      const newRelations = await prisma.goalToCategory.createMany({
        data: categoryIds.map((categoryId) => ({ goalId: id, categoryId })),
      });

      res
        .status(200)
        .json({ message: "Категории обновлены", count: newRelations.count });
    } catch (error) {
      console.error("Ошибка при обновлении категорий цели:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление цели
  deleteGoal: async (req, res) => {
    const { id } = req.params;
    try {
      const existingGoal = await prisma.goal.findUnique({ where: { id } });
      if (!existingGoal)
        return res.status(404).json({ error: "Цель не найдена" });

      await prisma.goalToCategory.deleteMany({ where: { goalId: id } });
      await prisma.goal.delete({ where: { id } });

      res.status(200).json({ message: `Цель с id ${id} удалена` });
    } catch (error) {
      console.error("Ошибка при удалении цели:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Создание новой категории целей
  createCategory: async (req, res) => {
    try {
      const categories = Array.isArray(req.body) ? req.body : [req.body];
      const createdCategories = [];

      for (const category of categories) {
        const { title } = category;

        if (!title) {
          return res
            .status(400)
            .json({ error: "Поле 'title' является обязательным" });
        }

        const existing = await prisma.goalCategory.findUnique({
          where: { title },
        });
        if (existing) {
          return res.status(400).json({
            error: `Категория целей с названием "${title}" уже существует`,
          });
        }

        const created = await prisma.goalCategory.create({ data: { title } });
        createdCategories.push(created);
      }

      return res.status(201).json(createdCategories);
    } catch (error) {
      console.error("Ошибка при создании категории целей:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех категорий
  getAllCategories: async (req, res) => {
    try {
      const categories = await prisma.goalCategory.findMany({
        include: {
          goalCategories: { include: { goal: true } }, // получаем все цели через pivot
        },
      });
      res.status(200).json(categories);
    } catch (error) {
      console.error("Ошибка при получении всех категорий целей:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение категории по ID
  getCategoryById: async (req, res) => {
    const { id } = req.params;
    try {
      const category = await prisma.goalCategory.findUnique({
        where: { id },
        include: { goalCategories: { include: { goal: true } } },
      });

      if (!category)
        return res.status(404).json({ error: "Категория целей не найдена" });

      res.status(200).json(category);
    } catch (error) {
      console.error("Ошибка при получении категории по ID:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление категории
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;

      if (!title)
        return res
          .status(400)
          .json({ error: "Поле 'title' обязательно для обновления" });

      const existing = await prisma.goalCategory.findUnique({ where: { id } });
      if (!existing)
        return res.status(404).json({ error: "Категория целей не найдена" });

      const other = await prisma.goalCategory.findUnique({ where: { title } });
      if (other && other.id !== id)
        return res
          .status(400)
          .json({ error: `Категория с названием "${title}" уже существует` });

      const updated = await prisma.goalCategory.update({
        where: { id },
        data: { title },
      });
      res.status(200).json(updated);
    } catch (error) {
      console.error("Ошибка при обновлении категории:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // отдельный метод для привязки целей к категории
  updateCategoryGoals: async (req, res) => {
    try {
      const { id } = req.params;
      const { goalIds } = req.body;

      if (!goalIds?.length)
        return res.status(400).json({ error: "goalIds обязателен" });

      const existingCategory = await prisma.goalCategory.findUnique({
        where: { id },
      });
      if (!existingCategory)
        return res.status(404).json({ error: "Категория целей не найдена" });

      // Удаляем старые связи
      await prisma.goalToCategory.deleteMany({ where: { categoryId: id } });

      // Создаем новые связи
      const newRelations = await prisma.goalToCategory.createMany({
        data: goalIds.map((goalId) => ({ goalId, categoryId: id })),
      });

      res
        .status(200)
        .json({ message: "Цели обновлены", count: newRelations.count });
    } catch (error) {
      console.error("Ошибка при обновлении целей категории:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление категории
  deleteCategory: async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await prisma.goalCategory.findUnique({ where: { id } });
      if (!existing)
        return res.status(404).json({ error: "Категория целей не найдена" });

      // Удаляем связи с целями
      await prisma.goalToCategory.deleteMany({ where: { categoryId: id } });

      await prisma.goalCategory.delete({ where: { id } });

      res.status(200).json({ message: `Категория с id ${id} удалена` });
    } catch (error) {
      console.error("Ошибка при удалении категории:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
};

module.exports = GoalController;
