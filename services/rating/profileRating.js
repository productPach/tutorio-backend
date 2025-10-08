/**
 * Рассчитывает рейтинг категории "Профиль" для репетитора
 * @param {Object} tutor - объект репетитора из Prisma
 * @param {Array} educations - массив TutorEducation репетитора
 * @param {Array} subjectPrices - массив TutorSubjectPrice репетитора
 * @param {Array} tutorGoals - массив TutorGoal репетитора
 * @returns {Number} score - значение от 0 до 1
 */
const calculateProfileRating = ({
  tutor,
  educations = [],
  subjectPrices = [],
  tutorGoals = [],
}) => {
  // Проверяем цели по каждому предмету
  const subjectsWithGoals = tutor.subject?.map((s) =>
    tutorGoals.some((g) => g.subjectId === s)
  );

  // Проверяем цены по каждому предмету
  const subjectsWithPrices = tutor.subject?.map((s) =>
    subjectPrices.some((p) => p.subjectId === s)
  );

  // Проверяем комментарии по предметам
  const subjectsWithComments =
    tutor.subject?.map((s) =>
      tutor.subjectComments?.some((c) => c.subjectId === s && c.comment)
    ) || [];

  const factors = [
    { value: tutor.profileInfo ? 1 : 0, weight: 2 },
    { value: tutor.avatarUrl ? 1 : 0, weight: 2 },
    { value: tutor.experience ? 1 : 0, weight: 2 },
    { value: educations.length > 0 ? 1 : 0, weight: 3 },
    {
      value: educations.some((e) => e.educationDiplomUrl?.length > 0) ? 1 : 0,
      weight: 2,
    },
    { value: subjectsWithGoals?.every(Boolean) ? 1 : 0, weight: 3 },
    { value: subjectsWithPrices?.every(Boolean) ? 1 : 0, weight: 3 },
    { value: subjectsWithComments?.every(Boolean) ? 1 : 0, weight: 2 },
    { value: tutor.isVerifedEmail ? 1 : 0, weight: 3 },
    { value: tutor.telegramId ? 1 : 0, weight: 3 },
    { value: tutor.isNotifications ? 1 : 0, weight: 3 },
    { value: tutor.isNotificationsOrders ? 1 : 0, weight: 3 },
    { value: tutor.isNotificationsResponse ? 1 : 0, weight: 3 },
    { value: tutor.isStudentResponses ? 1 : 0, weight: 3 },
    { value: tutor.isPublicProfile ? 1 : 0, weight: 3 },
  ];

  const totalWeight = factors.reduce((acc, f) => acc + f.weight, 0);
  const score =
    factors.reduce((acc, f) => acc + f.value * f.weight, 0) / totalWeight;

  return score;
};

module.exports = { calculateProfileRating };
