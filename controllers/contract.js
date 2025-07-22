const { prisma } = require("../prisma/prisma-client");

const ContractController = {
  // Создание контракта
  createContract: async (req, res) => {
    const { orderId, tutorId, selectedBy } = req.body;

    if (
      !orderId ||
      !tutorId ||
      !selectedBy ||
      !["student", "tutor"].includes(selectedBy)
    ) {
      return res.status(400).json({
        error: "Не все обязательные поля переданы или переданы неверно",
      });
    }

    try {
      // Проверка существования заказа
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      //   if (order.status === "Closed" || order.status === "Hidden") {
      //     return res
      //       .status(403)
      //       .json({
      //         error:
      //           "Нельзя выбрать репетитора для закрытого или скрытого заказа",
      //       });
      //   }

      // Проверка, существует ли уже активный контракт
      const existingContract = await prisma.contract.findFirst({
        where: {
          orderId,
          tutorId,
          canceledAt: null,
        },
      });

      if (existingContract) {
        return res.status(409).json({ error: "Контракт уже существует" });
      }

      // Создание контракта
      const newContract = await prisma.contract.create({
        data: {
          orderId,
          tutorId,
          selectedBy,
        },
      });

      res.status(201).json(newContract);
    } catch (error) {
      console.error("Ошибка при создании контракта:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  cancelContract: async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Не передан ID контракта" });
    }

    try {
      const contract = await prisma.contract.findUnique({
        where: { id },
      });

      if (!contract) {
        return res.status(404).json({ error: "Контракт не найден" });
      }

      if (contract.canceledAt) {
        return res.status(409).json({ error: "Контракт уже отменен" });
      }

      const canceledContract = await prisma.contract.update({
        where: { id },
        data: {
          canceledAt: new Date(),
        },
      });

      res.json(canceledContract);
    } catch (error) {
      console.error("Ошибка при отмене контракта:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
};

module.exports = ContractController;
