const axios = require("axios");

const MAILOPOST_API_URL = "https://api.mailopost.ru/v1/messages/send";
const API_TOKEN = process.env.MAILOPOST_API_TOKEN;

const MailController = {
  // Отправка письма
  sendEmail: async (req, res) => {
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const response = await axios.post(
        MAILOPOST_API_URL,
        {
          from: "your-email@example.com", // Замените на ваш email
          to,
          subject,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
          },
        }
      );

      res
        .status(200)
        .json({ message: "Письмо отправлено", data: response.data });
    } catch (error) {
      console.error("Ошибка при отправке письма:", error);
      res.status(500).json({ error: "Ошибка при отправке письма" });
    }
  },
};

module.exports = MailController;
