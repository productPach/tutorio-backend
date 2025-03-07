const axios = require("axios");

const MAILOPOST_API_URL = "https://api.mailopost.ru/v1";
const API_TOKEN = "bc45c119ceb875aaa808ef2ee561c5d9";

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
};

module.exports = MailController;
