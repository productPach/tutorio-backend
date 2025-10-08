const { prisma } = require("../../prisma/prisma-client");
const { ratingQueue } = require("../../queue/ratingQueue");
const { calculateMedians } = require("../medians/calculateMedians");

const BATCH_SIZE = 500;

/**
 * Добавляет в очередь задачи на пересчёт рейтингов репетиторов
 */
async function recalculateAllTutorRatings() {
  console.log("🚀 Начинаем пересчёт рейтингов всех репетиторов...");

  // 1️⃣ Считаем медианы для всех
  const { medianResponses, medianContracts } = await calculateMedians();
  console.log("📊 Медианы рассчитаны:", { medianResponses, medianContracts });

  // 2️⃣ Получаем общее количество репетиторов
  const totalTutors = await prisma.tutor.count();
  console.log(`👩‍🏫 Всего репетиторов: ${totalTutors}`);

  // 3️⃣ Проходим батчами
  for (let skip = 0; skip < totalTutors; skip += BATCH_SIZE) {
    const tutors = await prisma.tutor.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, userRating: true }, // берём только id, остальное подгрузит воркер
    });

    const jobs = tutors.map((t) => ({
      name: "calculateTutorRating",
      data: {
        tutorId: t.id,
        userRating: t.userRating,
        medianResponses,
        medianContracts,
      },
    }));

    // 4️⃣ Добавляем в очередь
    await ratingQueue.addBulk(jobs);

    console.log(
      `📦 Добавлено задач: ${jobs.length} (репетиторы ${skip + 1}–${
        skip + jobs.length
      })`
    );
  }

  console.log("✅ Все задачи на пересчёт рейтингов добавлены в очередь!");
}

module.exports = { recalculateAllTutorRatings };
