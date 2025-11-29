const { prisma } = require("../prisma/prisma-client");
const crypto = require("crypto");
const YooKassa = require("yookassa");
const yookassa = new YooKassa({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY,
});

const PaymentController = {
  // Создаем платеж через ЮKassa + сохраняем Payment
  // POST /api/payments/create

  // Задачи метода:
  // принять сумму
  // создать запись в Payment
  // создать запись в BalanceTransaction (type=deposit, status=pending)
  // создать платеж через ЮKassa SDK
  // вернуть paymentId для виджета

  createPayment: async (req, res) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body; // В КОПЕЙКАХ

      if (!amount || amount < 10000) {
        return res
          .status(400)
          .json({ error: "Минимальная сумма — 100 рублей" });
      }

      // Создаём платёж через ЮKassa
      const payment = await yookassa.createPayment({
        amount: {
          value: (amount / 100).toFixed(2),
          currency: "RUB",
        },
        confirmation: {
          type: "embedded", // ВИДЖЕТ!
        },
        capture: true,
        description: `Пополнение баланса пользователя ${userId}`,
      });

      // Сохраняем Payment
      const dbPayment = await prisma.payment.create({
        data: {
          userId,
          paymentId: payment.id,
          amount,
          status: payment.status,
        },
      });

      // Создаём pending транзакцию
      await prisma.balanceTransaction.create({
        data: {
          userId,
          type: "deposit",
          amount,
          status: "pending",
          meta: { paymentId: payment.id },
        },
      });

      return res.json({
        paymentId: payment.id,
        confirmationToken: payment.confirmation.confirmation_token,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Ошибка при создании платежа" });
    }
  },

  // Ручное получение статуса платежа
  // GET /api/payments/status
  status: async (req, res) => {
    try {
      const { paymentId } = req.params;
      const payment = await yookassa.getPayment(paymentId);
      res.json(payment);
    } catch (e) {
      res.status(500).json({ error: "Ошибка получения статуса" });
    }
  },

  // Обработка успешного платежа
  // ЮKassa сама отправляет POST-запрос на твой URL, например:
  // POST /api/payments/webhook

  // Что делаем:
  // Проверяем тип event
  // Находим Payment
  // Обновляем статус
  // Находим транзакцию type=deposit (pending)
  // Обновляем её на success
  // Пополняем UserBalance атомарно (транзакцией Prisma)

  webhook: async (req, res) => {
    try {
      // --- 1. Проверяем подпись ---
      const signature =
        req.headers["x-request-id"] || req.headers["http_yookassa_signature"];
      if (!signature) return res.status(400).send("signature missing");

      const body = JSON.stringify(req.body);
      const hmac = crypto.createHmac("sha256", secretKey);
      hmac.update(body);
      const hash = hmac.digest("base64");

      if (hash !== signature) {
        console.warn("Invalid webhook signature");
        return res.status(400).send("invalid signature");
      }

      const event = req.body;

      // --- 2. Обрабатываем только успешные платежи ---
      if (event.event !== "payment.succeeded")
        return res.status(200).send("ignored");

      const p = event.object;

      // --- 3. Находим Payment ---
      const dbPayment = await prisma.payment.findUnique({
        where: { paymentId: p.id },
      });

      if (!dbPayment) return res.status(404).send("payment not found");

      // --- 4. Если уже обработан — игнорируем ---
      if (dbPayment.status === "succeeded") {
        return res.status(200).send("already processed");
      }

      // --- 5. Атомарный апдейт через транзакцию Prisma ---
      await prisma.$transaction([
        // Обновляем Payment
        prisma.payment.update({
          where: { id: dbPayment.id },
          data: { status: "succeeded" },
        }),

        // Обновляем транзакцию
        prisma.balanceTransaction.updateMany({
          where: {
            userId: dbPayment.userId,
            type: "deposit",
            meta: { path: ["paymentId"], equals: p.id },
          },
          data: { status: "success" },
        }),

        // Пополнение баланса пользователя
        prisma.userBalance.update({
          where: { userId: dbPayment.userId },
          data: { balance: { increment: dbPayment.amount } },
        }),
      ]);

      return res.status(200).send("ok");
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).send("error");
    }
  },

  // Получаем историю операций пользователя
  // GET /api/payments/history
  history: async (req, res) => {
    const userId = req.user.id;

    const transactions = await prisma.balanceTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(transactions);
  },

  // Списание денег с баланса (например покупка отклика)
  //   POST /api/balance/withdraw

  // Архиважно:
  // — проверяем баланс
  // — уменьшаем
  // — создаём транзакцию: type="withdrawal"
  withdraw: async (req, res) => {
    try {
      const userId = req.user.id;
      const { amount, reason } = req.body;

      const balance = await prisma.userBalance.findUnique({
        where: { userId },
      });

      if (balance.balance < amount) {
        return res.status(400).json({ error: "Недостаточно средств" });
      }

      // Атомарное списание
      await prisma.$transaction([
        prisma.userBalance.update({
          where: { userId },
          data: { balance: { decrement: amount } },
        }),
        prisma.balanceTransaction.create({
          data: {
            userId,
            amount,
            type: "withdrawal",
            status: "success",
            meta: { reason },
          },
        }),
      ]);

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Ошибка списания" });
    }
  },
};

module.exports = PaymentController;
