/**
 * Пороговая таблица для конверсии откликов в "Договорились"
 */
const conversionThresholds = [
  { min: 0.2, value: 1 },
  { min: 0.1, value: 0.9 },
  { min: 0.05, value: 0.8 },
  { min: 0.025, value: 0.7 },
  { min: 0.125, value: 0.5 },
  { min: 0.1, value: 0.4 },
  { min: 0.05, value: 0.2 },
  { min: 0, value: 0 },
];

/**
 * Получаем value по конверсии
 * @param {number} conversion - число от 0 до 1
 * @returns {number} value от 0 до 1
 */
const getConversionValue = (conversion) => {
  const threshold = conversionThresholds.find((t) => conversion >= t.min);
  return threshold ? threshold.value : 0;
};

/**
 * Расчёт категории "Результативность" для репетитора
 * @param {Object} tutor - объект репетитора
 * @param {number} medianContracts - медианное количество "Договорились" за период
 * @returns {number} categoryScore от 0 до 1
 */
const calculateResultScore = (
  contractsCount30d,
  medianContracts,
  responseCount30d
) => {
  // 1️⃣ Количество "Договорились" → нормируем по медиане
  const contracts = contractsCount30d || 0;
  const valueContracts = medianContracts
    ? Math.min(contracts / medianContracts, 2) / 2
    : contracts > 0
    ? 1
    : 0;

  // 2️⃣ Конверсия откликов в "Договорились"
  const responses = responseCount30d || 0;
  const conversion = responses > 0 ? contracts / responses : 0;
  const valueConversion = getConversionValue(conversion);

  // Список факторов с весами
  const factors = [
    { value: valueContracts, weight: 15 },
    { value: valueConversion, weight: 5 },
  ];

  // Взвешенное среднее
  const totalWeight = factors.reduce((acc, f) => acc + f.weight, 0);
  const score =
    factors.reduce((acc, f) => acc + f.value * f.weight, 0) / totalWeight;

  return score; // число от 0 до 1
};

module.exports = { calculateResultScore };
