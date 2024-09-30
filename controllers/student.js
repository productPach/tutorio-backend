const { prisma } = require("../prisma/prisma-client");

const StudentController = {
  // Создание ученика
  createStudent: async (req, res) => {
    const { name, phone, email, region, status } = req.body;
    const userId = req.user.userID;

    if (!name || !phone || !region || !status) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const existingStudent = await prisma.student.findFirst({
        where: { phone: phone },
      });

      if (existingStudent) {
        return res.status(400).json({
          error: "Ученик уже существует",
        });
      }

      const student = await prisma.student.create({
        data: {
          userId,
          name,
          phone,
          email: email || undefined,
          region,
          status,
        },
      });
      res.json(student);
    } catch (error) {
      console.log("Error Create Student", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение всех учеников
  getAllStudents: async (req, res) => {
    try {
      const allStudents = await prisma.student.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!allStudents) {
        return res.status(404).json({ error: "Не найдено ни одного ученика" });
      }

      res.json(allStudents);
    } catch (error) {
      console.error("Get All Students Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение ученика по ID
  getStudentById: async (req, res) => {
    const { id } = req.params;

    try {
      const student = await prisma.student.findUnique({ where: { id } });

      if (!student) {
        return res.status(404).json({ error: "Ученик не найден" });
      }

      res.json({ student });
    } catch (error) {
      console.error("Get Student By Id Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение текущего студента по токену
  currentStudent: async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userID },
      });

      if (!student) {
        return res.status(400).json({ error: "Не удалось найти ученика" });
      }

      res.json(student);
    } catch (error) {
      console.error("Current Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Изменение ученика
  updateStudent: async (req, res) => {
    const { id } = req.params;

    const { name, email, region, status } = req.body;

    try {
      const student = await prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        return res.status(400).json({ error: "Не удалось найти ученика" });
      }

      if (student.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const updateStudent = await prisma.student.update({
        where: { id },
        data: {
          name: name || undefined,
          email: email || undefined,
          region: region || undefined,
          status: status || undefined,
        },
      });

      res.json(updateStudent);
    } catch (error) {
      console.error("Update Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Удаление ученика
  deleteStudent: async (req, res) => {
    const { id } = req.params;

    try {
      const student = await prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        return res.status(400).json({ error: "Не удалось найти ученика" });
      }

      if (student.userId !== req.user.userID) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      await prisma.order.deleteMany({
        where: {
          studentId: id,
        },
      });

      await prisma.student.delete({
        where: { id },
      });

      res.send("Ученик удален");
    } catch (error) {
      console.error("Delete Student Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = StudentController;
