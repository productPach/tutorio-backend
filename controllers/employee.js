const { prisma } = require("../prisma/prisma-client");

const EmployeeController = {
  // Создание сотрудника
  createEmployee: async (req, res) => {
    res.send("createEmployee");
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
