const { prisma } = require("../prisma/prisma-client");

const WelcomeScreenController = {
  // Создание велком-скрина
  createWelcomeScreen: async (req, res) => {
    const userId = req.user.userID;
    const {
      title,
      content,
      userType,
      page,
      group,
      order,
      isActive = false,
    } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return res.status(403).json({
        error: "Нет доступа",
      });
    }

    if (!title || !content || !userType || !page || !group || !order) {
      return res.status(400).json({
        error: "Не заполнены все обязательные поля",
      });
    }

    try {
      const welcomeScreen = await prisma.welcomeScreen.create({
        data: {
          title,
          content,
          userType,
          page,
          group,
          order,
          isActive,
        },
      });

      res.status(201).json(welcomeScreen);
    } catch (error) {
      console.error("Create Welcom Screen Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение всех велком-скринов
  getAllWelcomeScreen: async (req, res) => {
    const userId = req.user.userID;
    try {
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        return res.status(403).json({
          error: "Нет доступа",
        });
      }

      const allWelcomeScreen = await prisma.welcomeScreen.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!allWelcomeScreen) {
        return res
          .status(404)
          .json({ error: "Не найдено ни одного велком-скрина" });
      }

      res.json(allWelcomeScreen);
    } catch (error) {
      console.error("Get All Welcom Screen Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Редактирование велком-скрина
  updateWelcomeScreen: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;
    const { title, content, userType, page, group, order, isActive } = req.body;

    try {
      const welcomeScreen = await prisma.welcomeScreen.findUnique({
        where: { id },
      });

      if (!welcomeScreen) {
        return res.status(400).json({ error: "Не удалось найти велком-скрин" });
      }

      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        return res.status(403).json({
          error: "Нет доступа",
        });
      }

      const updateWelcomeScreen = await prisma.welcomeScreen.update({
        where: { id },
        data: {
          title: title || undefined,
          content: content || undefined,
          userType: userType || undefined,
          page: page || undefined,
          group: group || undefined,
          order: order || undefined,
          isActive: isActive || undefined,
        },
      });

      res.json(updateWelcomeScreen);
    } catch (error) {
      console.error("Update Welcom Screen Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление велком-скрина
  deleteWelcomeScreen: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;

    try {
      const welcomeScreen = await prisma.welcomeScreen.findUnique({
        where: { id },
      });

      if (!welcomeScreen) {
        return res.status(400).json({ error: "Не удалось найти велком-скрин" });
      }

      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        return res.status(403).json({
          error: "Нет доступа",
        });
      }

      await prisma.welcomeScreen.delete({ where: { id } });
      res.send("Велком-скрин удален");
    } catch (error) {
      console.error("Delete Welcome Screen Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение списка велком-скринов, которые пользователь еще не видел
  getWelcomeScreenForUser: async (req, res) => {
    const userId = req.user.userID;

    try {
      const welcomeScreens = await prisma.welcomeScreen.findMany({
        where: {
          NOT: {
            userWelcomeScreens: {
              some: { userId: userId },
            },
          },
        },
        orderBy: { order: "asc" }, // Сортировка по порядку
      });

      res.json(welcomeScreens);
    } catch (error) {
      console.error("Welcome Screen For User Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = WelcomeScreenController;
