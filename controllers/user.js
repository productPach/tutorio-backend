const { prisma } = require("../prisma/prisma-client");
const { bcrypt } = require("bcryptjs");
const jdenticon = require("jdenticon");
const path = require("path");

const UserController = {
  register: async (req, res) => {
    const { phone, password, avatar } = req.body;

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

      const hashedPassword = await bcrypt.hash(password, 10);

      if (!avatar) {
        const png = jdenticon.toPng(name, 200);
        const avatarName = `${name}_${Date.now()}.png`;
        const avatarPath = path.join(__dirname, "../uploads", avatarName);
      }

      const user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          avatarUrl: `/uploads/${avatarPath}`,
        },
      });
    } catch (error) {}
    res.send("Register");
    console.log(phone, password);
  },
  registerTutor: async (req, res) => {
    res.send("RegisterTutor");
  },
  registerStudent: async (req, res) => {
    res.send("RegisterStudent");
  },
  registerEmployee: async (req, res) => {
    res.send("RegisterEmployee");
  },
  login: async (req, res) => {
    res.send("login");
  },
  getUserById: async (req, res) => {
    res.send("getUserById");
  },
  updateUser: async (req, res) => {
    res.send("updateUser");
  },
  current: async (req, res) => {
    res.send("current");
  },
  deleteUser: async (req, res) => {
    res.send("deleteUser");
  },
};

module.exports = UserController;
