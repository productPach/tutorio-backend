const { prisma } = require("../prisma/prisma-client");

const EmployeeController = {
  // Создание сотрудника
  createEmployee: async (req, res) => {
    const { name, email, region, status } = req.body;
    const userId = req.user.userID;

    if (!name || !email || !status) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const existingEmployee = await prisma.employee.findFirst({
        where: { email: email },
      });

      if (existingEmployee) {
        return res.status(400).json({
          error: "Сотрудник уже существует",
        });
      }

      const employee = await prisma.employee.create({
        data: {
          userId,
          name,
          email,
          region: region || undefined,
          status,
        },
      });
      res.json(employee);
    } catch (error) {
      console.log("Error Create Employee", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Получение всех сотрудников
  getAllEmployees: async (req, res) => {
    res.send("getAllEmployees");
  },
  // Получение сотрудника по ID
  getEmployeeById: async (req, res) => {
    res.send("getEmployeeById");
  },
  // Получение текущего сотрудника по токену
  currentEmployee: async (req, res) => {
    res.send("currentEmployee");
  },
  // Изменение сотрудника
  updateEmployee: async (req, res) => {
    res.send("updateEmployee");
  },
  // Удаление сотрудника
  deleteEmployee: async (req, res) => {
    res.send("deleteEmployee");
  },
};

module.exports = EmployeeController;
