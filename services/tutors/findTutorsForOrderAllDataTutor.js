const { prisma } = require("../../prisma/prisma-client");

// /**
//  * Проверка, подходит ли стоимость репетитора под заказ
//  */

const findTutorsForOrdersAllDataTutor = async (order) => {
  const {
    subject,
    goalId,
    studentPlace = [],
    region,
    studentTrip = [],
    studentHomeLoc = [],
    tutorType,
  } = order;

  const places = studentPlace.map((p) => p.trim().toLowerCase());
  const formats = [];
  if (places.includes("дистанционно")) formats.push("online");
  if (places.includes("у репетитора")) formats.push("home");
  if (places.includes("у меня дома")) formats.push("travel");

  // === Диапазон стоимости ===
  let orderMinCost = 0;
  let orderMaxCost = Infinity;
  switch (tutorType) {
    case "1":
      orderMaxCost = 1000;
      break;
    case "2":
      orderMinCost = 1000;
      orderMaxCost = 1500;
      break;
    case "3":
      orderMinCost = 1500;
      break;
    default:
      console.log("⚠️ ПОПАЛ В DEFAULT! tutorType:", tutorType);
  }

  // === Prisma фильтр (только по форматам и локациям) ===
  const tutors = await prisma.tutor.findMany({
    where: {
      status: "Active",
      subject: { has: subject },
      tutorGoals: { some: { subjectId: subject, goalId } },
      AND: [
        // Регион только если нет дистанционно
        ...(places.includes("дистанционно")
          ? []
          : [{ region: region || undefined }]),
      ],
      OR: [
        // Дистанционно
        ...(formats.includes("online") ? [{ tutorPlace: { has: "1" } }] : []),
        // У репетитора
        ...(formats.includes("home")
          ? [
              {
                tutorPlace: { has: "2" },
                tutorHomeLoc: { hasSome: studentTrip },
              },
            ]
          : []),
        // У меня дома
        ...(formats.includes("travel")
          ? [
              {
                tutorPlace: { has: "3" },
                OR: [
                  { tutorTripCity: { hasSome: studentHomeLoc } },
                  { tutorTripArea: { hasSome: studentHomeLoc } },
                ],
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      avatarUrl: true,
      subject: true,
      subjectComments: true,
      region: true,
      tutorPlace: true,
      tutorAdress: true,
      tutorHomeLoc: true,
      tutorTrip: true,
      tutorTripCityData: true,
      tutorTripCity: true,
      tutorTripArea: true,
      profileInfo: true,
      experience: true,
      educations: true,
      documents: true,
      isGroup: true,
      status: true,
      subjectPrices: true,
      isPublicProfile: true,
      isStudentResponses: true,
      isNotifications: true,
      isNotificationsOrders: true,
      isNotificationsResponse: true,
      isNotificationsPromo: true,
      isNotificationsSms: true,
      isNotificationsEmail: true,
      isNotificationsTelegram: true,
      isNotificationsMobilePush: true,
      isNotificationsWebPush: true,
      isNotificationsVk: true,
      badges: true,
      lastOnline: true,
      reviews: {
        include: {
          comments: true,
          student: { select: { name: true, avatarUrl: true } },
          order: { select: { id: true, goal: true, subject: true } },
        },
      },
      userRating: true,
      reviewsCount: true,
      averageReviewScore: true,
      totalRating: true,
    },
  });

  // === Фильтрация по стоимости (в JS) ===
  const filteredTutors = tutors.filter((tutor) => {
    const result = formats.some((format) => {
      const priceObj = tutor.subjectPrices.find(
        (p) => p.subjectId === subject && p.format === format
      );

      if (!priceObj) {
        return false;
      }

      const isOk =
        priceObj.price >= orderMinCost && priceObj.price <= orderMaxCost;
      return isOk;
    });

    return result;
  });

  // === Сортировка по totalRating ===
  filteredTutors.sort((a, b) => (b.totalRating || 0) - (a.totalRating || 0));

  return filteredTutors;
};

module.exports = findTutorsForOrdersAllDataTutor;
