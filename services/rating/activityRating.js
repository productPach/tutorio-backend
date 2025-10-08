/**
 * Пороговая таблица для среднего времени ответа (в минутах)
 */
const responseTimeThresholds = [
  { max: 1, value: 1 }, // 1 минута
  { max: 5, value: 0.6 }, // 5 минут
  { max: 15, value: 0.4 }, // 15 минут
  { max: 30, value: 0.3 }, // 30 минут
  { max: 60, value: 0.2 }, // 1 час
  { max: 180, value: 0.15 }, // 3 часа
  { max: 360, value: 0.125 }, // 6 часов
  { max: 720, value: 0.1 }, // 12 часов
  { max: 1440, value: 0.1 }, // 24 часа
  { max: Infinity, value: 0.05 }, // больше 24 часов
];

/**
 * Функция для перевода времени ответа в value от 0 до 1
 * @param {number} minutes - среднее время ответа в минутах
 * @returns {number} value от 0 до 1
 */
const getResponseTimeValue = (minutes) => {
  const threshold = responseTimeThresholds.find((t) => minutes <= t.max);
  return threshold ? threshold.value : 0;
};

/**
 * Расчёт категории "Активность" для репетитора
 * @param {Object} tutor - объект репетитора
 * @param {Object} responseCount30d - количество откликов (чатов) репетитора за 30 дней
 * @param {Object} responseTimeOrderSeconds - среднее время отклика репетитора на заказ (в секундах)
 * @param {Object} contractsCount30d - количество контрактов репетитора за 30 дней
 * @param {number} medianResponses - медианное количество откликов за 30 дней
 * @returns {number} categoryScore от 0 до 1
 */
const calculateActivityScore = (
  responseCount30d,
  responseTimeOrderSeconds,
  medianResponses
) => {
  console.log("=== CALCULATION DEBUG ===");
  console.log("responseCount30d:", responseCount30d);
  console.log("responseTimeOrderSeconds:", responseTimeOrderSeconds);
  console.log("medianResponses:", medianResponses);
  // 1️⃣ Количество откликов за 30 дней
  const responses30d = responseCount30d || 0; // нужно заранее посчитать
  const valueResponses = medianResponses
    ? Math.min(responses30d / medianResponses, 2) / 2
    : responses30d > 0
    ? 1
    : 0;

  console.log("valueResponses:", valueResponses);

  // 2️⃣ Среднее время ответа на заказ (в минутах)
  const avgResponseOrderMinutes = (responseTimeOrderSeconds || 0) / 60;
  console.log("avgResponseOrderMinutes:", avgResponseOrderMinutes);
  // если репетитор не ответил ни в одном чате, ставим 0
  const valueResponseOrder =
    responseTimeOrderSeconds > 0
      ? getResponseTimeValue(avgResponseOrderMinutes)
      : 0;
  console.log("valueResponseOrder:", valueResponseOrder);

  // 3️⃣ Среднее время ответа ученику (в минутах)
  // const avgResponseStudentMinutes =
  //   (tutor.responseTimeStudentSeconds || 0) / 60;
  // const valueResponseStudent = getResponseTimeValue(avgResponseStudentMinutes);

  // Список факторов с весами
  const factors = [
    { value: valueResponses, weight: 20 },
    { value: valueResponseOrder, weight: 20 },
    // { value: valueResponseStudent, weight: 15 },
  ];

  // Взвешенное среднее
  const totalWeight = factors.reduce((acc, f) => acc + f.weight, 0);
  const score =
    factors.reduce((acc, f) => acc + f.value * f.weight, 0) / totalWeight;
  console.log("FINAL SCORE:", score);
  console.log("====================");
  return score; // число от 0 до 1
};

module.exports = { calculateActivityScore };
