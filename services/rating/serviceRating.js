const { calculateProfileRating } = require("./profileRating");
const { calculateActivityScore } = require("./activityRating");
const { calculateResultScore } = require("./performanceRating");

/**
 * Рассчитывает общий сервисный рейтинг репетитора
 * @param {Object} params
 * @param {Object} params.tutor - объект репетитора
 * @param {Array} params.educations - массив TutorEducation репетитора
 * @param {Array} params.subjectPrices - массив TutorSubjectPrice репетитора
 * @param {Array} params.tutorGoals - массив TutorGoal репетитора
 * @param {number} params.medianResponses - медиана откликов за 30 дней (для активности)
 * @param {number} params.medianContracts - медиана "Договорились" за 30 дней (для результативности)
 * @returns {number} serviceScore - от 0 до 1
 */
const calculateServiceRating = ({
  tutor,
  responseCount30d,
  responseTimeOrderSeconds,
  contractsCount30d,
  medianResponses,
  medianContracts,
}) => {
  // 1️⃣ Категория "Профиль" (макс 40)
  const profileScore = calculateProfileRating({
    tutor,
    educations: tutor.educations,
    subjectPrices: tutor.subjectPrices,
    tutorGoals: tutor.tutorGoals,
  });
  const weightProfile = 40;

  // 2️⃣ Категория "Активность" (макс 40)
  const activityScore = calculateActivityScore(
    responseCount30d,
    responseTimeOrderSeconds,
    medianResponses
  );
  const weightActivity = 40;

  // 3️⃣ Категория "Результативность" (макс 20)
  const resultScore = calculateResultScore(
    contractsCount30d,
    medianContracts,
    responseCount30d
  );
  const weightResult = 20;

  // 4️⃣ Общий сервисный рейтинг
  const serviceScore =
    (profileScore * weightProfile +
      activityScore * weightActivity +
      resultScore * weightResult) /
    (weightProfile + weightActivity + weightResult);

  return serviceScore; // число от 0 до 1
};

module.exports = { calculateServiceRating };
