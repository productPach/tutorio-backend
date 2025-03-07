const axios = require("axios");
const { prisma } = require("../prisma/prisma-client");

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

  sendVerificationEmail: async (req, res) => {
    // Получаем данные из запроса
    const { id } = req.params;

    // Находим репетитора по userId
    const tutor = await prisma.tutor.findUnique({
      where: { id },
    });

    // Если репетитор не найден
    if (!tutor) {
      return res.status(404).json({ error: "Репетитор не найден" });
    }

    // Генерация нового токена для подтверждения email
    const emailVerificationToken = jwt.sign(
      { tutorId: id, email: tutor.email }, // информация для токена
      process.env.SECRET_KEY, // Секретный ключ для подписи
      { expiresIn: "1h" } // Срок действия токена (1 час)
    );

    // Обновляем репетитора с новым токеном подтверждения
    await prisma.tutor.update({
      where: { id },
      data: {
        emailVerificationToken, // Сохраняем токен в базе данных
        emailTokenExpires: new Date(Date.now() + 3600000), // Время истечения токена (1 час)
      },
    });

    // Составляем текст письма
    const subject = "Подтверждение почты";
    const text = `Здравствуйте, ${tutor.name}!\n\nДля подтверждения вашего адреса электронной почты, пожалуйста, перейдите по следующей ссылке: \n\nhttp://yourdomain.com/verify-email?token=${emailVerificationToken}\n\nСсылка действительна 1 час.`;
    // Логика для установки правильного домена
    let domain = "";
    if (environment === "development") {
      domain = "http://localhost:3001"; // Локальный домен для разработки
    } else {
      domain = "https://tutorio.ru"; // Продукционный домен
    }
    const html = `
  <p>Здравствуйте, ${tutor.name}!</p>
  <p>Для подтверждения вашего адреса электронной почты, пожалуйста, нажмите на кнопку ниже:</p>
  <a href="${domain}/verify-email?token=${emailVerificationToken}" 
     style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px; text-align: center;">
    Подтвердить почту
  </a>
  <p>Ссылка действительна 1 час.</p>
`;

    // Отправка письма через MailoPost API
    try {
      const response = await axios.post(
        `${MAILOPOST_API_URL}/email/messages`,
        {
          from_email: "info@tutorio.ru",
          from_name: "Tutorio",
          to: tutor.email,
          subject,
          text,
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Ответ успешной отправки
      res.status(200).json({
        message: "Письмо с проверкой почты отправлено",
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
