const { prisma } = require("../prisma/prisma-client");
const axios = require("axios");
const bcrypt = require("bcryptjs");

const SmsController = {
  // Отправка SMS-кода пользователю с ограничением по времени
  sendSms: async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Не указан номер телефона" });
      }

      const apiId = process.env.SMSRU_API_ID;
      if (!apiId) {
        return res.status(500).json({ error: "Отсутствует SMSRU_API_ID" });
      }

      // Проверяем запись
      const existing = await prisma.smsVerification.findUnique({
        where: { phone },
      });

      const now = new Date();

      // Определяем индекс (количество предыдущих отправок)
      let index = 0;
      if (existing) {
        const lastRetryTime = existing.retryAvailableAt;
        // Если предыдущий код ещё действителен, считаем индекс по времени
        const diffMinutes = (now.getTime() - lastRetryTime.getTime()) / 60000;
        if (diffMinutes >= 0) index = existing.index || 0;
        else index = existing.index || 0; // сохраняем индекс
      }

      // Вычисляем время до следующей попытки по схеме
      let retryMinutes;
      if (index === 0) retryMinutes = 1;
      else if (index === 1) retryMinutes = 2; // раньше было 1:59, примерно
      else if (index === 2) retryMinutes = 5;
      else if (index === 3) retryMinutes = 15;
      else retryMinutes = 30;

      const retryAvailableAt = new Date(
        now.getTime() + retryMinutes * 60 * 1000
      );

      // Если пользователь недавно запрашивал код
      if (existing && existing.retryAvailableAt > now) {
        const retrySeconds = Math.ceil(
          (existing.retryAvailableAt.getTime() - now.getTime()) / 1000
        );
        return res.status(429).json({
          error: `Можно отправить код повторно через ${retrySeconds} сек.`,
          retryAvailableAt: existing.retryAvailableAt,
        });
      }

      // Генерация 4–6-значного кода
      const secretCode = Math.floor(1000 + Math.random() * 9000).toString();

      // Тайминги
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 минут

      // Отправляем SMS
      const response = await axios.post("https://sms.ru/sms/send", null, {
        params: {
          api_id: apiId,
          to: phone,
          msg: `Код подтверждения: ${secretCode}`,
          json: 1,
        },
      });

      if (response.data.status !== "OK") {
        return res.status(500).json({
          error: response.data.status_text || "Ошибка отправки SMS",
        });
      }

      // Сохраняем или обновляем запись
      await prisma.smsVerification.upsert({
        where: { phone },
        update: { secretCode, expiresAt, retryAvailableAt, index: index + 1 },
        create: { phone, secretCode, expiresAt, retryAvailableAt, index: 1 },
      });

      return res.status(200).json({
        message: "SMS успешно отправлено",
        retryAvailableAt,
        expiresAt,
      });
    } catch (error) {
      console.error("Send SMS Error:", error);
      return res.status(500).json({ error: "Ошибка при отправке SMS" });
    }
  },

  // Проверка введённого пользователем кода для авторизации (обновление пароля) / регистрации (создание пользователя)
  verifyCode: async (req, res) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ error: "Не указан номер или код" });
      }

      const record = await prisma.smsVerification.findUnique({
        where: { phone },
      });

      if (!record) {
        return res.status(400).json({ error: "Код не запрашивался" });
      }

      const now = new Date();

      if (record.expiresAt < now) {
        return res.status(400).json({ error: "Код истёк, запросите новый" });
      }

      if (record.secretCode !== code) {
        return res.status(400).json({ error: "Неверный код" });
      }

      // При успешной верификации можно удалить запись
      await prisma.smsVerification.delete({ where: { phone } });

      // Проверяем, есть ли пользователь с таким телефоном
      const existingUser = await prisma.user.findUnique({
        where: { phone },
      });

      const hashedCode = await bcrypt.hash(code, 10);

      if (existingUser) {
        // Обновляем секретный код (password)
        await prisma.user.update({
          where: { phone },
          data: { password: hashedCode },
        });
      } else {
        // Создаём нового пользователя с телефоном и секретным кодом
        await prisma.user.create({
          data: {
            phone,
            password: hashedCode,
          },
        });
      }

      return res
        .status(200)
        .json({ success: true, message: "Код подтверждён" });
    } catch (error) {
      console.error("Verify Code Error:", error);
      return res.status(500).json({ error: "Ошибка проверки кода" });
    }
  },

  // Проверка кода и обновление телефона/секретного ключа
  verifyCodeAndUpdatePhone: async (req, res) => {
    const userId = req.user.userID;
    try {
      const { oldPhone, newPhone, code } = req.body;

      if (!oldPhone || !newPhone || !code) {
        return res.status(400).json({ error: "Не указан один из параметров" });
      }

      // Проверяем, что новый телефон ещё свободен
      const existingUser = await prisma.user.findUnique({
        where: { phone: newPhone },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Номер телефона уже используется" });
      }

      // Проверяем код для НОВОГО телефона
      const record = await prisma.smsVerification.findUnique({
        where: { phone: newPhone },
      });

      if (!record) {
        return res.status(400).json({ error: "Код не запрашивался" });
      }

      const now = new Date();
      if (record.expiresAt < now) {
        return res.status(400).json({ error: "Код истёк, запросите новый" });
      }

      if (record.secretCode !== code) {
        return res.status(400).json({ error: "Неверный код" });
      }

      // Всё верно → удаляем запись с кодом
      await prisma.smsVerification.delete({ where: { phone: newPhone } });

      // Хэшируем код как секретный ключ
      const hashedCode = await bcrypt.hash(code, 10);

      // Обновляем пользователя: новый телефон + новый секретный код
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: newPhone,
          password: hashedCode,
        },
      });

      // Обновляем телефон в связанных таблицах (Student, Tutor)
      const existingStudent = await prisma.student.findUnique({
        where: { userId: userId },
      });

      if (existingStudent) {
        await prisma.student.update({
          where: { userId: userId },
          data: {
            phone: newPhone,
          },
        });
      }

      const existingTutor = await prisma.tutor.findUnique({
        where: { userId: userId },
      });

      if (existingTutor) {
        await prisma.tutor.update({
          where: { userId: userId },
          data: {
            phone: newPhone,
          },
        });
      }

      return res
        .status(200)
        .json({ success: true, message: "Номер телефона обновлён" });
    } catch (error) {
      console.error("Update Phone Error:", error);
      return res.status(500).json({ error: "Ошибка при обновлении телефона" });
    }
  },
};

module.exports = SmsController;
