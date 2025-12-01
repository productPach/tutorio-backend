const { prisma } = require("../prisma/prisma-client");
const crypto = require("crypto");
const YooKassa = require("yookassa");
const { getNextSequence } = require("../services/counterId/counterId");
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
      const userId = req.user.userID;
      const { amount } = req.body; // В КОПЕЙКАХ

      if (!amount || amount < 10000) {
        return res
          .status(400)
          .json({ error: "Минимальная сумма — 100 рублей" });
      }

      // Получаем email пользователя в зависимости от роли
      const activeRole = req.user.activeRole; // student, tutor или employee
      let userEmail = null;

      if (activeRole === "student") {
        const student = await prisma.student.findUnique({
          where: { userId: userId },
          select: { email: true },
        });
        userEmail = student?.email;
      } else if (activeRole === "tutor") {
        const tutor = await prisma.tutor.findUnique({
          where: { userId: userId },
          select: { email: true },
        });
        userEmail = tutor?.email;
      } else if (activeRole === "admin") {
        const employee = await prisma.employee.findUnique({
          where: { userId: userId },
          select: { email: true },
        });
        userEmail = employee?.email;
      }

      if (!userEmail) {
        return res.status(400).json({
          error: "У пользователя не указан email в выбранной роли",
        });
      }

      const amountInRubles = (amount / 100).toFixed(2);

      // Создаём платёж через ЮKassa
      const payment = await yookassa.createPayment({
        amount: {
          value: amountInRubles,
          currency: "RUB",
        },
        confirmation: {
          type: "embedded", // ВИДЖЕТ!
        },
        capture: true,
        description: `Пополнение баланса пользователя ${userId}`,
        receipt: {
          customer: {
            email: userEmail,
          },
          items: [
            {
              description: "Пополнение баланса",
              quantity: "1.00",
              amount: {
                value: amountInRubles,
                currency: "RUB",
              },
              vat_code: 1, // Без НДС
              payment_mode: "full_payment", // Полный расчет
              payment_subject: "payment", // Платеж (для пополнения баланса)
              measure: "piece", // Штука, единица товара
            },
          ],
          // settlements: [
          //   {
          //     type: "cashless", // Безналичный расчет
          //   },
          // ], // Вроде как нужно только в запросе на создание чека! А в этом запросе на создание платежа ЮКасса автоматом подставит значение безначала
          // Опционально: для интернет-платежей
          // internet: true,
          // Опционально: часовой пояс (например, для Москвы GMT+3)
          // timezone: 3,
        },
      });

      // Сохраняем Payment
      const dbPayment = await prisma.payment.create({
        data: {
          userId,
          paymentId: payment.id,
          amount,
          status: payment.status,
          meta: {
            customer: {
              email: userEmail,
            },
            items: [
              {
                description: "Пополнение баланса",
                quantity: "1.00",
                amount: {
                  value: amountInRubles,
                  currency: "RUB",
                },
                vat_code: 1, // Без НДС
                payment_mode: "full_payment", // Полный расчет
                payment_subject: "payment", // Платеж (для пополнения баланса)
                measure: "piece", // Штука, единица товара
              },
            ],
            // Опционально: для интернет-платежей
            // internet: true,
            // Опционально: часовой пояс (например, для Москвы GMT+3)
            // timezone: 3,
          },
        },
      });

      // Получаем актуальный номер сущности в каунтере для создания человекопонятного ID
      const balanceTransactionNumber = await getNextSequence(
        "balanceTransaction"
      );

      // Создаём pending транзакцию
      await prisma.balanceTransaction.create({
        data: {
          userId,
          type: "deposit",
          amount,
          status: "pending",
          balanceTransactionNumber: balanceTransactionNumber,
          meta: {
            paymentId: payment.id,
            receiptEmail: userEmail,
            reason: "Пополнение баланса",
          },
        },
      });

      return res.json({
        paymentId: payment.id,
        confirmationToken: payment.confirmation.confirmation_token,
      });
    } catch (err) {
      console.error(err);

      // Более детальная обработка ошибки
      if (err.code === "invalid_request") {
        let errorMessage = "Ошибка при создании платежа";

        if (err.parameter === "receipt") {
          errorMessage = "Ошибка формирования чека";
          if (err.description) {
            errorMessage += `: ${err.description}`;
          }
        }

        return res.status(400).json({
          error: errorMessage,
          parameter: err.parameter,
          details: err.description,
        });
      }

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

  // webhook: async (req, res) => {
  //   try {
  //     console.log("Webhook получен, заголовки:", req.headers);

  //     const bodyBuffer = req.body;
  //     const event = JSON.parse(bodyBuffer.toString("utf-8"));
  //     console.log("Webhook event:", event);

  //     if (event.event !== "payment.succeeded") {
  //       console.log("Ignoring event:", event.event);
  //       return res.status(200).send("ignored");
  //     }

  //     const p = event.object;

  //     // --- Находим Payment ---
  //     const dbPayment = await prisma.payment.findUnique({
  //       where: { paymentId: p.id },
  //     });

  //     if (!dbPayment) {
  //       console.warn("Payment not found:", p.id);
  //       return res.status(404).send("payment not found");
  //     }

  //     if (dbPayment.status === "succeeded") {
  //       console.log("Payment already processed:", p.id);
  //       return res.status(200).send("already processed");
  //     }

  //     // --- Находим связанные транзакции ---
  //     const transactions = await prisma.balanceTransaction.findMany({
  //       where: {
  //         userId: dbPayment.userId,
  //         type: "deposit",
  //       },
  //     });

  //     const targetTransactionIds = transactions
  //       .filter((t) => t.meta?.paymentId === p.id)
  //       .map((t) => t.id);

  //     // --- Атомарный апдейт ---
  //     await prisma.$transaction([
  //       prisma.payment.update({
  //         where: { id: dbPayment.id },
  //         data: {
  //           status: "succeeded",
  //           rawWebhook: event,
  //           // Никакой user здесь не нужен
  //         },
  //       }),
  //       prisma.balanceTransaction.updateMany({
  //         where: { id: { in: targetTransactionIds } },
  //         data: { status: "success" },
  //       }),
  //       prisma.userBalance.upsert({
  //         where: { userId: dbPayment.userId },
  //         update: { balance: { increment: dbPayment.amount } }, // используем int копейки
  //         create: {
  //           userId: dbPayment.userId,
  //           balance: dbPayment.amount,
  //         },
  //       }),
  //     ]);

  //     console.log("Payment processed successfully:", p.id);
  //     return res.status(200).send("ok");
  //   } catch (err) {
  //     console.error("Webhook error:", err);
  //     return res.status(500).send("error");
  //   }
  // },

  webhook: async (req, res) => {
    try {
      console.log("Webhook получен, заголовки:", req.headers);

      const bodyBuffer = req.body;
      const event = JSON.parse(bodyBuffer.toString("utf-8"));
      console.log("Webhook event:", event.event);

      const p = event.object;

      // --- Находим Payment ---
      const dbPayment = await prisma.payment.findUnique({
        where: { paymentId: p.id },
      });

      if (!dbPayment) {
        console.warn("Payment not found:", p.id);
        return res.status(404).send("payment not found");
      }

      // --- Обработка разных событий ---
      if (event.event === "payment.succeeded") {
        if (dbPayment.status === "succeeded") {
          console.log("Payment already processed:", p.id);
          return res.status(200).send("already processed");
        }

        // --- Находим связанные транзакции ---
        const transactions = await prisma.balanceTransaction.findMany({
          where: {
            userId: dbPayment.userId,
            type: "deposit",
          },
        });

        const targetTransactionIds = transactions
          .filter((t) => t.meta?.paymentId === p.id)
          .map((t) => t.id);

        // --- Атомарный апдейт ---
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: dbPayment.id },
            data: {
              status: "succeeded",
              rawWebhook: event,
            },
          }),
          prisma.balanceTransaction.updateMany({
            where: { id: { in: targetTransactionIds } },
            data: { status: "success" },
          }),
          prisma.userBalance.upsert({
            where: { userId: dbPayment.userId },
            update: { balance: { increment: dbPayment.amount } },
            create: {
              userId: dbPayment.userId,
              balance: dbPayment.amount,
            },
          }),
        ]);

        console.log("Payment succeeded:", p.id);
        return res.status(200).send("ok");
      } else if (event.event === "payment.waiting_for_capture") {
        // Просто обновляем статус, деньги НЕ зачисляем
        await prisma.payment.update({
          where: { id: dbPayment.id },
          data: {
            status: "waiting_for_capture",
            rawWebhook: event,
          },
        });

        console.log("Payment waiting for capture:", p.id);
        return res.status(200).send("ok");
      } else if (event.event === "payment.canceled") {
        // Отменяем платеж и транзакции, баланс НЕ меняем
        const transactions = await prisma.balanceTransaction.findMany({
          where: {
            userId: dbPayment.userId,
            type: "deposit",
          },
        });

        const targetTransactionIds = transactions
          .filter((t) => t.meta?.paymentId === p.id)
          .map((t) => t.id);

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: dbPayment.id },
            data: {
              status: "canceled",
              rawWebhook: event,
            },
          }),
          prisma.balanceTransaction.updateMany({
            where: { id: { in: targetTransactionIds } },
            data: {
              status: "canceled",
              meta: {
                ...transactions.find((t) => targetTransactionIds.includes(t.id))
                  ?.meta,
                reasonYookassa: p.cancellation_details?.reason || null,
              },
            },
          }),
        ]);

        console.log("Payment canceled:", p.id);
        return res.status(200).send("ok");
      } else if (event.event === "refund.succeeded") {
        // Обработка возврата
        await prisma.$transaction([
          prisma.balanceTransaction.create({
            data: {
              userId: dbPayment.userId,
              type: "refund",
              amount: -p.amount.value, // отрицательная сумма
              status: "success",
              meta: {
                refundId: p.id,
                paymentId: dbPayment.paymentId,
                reason: p.description,
              },
            },
          }),
          prisma.userBalance.upsert({
            where: { userId: dbPayment.userId },
            update: { balance: { decrement: p.amount.value } },
            create: {
              userId: dbPayment.userId,
              balance: -p.amount.value,
            },
          }),
          prisma.payment.update({
            where: { id: dbPayment.id },
            data: {
              status: "refunded",
              rawWebhook: event,
            },
          }),
        ]);

        console.log("Refund processed:", p.id);
        return res.status(200).send("ok");
      } else {
        console.log("Ignoring event:", event.event);
        return res.status(200).send("ignored");
      }
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).send("error");
    }
  },

  // Получаем историю операций пользователя
  // GET /api/payments/history
  history: async (req, res) => {
    const userId = req.user.userID;

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

  // — deposit	Пополнение баланса пользователя (например, через ЮKassa или карту)
  // — withdrawal	Снятие денег пользователем с баланса на свой счёт/карту
  // — refund	Возврат средств (например, отменённый заказ или отклик)
  // — service_purchase	Покупка услуги на платформе (например, отклик репетитора, премиум-функция)
  // — payout	Выплата репетитору или сотруднику с платформы (например, закрытый заказ или заработок)

  withdraw: async (req, res) => {
    try {
      const userId = req.user.userID;
      const { amount, type = "service_purchase", reason } = req.body;

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
            type: type,
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
