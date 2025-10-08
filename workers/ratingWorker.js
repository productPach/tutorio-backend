const { Worker } = require("bullmq");
const { connection } = require("../queue/redis");
const { prisma } = require("../prisma/prisma-client");
const {
  fetchTutorData,
} = require("../services/tutors/fetchTutorsDataForRating");
const { calculateServiceRating } = require("../services/rating/serviceRating");

const CONCURRENCY = 5; // Можно регулировать под нагрузку на БД

// const worker = new Worker(
//   "ratingQueue",
//   async (job) => {
//     const { tutorId, medianResponses, medianContracts } = job.data;
//     console.log(`⚙️ Пересчёт рейтинга для репетитора ${tutorId}`);

//     // 1️⃣ Получаем данные (важно передать медианы!)
//     const tutorData = await fetchTutorData(
//       tutorId,
//       medianResponses,
//       medianContracts
//     );
//     if (!tutorData || !tutorData.tutor) {
//       console.warn(`❌ Репетитор ${tutorId} не найден`);
//       return;
//     }

//     // 2️⃣ Считаем сервисный рейтинг
//     const serviceScore = calculateServiceRating({
//       ...tutorData,
//       medianResponses,
//       medianContracts,
//     });

//     // 3️⃣ Сохраняем в базу
//     await prisma.tutor.update({
//       where: { id: tutorId },
//       data: { serviceRating: serviceScore },
//     });

//     console.log(`✅ Репетитор ${tutorId}: рейтинг ${serviceScore.toFixed(3)}`);
//   },
//   { connection, concurrency: CONCURRENCY }
// );

// worker.on("completed", (job) =>
//   console.log(`🎯 Задача ${job.id} выполнена успешно`)
// );
// worker.on("failed", (job, err) =>
//   console.error(`💥 Ошибка в задаче ${job.id}:`, err)
// );

// Новая версия с улучшенной обработкой ошибок и логированием
const worker = new Worker(
  "ratingQueue",
  async (job) => {
    const { tutorId, userRating, medianResponses, medianContracts } = job.data;

    try {
      // 1️⃣ Получаем оптимизированные данные репетитора
      const tutorData = await fetchTutorData(
        tutorId,
        medianResponses,
        medianContracts
      );
      if (!tutorData || !tutorData.tutor) {
        return `Репетитор ${tutorId} не найден`;
      }

      // 2️⃣ Считаем сервисный рейтинг
      const serviceScore = calculateServiceRating(tutorData);

      // 3️⃣ Считаем общий рейтинг как среднее userRating и serviceRating
      const normalizedUserRating = userRating / 5; // нормируем userRating к 0-1
      const totalRating = 0.5 * normalizedUserRating + 0.5 * serviceScore; // вес 50/50

      // 4️⃣ Округляем до 4 знаков перед сохранением
      const serviceScoreRounded = Number(serviceScore.toFixed(6));
      const totalRatingRounded = Number(totalRating.toFixed(6));

      // 5️⃣ Сохраняем оба рейтинга в базу
      await prisma.tutor.update({
        where: { id: tutorId },
        data: {
          serviceRating: serviceScoreRounded,
          totalRating: totalRatingRounded,
        },
      });

      // Возвращаем для логирования
      return { tutorId, serviceScore };
    } catch (err) {
      console.error(`Ошибка при расчёте рейтинга репетитора ${tutorId}:`, err);
      throw err; // чтобы BullMQ пометил задачу как failed
    }
  },
  { connection, concurrency: CONCURRENCY }
);

// 🔹 Опциональные события
worker.on("completed", (job) => {
  if (job.queue.name === "ratingQueue") {
    // Минимальные логи при больших объёмах
    console.log(`🎯 Задача ${job.id} выполнена успешно`);
  }
});
worker.on("failed", (job, err) =>
  console.error(`💥 Ошибка в задаче ${job.id}:`, err)
);

module.exports = worker;
