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

  // Авторизация пользователя
  login: async (req, res) => {
    const { phone, secretSMS } = req.body;

    if (!phone) {
      return res
        .send(400)
        .json({ error: "Телефон является обязательным полем" });
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

      const token = jwt.sign(
        { userID: user.id, phone: user.phone },
        process.env.SECRET_KEY
      );

      res.json({ token });
    } catch (error) {
      console.error("Ошибка авторизации", error);
      res.status(500).json({ error: "Internal server error" });
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
    res.send("getUserByPhone");
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
};

module.exports = UserController;
