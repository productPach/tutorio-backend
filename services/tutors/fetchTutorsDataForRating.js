// services/rating/fetchTutorsData.js
const { prisma } = require("../../prisma/prisma-client");
const dayjs = require("dayjs");

/**
 * Получаем данные репетитора для расчёта сервисного рейтинга
 * @param {string} tutorId
 * @param {number} medianResponses
 * @param {number} medianContracts
 */

// Ещё более оптимизированная версия с минимальным количеством запросов к БД (4 запроса на репетитора, чаты, первые сообщения, контракты), вместо 1 + N + 1 + 1 в худшем случае (где N — количество чатов у репетитора)
// async function fetchTutorData(tutorId, medianResponses, medianContracts) {
//   const date30DaysAgo = dayjs().subtract(30, "day").toDate();

//   // 1️⃣ Репетитор с базовыми связями
//   const tutor = await prisma.tutor.findUnique({
//     where: { id: tutorId },
//     select: {
//       id: true,
//       profileInfo: true,
//       avatarUrl: true,
//       experience: true,
//       subject: true,
//       subjectComments: true,
//       isVerifedEmail: true,
//       telegramId: true,
//       isNotifications: true,
//       isNotificationsOrders: true,
//       isNotificationsResponse: true,
//       isStudentResponses: true,
//       isPublicProfile: true,
//       educations: {
//         select: { educationDiplomUrl: true },
//       },
//       subjectPrices: {
//         select: { subjectId: true },
//       },
//       tutorGoals: {
//         select: { subjectId: true },
//       },
//     },
//   });
//   if (!tutor) return null;

//   // 2️⃣ Чаты и количество откликов за 30 дней
//   const chatsStats = await prisma.chat.aggregate({
//     where: { tutorId, createdAt: { gte: date30DaysAgo } },
//     _count: { id: true },
//   });
//   const responseCount30d = chatsStats._count.id;

//   // 3️⃣ Время первого ответа на заказ (агрегация на стороне БД, используем publishedAt заказа)
//   // Получаем MIN(publishedAt) сообщения от репетитора по каждому заказу
//   const firstMessages = await prisma.message.groupBy({
//     by: ["chatId"],
//     where: {
//       chatId: {
//         in: await prisma.chat
//           .findMany({
//             where: { tutorId, createdAt: { gte: date30DaysAgo } },
//             select: { id: true },
//           })
//           .then((chats) => chats.map((c) => c.id)),
//       },
//       senderId: tutorId,
//     },
//     _min: { createdAt: true },
//   });

//   // Создаём словарь chatId → chatCreatedAt
//   const chatIdToCreatedAt = Object.fromEntries(
//     (
//       await prisma.chat.findMany({
//         where: { tutorId, createdAt: { gte: date30DaysAgo } },
//         select: { id: true, createdAt: true },
//       })
//     ).map((c) => [c.id, c.createdAt])
//   );

//   let totalResponseSeconds = 0;
//   for (const msg of firstMessages) {
//     const chatCreated = chatIdToCreatedAt[msg.chatId];
//     totalResponseSeconds +=
//       (msg._min.createdAt.getTime() - chatCreated.getTime()) / 1000;
//   }
//   const chatsWithResponses = firstMessages.length;
//   const responseTimeOrderSeconds =
//     chatsWithResponses > 0 ? totalResponseSeconds / chatsWithResponses : 0;

//   // 4️⃣ Количество контрактов за 30 дней (оптимизировано через count)
//   const contractsCount30d = await prisma.contract.count({
//     where: { tutorId, selectedAt: { gte: date30DaysAgo } },
//   });

//   return {
//     tutor,
//     responseCount30d,
//     responseTimeOrderSeconds,
//     contractsCount30d,
//     medianResponses,
//     medianContracts,
//   };
// }

// Используем publishedAt заказа вместо createdAt чата для расчёта времени первого ответа
async function fetchTutorData(tutorId, medianResponses, medianContracts) {
  const date30DaysAgo = dayjs().subtract(30, "day").toDate();

  // 1️⃣ Репетитор с базовыми связями
  const tutor = await prisma.tutor.findUnique({
    where: { id: tutorId },
    select: {
      id: true,
      profileInfo: true,
      avatarUrl: true,
      experience: true,
      subject: true,
      subjectComments: true,
      isVerifedEmail: true,
      telegramId: true,
      isNotifications: true,
      isNotificationsOrders: true,
      isNotificationsResponse: true,
      isStudentResponses: true,
      isPublicProfile: true,
      educations: {
        select: { educationDiplomUrl: true },
      },
      subjectPrices: {
        select: { subjectId: true },
      },
      tutorGoals: {
        select: { subjectId: true },
      },
    },
  });
  if (!tutor) return null;

  // 2️⃣ Чаты и количество откликов за 30 дней
  const chatsStats = await prisma.chat.aggregate({
    where: { tutorId, createdAt: { gte: date30DaysAgo } },
    _count: { id: true },
  });
  const responseCount30d = chatsStats._count.id;

  // 3️⃣ Время первого ответа на заказ (используем publishedAt заказа)
  // Получаем чаты с информацией о publishedAt заказа
  const chatsWithOrders = await prisma.chat.findMany({
    where: {
      tutorId,
      createdAt: { gte: date30DaysAgo },
    },
    select: {
      id: true,
      order: {
        select: {
          publishedAt: true,
        },
      },
    },
  });

  // Фильтруем чаты, у которых есть publishedAt
  const validChats = chatsWithOrders.filter((chat) => chat.order?.publishedAt);
  const validChatIds = validChats.map((chat) => chat.id);

  // Создаём словарь chatId → publishedAt
  const chatIdToPublishedAt = Object.fromEntries(
    validChats.map((chat) => [chat.id, chat.order.publishedAt])
  );

  // Получаем первые сообщения от репетитора в этих чатах
  const firstMessages = await prisma.message.groupBy({
    by: ["chatId"],
    where: {
      chatId: { in: validChatIds },
      senderId: tutorId,
    },
    _min: { createdAt: true },
  });

  // ЗАМЕНЯЕМ ЭТОТ БЛОК КОДА:
  // let totalResponseSeconds = 0;
  // let validResponsesCount = 0;

  // for (const msg of firstMessages) {
  //   const orderPublishedAt = chatIdToPublishedAt[msg.chatId];
  //   const firstMessageTime = msg._min.createdAt;

  //   if (orderPublishedAt && firstMessageTime) {
  //     // Дельта между публикацией заказа и первым сообщением репетитора
  //     const responseTimeSeconds =
  //       (firstMessageTime.getTime() - orderPublishedAt.getTime()) / 1000;

  //     // Игнорируем отрицательные значения (на случай некорректных данных)
  //     if (responseTimeSeconds >= 0) {
  //       totalResponseSeconds += responseTimeSeconds;
  //       validResponsesCount++;
  //     }
  //   }
  // }

  // const responseTimeOrderSeconds =
  //   validResponsesCount > 0 ? totalResponseSeconds / validResponsesCount : 0;

  // НА ЭТОТ (РАСЧЕТ МЕДИАНЫ):
  const responseTimes = []; // массив для хранения времени ответа в секундах

  for (const msg of firstMessages) {
    const orderPublishedAt = chatIdToPublishedAt[msg.chatId];
    const firstMessageTime = msg._min.createdAt;

    if (orderPublishedAt && firstMessageTime) {
      // Дельта между публикацией заказа и первым сообщением репетитора
      const responseTimeSeconds =
        (firstMessageTime.getTime() - orderPublishedAt.getTime()) / 1000;

      // Игнорируем отрицательные значения (на случай некорректных данных)
      if (responseTimeSeconds >= 0) {
        responseTimes.push(responseTimeSeconds);
      }
    }
  }

  // Сортируем массив времени ответов по возрастанию
  responseTimes.sort((a, b) => a - b);

  let responseTimeOrderSeconds = 0;
  if (responseTimes.length > 0) {
    // Вычисляем медиану
    const mid = Math.floor(responseTimes.length / 2);
    if (responseTimes.length % 2 === 0) {
      // Четное количество элементов - берем среднее двух центральных
      responseTimeOrderSeconds =
        (responseTimes[mid - 1] + responseTimes[mid]) / 2;
    } else {
      // Нечетное количество элементов - берем центральный
      responseTimeOrderSeconds = responseTimes[mid];
    }
  }

  // ДЛЯ ОТЛАДКИ - можно добавить логирование:
  console.log(`Tutor ${tutorId}:`, {
    totalResponses: responseTimes.length,
    responseTimes: responseTimes.map((sec) => (sec / 60).toFixed(1) + "min"), // в минутах для читаемости
    medianMinutes: (responseTimeOrderSeconds / 60).toFixed(1) + "min",
  });

  // 4️⃣ Количество контрактов за 30 дней
  const contractsCount30d = await prisma.contract.count({
    where: { tutorId, selectedAt: { gte: date30DaysAgo } },
  });

  return {
    tutor,
    responseCount30d,
    responseTimeOrderSeconds,
    contractsCount30d,
    medianResponses,
    medianContracts,
  };
}

module.exports = { fetchTutorData };
