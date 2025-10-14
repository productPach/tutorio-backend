const { prisma } = require("../prisma/prisma-client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserController = {
  // Регистрация пользователя
  register: async (req, res) => {
    const { phone, secretSMS, role } = req.body;

    if (!phone) {
      return res
        .status(400)
        .json({ error: "Телефон является обязательным полем" });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { phone } });

      if (existingUser) {
        return res.status(400).json({
          error: "Пользователь с таким номером телефона уже существует",
        });
      }

      const hashedPassword = await bcrypt.hash(secretSMS, 10);

      const user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
        },
      });

      res.json(user);
    } catch (error) {
      console.log("Error in register User", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Авторизация пользователя с рефреш токеном от 22.09.2025
  login: async (req, res) => {
    const { phone, secretSMS, role, deviceInfo } = req.body; // Получаем от фронтенда

    if (!phone) {
      return res
        .status(400)
        .json({ error: "Телефон является обязательным полем" });
    }

    if (!role || !["student", "tutor", "admin"].includes(role)) {
      return res.status(400).json({ error: "Неверная роль" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { phone } });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Такого пользователя не существует" });
      }

      const valid = await bcrypt.compare(secretSMS, user.password);
      if (!valid) {
        return res
          .status(400)
          .json({ error: "Неверно введен проверочный код" });
      }

      // Access token (15 минут)
      const accessToken = jwt.sign(
        {
          userID: user.id,
          phone: user.phone,
          activeRole: role,
        },
        process.env.ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      // Refresh token (30 дней)
      const refreshToken = jwt.sign(
        {
          userID: user.id,
          tokenType: "refresh",
        },
        process.env.REFRESH_SECRET,
        { expiresIn: "30d" }
      );

      // Сохраняем с переданным deviceInfo
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          activeRole: role,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deviceInfo: deviceInfo || "web", // Значение по умолчанию, если не передано
          isActive: true,
        },
      });

      // Устанавливаем куки
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true, // false для локалки | true для прода
        sameSite: "None", // "Lax" для локалки | "None" для прода
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          phone: user.phone,
          activeRole: role,
        },
      });
    } catch (error) {
      console.error("Ошибка авторизации", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Выдача нового аксесс и рефреш токенов
  refreshTokens: async (req, res) => {
    const { refreshToken: oldRefreshToken } = req.cookies;

    if (!oldRefreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }

    try {
      // Проверяем подпись старого токена
      const decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET);

      // Ищем токен в базе
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: oldRefreshToken,
          expiresAt: { gt: new Date() },
          isActive: true,
        },
        include: { user: true },
      });

      if (!tokenRecord) {
        return res
          .status(403)
          .json({ error: "Invalid or expired refresh token" });
      }

      // Генерируем новый access token
      const newAccessToken = jwt.sign(
        {
          userID: tokenRecord.user.id,
          phone: tokenRecord.user.phone,
          activeRole: tokenRecord.activeRole || "student",
        },
        process.env.ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      // Ротация refresh token (опционально, но рекомендуется для безопасности)
      const newRefreshToken = jwt.sign(
        {
          userID: tokenRecord.user.id,
          tokenType: "refresh",
        },
        process.env.REFRESH_SECRET,
        { expiresIn: "30d" }
      );

      // Обновляем запись в базе (деактивируем старый, создаем новый)
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { isActive: false }, // Деактивируем старый токен
        }),
        prisma.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: tokenRecord.user.id,
            activeRole: tokenRecord.activeRole,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            deviceInfo: tokenRecord.deviceInfo,
            isActive: true,
          },
        }),
      ]);

      // Устанавливаем новый refresh token в куки
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true, // false для локалки | true для прода
        sameSite: "None", // "Lax" для локалки | "None" для прода
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken: newAccessToken,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        // Деактивируем протухший токен
        await prisma.refreshToken.updateMany({
          where: { token: oldRefreshToken },
          data: { isActive: false },
        });
        return res.status(401).json({ error: "Refresh token expired" });
      }
      return res.status(403).json({ error: "Invalid refresh token" });
    }
  },

  // Разлогин
  logout: async (req, res) => {
    const { refreshToken } = req.cookies;
    const { logoutAllDevices = false } = req.body;

    try {
      // req.user гарантированно существует благодаря мидлвару
      const userId = req.user.userID;

      if (logoutAllDevices) {
        // Выход со всех устройств
        await prisma.refreshToken.updateMany({
          where: {
            userId: userId,
            isActive: true,
          },
          data: { isActive: false },
        });
      } else if (refreshToken) {
        // Выход только с текущего устройства + проверка принадлежности
        await prisma.refreshToken.updateMany({
          where: {
            token: refreshToken,
            userId: userId, // Важно: проверяем что токен принадлежит пользователю
            isActive: true,
          },
          data: { isActive: false },
        });
      }

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получить список активных сессий пользователя
  getUserActiveSessions: async (req, res) => {
    try {
      const sessions = await prisma.refreshToken.findMany({
        where: {
          userId: req.user.userID,
          expiresAt: { gt: new Date() },
          isActive: true,
        },
        select: {
          id: true,
          activeRole: true,
          deviceInfo: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Завершить сессию на конкретном устройстве
  revokeSession: async (req, res) => {
    const { tokenId } = req.body;

    try {
      await prisma.refreshToken.update({
        where: {
          id: tokenId,
          userId: req.user.userID, // проверяем что токен принадлежит пользователю
        },
        data: { isActive: false },
      });

      res.json({ message: "Session revoked successfully" });
    } catch (error) {
      res.status(400).json({ error: "Invalid session ID" });
    }
  },

  // Получение пользователя по ID
  getUserById: async (req, res) => {
    const { id } = req.params;
    // Достаем айди пользователя из auth.js (jwt token)
    const userID = req.user.userID;

    try {
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Get User By Id Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение пользователя по номеру телефона
  getUserByPhone: async (req, res) => {
    const { phone } = req.body;

    try {
      const existingUser = await prisma.user.findFirst({
        where: { phone: phone },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Номер телефона уже используется другим пользователем",
        });
      }

      return res
        .status(200)
        .json({ message: "Номер телефона свободен для использования" });
    } catch (error) {
      console.error("Get User By Phone Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Изменение секретного ключа пользователя
  updSecretUser: async (req, res) => {
    const { phone, secretSMS } = req.body;

    try {
      const existingUser = await prisma.user.findFirst({
        where: { phone: phone },
      });

      if (!existingUser) {
        return res.status(400).json({
          error: "Номер телефона не привязан ни к одному пользователю",
        });
      }

      let hashedPassword;
      if (secretSMS) {
        hashedPassword = await bcrypt.hash(secretSMS, 10);
      }

      const user = await prisma.user.update({
        where: { phone },
        data: {
          password: hashedPassword || undefined,
        },
      });

      res.status(200).json({ message: "Успешно изменен код" });
    } catch (error) {
      console.error("Get User By Phone Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Изменение пользователя
  updateUser: async (req, res) => {
    const { id } = req.params;

    const { phone, secretSMS, student, tutor, employee } = req.body;

    if (id !== req.user.userID) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    if (!phone && !secretSMS) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      if (phone) {
        const existingUser = await prisma.user.findFirst({
          where: { phone: phone },
        });

        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({
            error: "Номер телефона уже используется другим пользователем",
          });
        }
      }

      let hashedPassword;
      if (secretSMS) {
        hashedPassword = await bcrypt.hash(secretSMS, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          phone: phone || undefined,
          password: hashedPassword || undefined,
        },
      });

      if (phone) {
        const existingStudent = await prisma.student.findUnique({
          where: { userId: id },
        });

        if (existingStudent) {
          await prisma.student.update({
            where: { userId: id },
            data: {
              phone,
            },
          });
        }

        const existingTutor = await prisma.tutor.findUnique({
          where: { userId: id },
        });

        if (existingTutor) {
          await prisma.tutor.update({
            where: { userId: id },
            data: {
              phone,
            },
          });
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Update User Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение текущего пользователя по токену
  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userID },
      });

      if (!user) {
        return res.status(400).json({ error: "Не удалось найти пользователя" });
      }

      res.json(user);
    } catch (error) {
      console.error("Current User Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление пользователя самим пользователем
  deleteUser: async (req, res) => {
    const { id } = req.params;

    if (id !== req.user.userID) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    try {
      await prisma.user.delete({ where: { id: req.user.userID } });
      res.send("Пользователь удален");
    } catch (error) {
      console.error("Delete User Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Просмотр велком-скрина пользователем
  showWelcomeScreen: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;

    try {
      const welcomeScreen = await prisma.welcomeScreen.findUnique({
        where: { id },
      });

      if (!welcomeScreen) {
        return res.status(400).json({ error: "Не удалось найти велком-скрин" });
      }

      // Проверяем, просматривал ли пользователь этот экран ранее
      const existingUserWS = await prisma.userWelcomeScreen.findUnique({
        where: {
          userId_welcomeId: {
            userId,
            welcomeId: id,
          },
        },
      });

      if (existingUserWS) {
        return res.status(200).json({ message: "Экран уже был просмотрен" });
      }

      const userShowWS = await prisma.userWelcomeScreen.create({
        data: {
          userId,
          welcomeId: id,
        },
      });

      res.status(201).json(userShowWS);
    } catch (error) {
      console.error("Show Welcom Screen Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление запроса на удаление ))
  cancelDeleteRequest: async (req, res) => {
    const { role } = req.body; // Получаем роль (tutor или student)

    try {
      // Проверяем, передана ли роль
      if (!role || (role !== "tutor" && role !== "student")) {
        return res.status(400).json({ error: "Некорректная роль" });
      }

      // Ищем запрос на удаление по userId и роли
      const deleteRequest = await prisma.deletedRequest.findUnique({
        where: {
          userId_role: {
            userId: req.user.userID,
            role,
          },
        },
      });

      if (!deleteRequest) {
        return res.status(404).json({ error: "Запрос на удаление не найден" });
      }

      // Удаляем запрос
      await prisma.deletedRequest.delete({
        where: {
          userId_role: {
            userId: req.user.userID,
            role,
          },
        },
      });

      res.status(200).json({ message: "Запрос на удаление отменён" });
    } catch (error) {
      console.error("Cancel Delete Request Error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = UserController;
