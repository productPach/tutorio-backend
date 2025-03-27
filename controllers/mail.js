const axios = require("axios");
const { prisma } = require("../prisma/prisma-client");
const jwt = require("jsonwebtoken");

const MAILOPOST_API_URL = "https://api.mailopost.ru/v1";
const API_TOKEN = "bc45c119ceb875aaa808ef2ee561c5d9";
const environment = process.env.NODE_ENV; // Получаем значение NODE_ENV

const MailController = {
  // Отправка письма
  sendEmail: async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const response = await axios.post(
        `${MAILOPOST_API_URL}/email/messages`,
        {
          from_email: "info@tutorio.ru", // Укажите ваш email-отправитель
          from_name: "Tutorio", // Укажите имя отправителя
          to,
          subject,
          text,
          html, // HTML-версия письма
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.status(200).json({
        message: "Письмо отправлено",
        data: response.data,
      });
    } catch (error) {
      console.error(
        "Ошибка при отправке письма:",
        error.response?.data || error.message
      );
      res.status(error.response?.status || 500).json({
        error: "Ошибка при отправке письма",
        details: error.response?.data || error.message,
      });
    }
  },

  // sendVerificationEmail: async (req, res) => {
  //   // Получаем id из тела запроса
  //   const { id } = req.body;

  //   if (!id) {
  //     return res.status(400).json({ error: "Не указан id репетитора" });
  //   }

  //   // Определяем домен
  //   const domain =
  //     process.env.NODE_ENV === "development"
  //       ? "http://localhost:3001"
  //       : "https://tutorio.ru";

  //   try {
  //     // Находим репетитора по userId
  //     const tutor = await prisma.tutor.findUnique({
  //       where: { id },
  //     });

  //     if (!tutor) {
  //       return res.status(404).json({ error: "Репетитор не найден" });
  //     }

  //     // Если почта уже подтверждена, не отправляем письмо повторно
  //     if (tutor.isVerifedEmail) {
  //       return res.status(400).json({ error: "Email уже подтвержден" });
  //     }

  //     // Проверяем, установлен ли SECRET_KEY
  //     if (!process.env.SECRET_KEY) {
  //       console.error("SECRET_KEY не установлен в .env");
  //       return res.status(500).json({ error: "Ошибка сервера" });
  //     }

  //     // Генерация токена подтверждения
  //     const emailVerificationToken = jwt.sign(
  //       { tutorId: id, email: tutor.email },
  //       process.env.SECRET_KEY,
  //       { expiresIn: "1h" }
  //     );

  //     // Отправка письма
  //     const response = await axios.post(
  //       `${MAILOPOST_API_URL}/email/templates/1457785/messages`,
  //       {
  //         to: tutor.email,
  //         params: {
  //           domain: domain,
  //           emailVerificationToken: emailVerificationToken,
  //         },
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${API_TOKEN}`,
  //           "Content-Type": "application/json",
  //         },
  //       }
  //     );

  //     console.log(
  //       `Письмо отправлено на ${tutor.email}, статус:`,
  //       response.status
  //     );

  //     res.status(200).json({
  //       message: "Письмо с подтверждением отправлено",
  //       data: response.data,
  //     });
  //   } catch (error) {
  //     console.error(
  //       "Ошибка при отправке письма:",
  //       error.response?.data || error.message
  //     );
  //     res.status(500).json({
  //       error: "Ошибка при отправке письма",
  //       details: error.response?.data || error.message,
  //     });
  //   }
  // },

  sendVerificationEmail: async (req, res) => {
    // Получаем id и userType из тела запроса
    const { id, userType } = req.body;

    if (!id || !userType) {
      return res.status(400).json({ error: "Не указан id или userType" });
    }

    // Определяем домен
    const domain =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : "https://tutorio.ru";

    try {
      // Определяем, с какой сущностью работаем
      const user = await prisma[userType].findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({ error: `${userType} не найден` });
      }

      // Проверяем статус подтверждения email (для репетитора и ученика)
      if (user.isVerifedEmail) {
        return res.status(400).json({ error: "Email уже подтвержден" });
      }

      // Проверяем, установлен ли SECRET_KEY
      if (!process.env.SECRET_KEY) {
        console.error("SECRET_KEY не установлен в .env");
        return res.status(500).json({ error: "Ошибка сервера" });
      }

      // Генерация токена подтверждения
      const emailVerificationToken = jwt.sign(
        { userId: id, email: user.email, userType },
        process.env.SECRET_KEY,
        { expiresIn: "1h" }
      );

      // Отправка письма
      const response = await axios.post(
        `${MAILOPOST_API_URL}/email/templates/1457785/messages`,
        {
          to: user.email,
          params: {
            domain: domain,
            emailVerificationToken: emailVerificationToken,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `Письмо отправлено на ${user.email}, статус:`,
        response.status
      );

      res.status(200).json({
        message: "Письмо с подтверждением отправлено",
        data: response.data,
      });
    } catch (error) {
      console.error(
        "Ошибка при отправке письма:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Ошибка при отправке письма",
        details: error.response?.data || error.message,
      });
    }
  },
};

module.exports = MailController;
