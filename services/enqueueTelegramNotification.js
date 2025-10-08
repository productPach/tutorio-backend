const { telegramQueue } = require("../queue/telegramQueue");

async function enqueueTelegramNotification(tutor, order, subject) {
  const baseText = `${order.goal} по ${subject.for_request}`;
  const url = `https://tutorio.ru/tutor/${order.id}`;
  // const url = `https://dev-tutorio.ru/tutor/${updatedOrder.id}`;
  const text = `${baseText}\n<a href="${url}">Детали заказа 👈</a>`;

  await telegramQueue.add("sendTelegram", {
    telegramId: tutor.telegramId,
    message: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = enqueueTelegramNotification;
