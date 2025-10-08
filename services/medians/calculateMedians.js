const { prisma } = require("../../prisma/prisma-client");
const dayjs = require("dayjs");

/**
 * Рассчитывает медианы откликов и договоров за последние 30 дней
 * @returns {Promise<{ medianResponses: number, medianContracts: number }>}
 */
async function calculateMedians() {
  const date30DaysAgo = dayjs().subtract(30, "day").toDate();

  // 1️⃣ Количество откликов (чатов) за 30 дней по каждому репетитору
  const responses = await prisma.chat.groupBy({
    by: ["tutorId"],
    _count: { tutorId: true },
    where: {
      createdAt: { gte: date30DaysAgo },
    },
  });

  const responseCounts = responses
    .map((r) => r._count.tutorId)
    .filter((n) => n != null);

  // 2️⃣ Количество успешных договоров за 30 дней по каждому репетитору
  const contracts = await prisma.contract.groupBy({
    by: ["tutorId"],
    _count: { tutorId: true },
    where: {
      selectedAt: { gte: date30DaysAgo },
      //status: "success", // или как у тебя отмечаются успешные договоренности
    },
  });

  const contractCounts = contracts
    .map((c) => c._count.tutorId)
    .filter((n) => n != null);

  // 3️⃣ Функция для расчёта медианы
  const median = (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  };

  const medianResponses = median(responseCounts);
  const medianContracts = median(contractCounts);

  return { medianResponses, medianContracts };
}

module.exports = { calculateMedians };
