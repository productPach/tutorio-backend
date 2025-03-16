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

  sendVerificationEmail: async (req, res) => {
    // Получаем id из тела запроса
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Не указан id репетитора" });
    }

    // Определяем домен
    const domain =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : "https://tutorio.ru";

    try {
      // Находим репетитора по userId
      const tutor = await prisma.tutor.findUnique({
        where: { id },
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // Если почта уже подтверждена, не отправляем письмо повторно
      if (tutor.isVerifedEmail) {
        return res.status(400).json({ error: "Email уже подтвержден" });
      }

      // Проверяем, установлен ли SECRET_KEY
      if (!process.env.SECRET_KEY) {
        console.error("SECRET_KEY не установлен в .env");
        return res.status(500).json({ error: "Ошибка сервера" });
      }

      // Генерация токена подтверждения
      const emailVerificationToken = jwt.sign(
        { tutorId: id, email: tutor.email },
        process.env.SECRET_KEY,
        { expiresIn: "1h" }
      );

      // HTML-шаблон письма
      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Подтверждение почты tutorio</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Sans&family=Montserrat:wght@400;500;600&family=PT+Sans&family=Poppins:wght@400;600&family=Sofia+Sans:wght@900&family=Source+Sans+3:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0;font-family:'Source Sans 3',sans-serif"">
    <div style="background-color:#F1F2F4;padding: 60px 0;display:flex;flex-direction:column;align-items:center;">
        <div style="display:flex;;width:100%;max-width:600px;flex-direction:column;align-items:center;justify-content:center;background-color: white;border-radius: 10px;padding: 60px 0">
            <div style="max-width: 400px;">
        <div style="display:flex;flex-direction:column;gap:0px;margin-bottom:50px;">
            <div style="font-family:Sofia Sans,sans-serif;font-weight:900;font-size:32px;">Tutorio</div>
            <span style="font-family:Fira Sans,sans-serif;font-weight: 400;font-size: 9px;">Онлайн-сервис подбора репетиторов</span>
        </div>
        <div style="width:200px;">
            <img style="width:200px;" src="/media//img_email/mail.svg">
        </div>
        <div>
            <h1 style="font-family:'Source Sans 3',sans-serif;margin:10px 0 0 0;font-size:28px;">
                Подтверждение почты
               </h1>
               <p style="font-family:'Source Sans 3',sans-serif;margin:5px 0 20px 0;font-size:16px;">
                Просто нажмите на&nbsp;эту кнопку и&nbsp;готово
               </p>
               <div style="margin-bottom:20px;">
                <a href="${domain}/verify-email?token=${emailVerificationToken}" style="font-family:'Source Sans 3',sans-serif;background-color:#fad949;color:#333333;display:inline-block;font-size:18px;font-weight:700;line-height:56px;text-align:center;text-decoration:none;width:100%;-webkit-text-size-adjust:none;border-radius:10px;" target="_blank" class="MsoNormal_mr_css_attr" rel=" noopener noreferrer">
                    Подтвердить
                </a>
               </div>
                <p style="font-family:'Source Sans 3',sans-serif;margin:0 0 10px 0;font-size:16px;">
                    Или пройдите по&nbsp;ссылке:
                </p>
                <a href="${domain}/verify-email?token=${emailVerificationToken}" style="font-family:'Source Sans 3',sans-serif;font-size:16px;color:#222222;text-decoration:underline;" target="_blank" rel=" noopener noreferrer">
                    https://tutorio.ru/verify-email
                </a>
                <p style="font-family:'Source Sans 3',sans-serif;margin:10px 0;font-size:14px;color:#888888;">
                    Если вы&nbsp;не&nbsp;оставляли эту почту в&nbsp;Tutorio&nbsp;—
                    не&nbsp;нажимайте. Кто-то ошибся почтой и&nbsp;указал вашу
                </p>
        </div>
      </div>
    </div>
    </div>
</body>
</html>`;

      // Отправка письма
      const response = await axios.post(
        `${MAILOPOST_API_URL}/email/messages`,
        {
          from_email: "info@tutorio.ru",
          from_name: "Tutorio",
          to: tutor.email,
          subject: "Подтверждение почты",
          text: `Перейдите по ссылке для подтверждения: ${domain}/verify-email?token=${emailVerificationToken}`,
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `Письмо отправлено на ${tutor.email}, статус:`,
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
