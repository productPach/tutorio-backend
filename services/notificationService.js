const { prisma } = require("../prisma/prisma-client");

const sendTelegramNotification = async ({ tutorId, text }) => {
  if (!tutorId || !text) throw new Error("tutorId и text обязательны");

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });

  if (!tutor || !tutor.telegramId) {
    throw new Error("Репетитор не найден или Telegram не подключён");
  }

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tutor.telegramId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );
};

module.exports = { sendTelegramNotification };
