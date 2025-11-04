const { prisma } = require("../prisma/prisma-client");

const LandingController = {
  // Получение предметов, по которым есть хотя бы один активный репетитор
  getSubjectWithTutor: async (req, res) => {
    try {
      const subjects = await prisma.subject.findMany({
        where: {
          tutors: {
            some: {
              status: "Active",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          for_chpu: true,
          tutors: {
            where: { status: "Active" },
            select: { id: true },
          },
        },
      });

      // Оставляем только те предметы, у которых реально есть репетиторы
      const filteredSubjects = subjects.filter((s) => s.tutors.length > 0);

      res.json(filteredSubjects);
    } catch (e) {
      console.error("getSubjectWithTutor error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение категорий, по которым есть хотя бы один активный репетитор
  getCategoryWithTutor: async (req, res) => {
    const { for_chpu } = req.params;

    if (!for_chpu) {
      return res.status(400).json({ error: "Не передан slug предмета" });
    }

    try {
      const subject = await prisma.subject.findUnique({
        where: { for_chpu },
        include: { goalCategory: true },
      });

      if (!subject) return res.status(404).json({ error: "Предмет не найден" });

      // Репетиторы по предмету
      const tutors = await prisma.tutor.findMany({
        where: {
          isPublicProfile: true,
          subject: { has: subject.id_p },
        },
        select: {
          tutorPlace: true,
          tutorTripCity: true,
          tutorTripArea: true,
        },
      });

      const availablePlaces = [...new Set(tutors.flatMap((t) => t.tutorPlace))];
      const cityIds = [...new Set(tutors.flatMap((t) => t.tutorTripCity))];
      const areaIds = [...new Set(tutors.flatMap((t) => t.tutorTripArea))];

      // Цели
      const goals = await prisma.goal.findMany({
        where: {
          goalCategories: { some: { categoryId: subject.goalCategoryId } },
          tutorGoals: {
            some: {
              subjectId: subject.id_p,
              tutor: { isPublicProfile: true },
            },
          },
        },
      });

      // Метро и районы
      const metros = await prisma.metro.findMany({
        where: { id: { in: cityIds } },
      });
      const districts = await prisma.district.findMany({
        where: { id: { in: cityIds } },
      });

      // Города области
      const regionalCities = await prisma.regionalCity.findMany({
        where: { id: { in: areaIds } },
      });

      res.json({
        subject,
        availablePlaces,
        goals,
        metros,
        districts,
        regionalCities,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка при формировании карты предмета" });
    }
  },

  // // // === Получение репетиторов с фильтрацией по региону и предмету ===
  // getTutorsByFilters: async (req, res) => {
  //   try {
  //     const { citySlug, subjectSlug, page = 1, limit = 10 } = req.query;

  //     // 1️⃣ Получаем город по slug (или Москва по умолчанию)
  //     let cityTitle = "Москва";
  //     let cityData = null;
  //     if (citySlug) {
  //       cityData = await prisma.city.findUnique({
  //         where: { slug: citySlug },
  //         select: { title: true, region_name_dative: true, slug: true },
  //       });
  //       if (cityData) cityTitle = cityData.title;
  //     }

  //     // 2️⃣ Получаем subject (если есть)
  //     let subjectData = null;
  //     if (subjectSlug) {
  //       subjectData = await prisma.subject.findUnique({
  //         where: { for_chpu: subjectSlug },
  //         select: {
  //           id_p: true,
  //           title: true,
  //           for_request: true,
  //           nextPage: true,
  //         },
  //       });
  //       if (!subjectData) {
  //         return res.status(404).json({ error: "Предмет не найден" });
  //       }
  //     }

  //     // 3️⃣ Сборка MongoDB pipeline для aggregateRaw
  //     const pipeline = [
  //       {
  //         $match: {
  //           status: "Active",
  //           isPublicProfile: true,
  //           $or: [
  //             { region: cityTitle }, // региональные
  //             { tutorPlace: "1" }, // онлайн
  //           ],
  //           ...(subjectData ? { subject: { $in: [subjectData.id_p] } } : {}),
  //         },
  //       },
  //       {
  //         // Флаг, репетитор из региона
  //         $addFields: {
  //           isInRegion: { $cond: [{ $eq: ["$region", cityTitle] }, 1, 0] },
  //         },
  //       },
  //       {
  //         // Сортировка: сначала региональные, потом онлайн, потом рейтинг
  //         $sort: { isInRegion: -1, totalRating: -1 },
  //       },
  //       { $skip: (Number(page) - 1) * Number(limit) },
  //       { $limit: Number(limit) },
  //       {
  //         $project: {
  //           id: 1,
  //           name: 1,
  //           avatarUrl: 1,
  //           totalRating: 1,
  //           subject: 1,
  //           region: 1,
  //           tutorPlace: 1,
  //         },
  //       },
  //     ];

  //     const tutors = await prisma.tutor.aggregateRaw({ pipeline });

  //     // 4️⃣ Подсчёт общего числа (для пагинации)
  //     const countPipeline = [
  //       {
  //         $match: {
  //           status: "Active",
  //           isPublicProfile: true,
  //           $or: [{ region: cityTitle }, { tutorPlace: "1" }],
  //           ...(subjectData ? { subject: { $in: [subjectData.id_p] } } : {}),
  //         },
  //       },
  //       { $count: "total" },
  //     ];

  //     const totalResult = await prisma.tutor.aggregateRaw({
  //       pipeline: countPipeline,
  //     });
  //     const total = totalResult[0]?.total || 0;

  //     return res.json({
  //       city: cityData,
  //       subject: subjectData,
  //       pagination: {
  //         total,
  //         page: Number(page),
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //       tutors,
  //     });
  //   } catch (e) {
  //     console.error("getTutorsByFilters error:", e);
  //     res.status(500).json({ error: "Ошибка сервера" });
  //   }
  // },

  // === Получение репетиторов с фильтрацией по региону, предмету и цели ===
  // getTutorsByFilters: async (req, res) => {
  //   try {
  //     const {
  //       citySlug,
  //       subjectSlug,
  //       goalSlug,
  //       page = 1,
  //       limit = 10,
  //     } = req.query;

  //     console.log("=== START getTutorsByFilters ===");
  //     console.log("Query params:", {
  //       citySlug,
  //       subjectSlug,
  //       goalSlug,
  //       page,
  //       limit,
  //     });

  //     // 1️⃣ Получаем город
  //     let cityTitle = "Москва";
  //     let cityData = null;
  //     if (citySlug) {
  //       cityData = await prisma.city.findUnique({
  //         where: { slug: citySlug },
  //         select: { title: true, region_name_dative: true, slug: true },
  //       });
  //       console.log("City data:", cityData);
  //       if (cityData) cityTitle = cityData.title;
  //     }
  //     console.log("Final cityTitle:", cityTitle);

  //     // 2️⃣ Получаем subject
  //     let subjectData = null;
  //     if (subjectSlug) {
  //       subjectData = await prisma.subject.findUnique({
  //         where: { for_chpu: subjectSlug },
  //         select: {
  //           id_p: true,
  //           title: true,
  //           for_request: true,
  //           nextPage: true,
  //         },
  //       });
  //       console.log("Subject data:", subjectData);
  //       if (!subjectData) {
  //         console.log("Subject not found");
  //         return res.status(404).json({ error: "Предмет не найден" });
  //       }
  //     }

  //     // 3️⃣ Получаем goal
  //     let goalData = null;
  //     if (goalSlug) {
  //       goalData = await prisma.goal.findUnique({
  //         where: { goalSlug: goalSlug },
  //         select: { id: true, title: true, goalSlug: true },
  //       });
  //       console.log("Goal data:", goalData);
  //       if (!goalData) {
  //         console.log("Goal not found");
  //         return res.status(404).json({ error: "Цель не найдена" });
  //       }
  //     }

  //     // 4️⃣ Если есть цель - сначала получаем ID репетиторов
  //     let tutorIdsByGoal = null;
  //     if (goalData) {
  //       console.log("Looking for TutorGoals with goalId:", goalData.id);

  //       const tutorGoals = await prisma.tutorGoal.findMany({
  //         where: {
  //           goalId: goalData.id,
  //           ...(subjectData ? { subjectId: subjectData.id_p } : {}),
  //         },
  //         select: { tutorId: true },
  //       });

  //       console.log("TutorGoals found:", tutorGoals.length);
  //       console.log("Raw TutorGoals:", JSON.stringify(tutorGoals, null, 2));

  //       tutorIdsByGoal = tutorGoals.map((tg) => tg.tutorId);

  //       console.log("tutorIdsByGoal:", tutorIdsByGoal);

  //       // Если нет репетиторов с такой целью - сразу возвращаем пустой результат
  //       if (tutorIdsByGoal.length === 0) {
  //         console.log("No tutors found for this goal, returning empty result");
  //         return res.json({
  //           city: cityData,
  //           subject: subjectData,
  //           goal: goalData,
  //           pagination: { total: 0, page: Number(page), pages: 0 },
  //           tutors: [],
  //         });
  //       }
  //     }

  //     // 5️⃣ Формируем базовый $match для Tutor
  //     const baseMatch = {
  //       status: "Active",
  //       isPublicProfile: true,
  //       $or: [
  //         { region: cityTitle },
  //         { tutorPlace: "1" }, // онлайн
  //       ],
  //     };

  //     console.log("Base match before subject filter:", baseMatch);

  //     // Всегда фильтруем по предмету если он есть
  //     if (subjectData) {
  //       baseMatch.subject = { $in: [subjectData.id_p] };
  //       console.log("Added subject filter:", baseMatch.subject);
  //     }

  //     // Если есть цель - фильтруем по ID репетиторов
  //     if (tutorIdsByGoal) {
  //       console.log("Attempting to filter by tutor IDs:", tutorIdsByGoal);

  //       // Конвертируем строки в ObjectId для MongoDB
  //       const tutorIdsByGoalObjectId = tutorIdsByGoal.map((id) => ({
  //         $oid: id,
  //       }));
  //       console.log("tutorIdsByGoalObjectId:", tutorIdsByGoalObjectId);

  //       baseMatch._id = { $in: tutorIdsByGoalObjectId };
  //       console.log("Added _id filter (ObjectId):", baseMatch._id);
  //     }

  //     console.log("Final baseMatch:", JSON.stringify(baseMatch, null, 2));

  //     const pipeline = [
  //       { $match: baseMatch },
  //       {
  //         $addFields: {
  //           isInRegion: { $cond: [{ $eq: ["$region", cityTitle] }, 1, 0] },
  //         },
  //       },
  //       { $sort: { isInRegion: -1, totalRating: -1 } },
  //       { $skip: (Number(page) - 1) * Number(limit) },
  //       { $limit: Number(limit) },
  //       {
  //         $project: {
  //           _id: 1,
  //           id: { $toString: "$_id" }, // Конвертируем ObjectId обратно в строку
  //           name: 1,
  //           avatarUrl: 1,
  //           totalRating: 1,
  //           subject: 1,
  //           region: 1,
  //           tutorPlace: 1,
  //         },
  //       },
  //     ];

  //     console.log("Final pipeline:", JSON.stringify(pipeline, null, 2));

  //     // Запрос к Mongo
  //     console.log("Executing aggregateRaw...");
  //     const tutors = await prisma.tutor.aggregateRaw({ pipeline });
  //     console.log("Tutors found:", tutors.length);

  //     if (tutors.length > 0) {
  //       console.log("First tutor:", JSON.stringify(tutors[0], null, 2));
  //     }

  //     // Подсчёт общего числа для пагинации
  //     const countPipeline = [{ $match: baseMatch }, { $count: "total" }];

  //     console.log("Count pipeline:", JSON.stringify(countPipeline, null, 2));

  //     const totalResult = await prisma.tutor.aggregateRaw({
  //       pipeline: countPipeline,
  //     });
  //     console.log("Total result:", totalResult);

  //     const total = totalResult[0]?.total || 0;
  //     console.log("Final total:", total);

  //     console.log("=== END getTutorsByFilters ===");

  //     return res.json({
  //       city: cityData,
  //       subject: subjectData,
  //       goal: goalData,
  //       pagination: {
  //         total,
  //         page: Number(page),
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //       tutors,
  //     });
  //   } catch (e) {
  //     console.error("getTutorsByFilters error:", e);
  //     console.error("Error stack:", e.stack);
  //     res.status(500).json({ error: "Ошибка сервера" });
  //   }
  // },

  // === Получение репетиторов с фильтрацией по региону, предмету, цели и месту ===
  getTutorsByFilters: async (req, res) => {
    try {
      const {
        citySlug,
        subjectSlug,
        goalSlug,
        placeSlug, // ← добавляем новый параметр
        page = 1,
        limit = 10,
      } = req.query;

      console.log("=== START getTutorsByFilters ===");
      console.log("Query params:", {
        citySlug,
        subjectSlug,
        goalSlug,
        placeSlug,
        page,
        limit,
      });

      // 1️⃣ Получаем город
      let cityTitle = "Москва";
      let cityData = null;
      if (citySlug) {
        cityData = await prisma.city.findUnique({
          where: { slug: citySlug },
          select: { title: true, region_name_dative: true, slug: true },
        });
        console.log("City data:", cityData);
        if (cityData) cityTitle = cityData.title;
      }
      console.log("Final cityTitle:", cityTitle);

      // 2️⃣ Получаем subject
      let subjectData = null;
      if (subjectSlug) {
        subjectData = await prisma.subject.findUnique({
          where: { for_chpu: subjectSlug },
          select: {
            id_p: true,
            title: true,
            for_request: true,
            nextPage: true,
          },
        });
        console.log("Subject data:", subjectData);
        if (!subjectData) {
          console.log("Subject not found");
          return res.status(404).json({ error: "Предмет не найден" });
        }
      }

      // 3️⃣ Получаем goal
      let goalData = null;
      if (goalSlug) {
        goalData = await prisma.goal.findUnique({
          where: { goalSlug: goalSlug },
          select: { id: true, title: true, for_request: true, goalSlug: true },
        });
        console.log("Goal data:", goalData);
        if (!goalData) {
          console.log("Goal not found");
          return res.status(404).json({ error: "Цель не найдена" });
        }
      }

      // 4️⃣ Маппинг placeSlug → tutorPlace value
      let placeValue = null;
      let placeTitle = "";
      if (placeSlug) {
        const placeMap = {
          online: { value: "1", title: "онлайн" },
          "u-repetitora": { value: "2", title: "у репетитора" },
          "na-domu": { value: "3", title: "на дому" },
        };

        if (placeMap[placeSlug]) {
          placeValue = placeMap[placeSlug].value;
          placeTitle = placeMap[placeSlug].title;
          console.log(
            `Place mapping: ${placeSlug} → ${placeValue} (${placeTitle})`
          );
        } else {
          console.log("Invalid placeSlug:", placeSlug);
          return res.status(404).json({ error: "Место занятий не найдено" });
        }
      }

      // 5️⃣ Если есть цель - сначала получаем ID репетиторов
      let tutorIdsByGoal = null;
      if (goalData) {
        console.log("Looking for TutorGoals with goalId:", goalData.id);

        const tutorGoals = await prisma.tutorGoal.findMany({
          where: {
            goalId: goalData.id,
            ...(subjectData ? { subjectId: subjectData.id_p } : {}),
          },
          select: { tutorId: true },
        });

        console.log("TutorGoals found:", tutorGoals.length);
        tutorIdsByGoal = tutorGoals.map((tg) => tg.tutorId);
        console.log("tutorIdsByGoal:", tutorIdsByGoal);

        if (tutorIdsByGoal.length === 0) {
          console.log("No tutors found for this goal, returning empty result");
          return res.json({
            city: cityData,
            subject: subjectData,
            goal: goalData,
            place: placeSlug ? { slug: placeSlug, title: placeTitle } : null,
            pagination: { total: 0, page: Number(page), pages: 0 },
            tutors: [],
          });
        }
      }

      // 6️⃣ Формируем базовый $match для Tutor
      const baseMatch = {
        status: "Active",
        isPublicProfile: true,
      };

      // Логика фильтрации по месту и региону
      if (placeValue) {
        if (placeValue === "1") {
          // online: регион ИЛИ онлайн из других регионов
          baseMatch.$or = [
            {
              $and: [
                { region: cityTitle },
                { tutorPlace: { $in: [placeValue] } },
              ],
            },
            {
              $and: [
                { region: { $ne: cityTitle } },
                { tutorPlace: { $in: [placeValue] } },
              ],
            },
          ];
        } else {
          // u-repetitora / na-domu: только региональные с этим местом
          baseMatch.region = cityTitle;
          baseMatch.tutorPlace = { $in: [placeValue] };
        }
      } else {
        // Без места: текущая логика (регион ИЛИ онлайн)
        baseMatch.$or = [{ region: cityTitle }, { tutorPlace: "1" }];
      }

      console.log("Base match before subject filter:", baseMatch);

      // Всегда фильтруем по предмету если он есть
      if (subjectData) {
        baseMatch.subject = { $in: [subjectData.id_p] };
        console.log("Added subject filter:", baseMatch.subject);
      }

      // Если есть цель - фильтруем по ID репетиторов
      if (tutorIdsByGoal) {
        console.log("Attempting to filter by tutor IDs:", tutorIdsByGoal);
        const tutorIdsByGoalObjectId = tutorIdsByGoal.map((id) => ({
          $oid: id,
        }));
        baseMatch._id = { $in: tutorIdsByGoalObjectId };
        console.log("Added _id filter (ObjectId):", baseMatch._id);
      }

      console.log("Final baseMatch:", JSON.stringify(baseMatch, null, 2));

      const pipeline = [
        { $match: baseMatch },
        {
          $addFields: {
            isInRegion: { $cond: [{ $eq: ["$region", cityTitle] }, 1, 0] },
          },
        },
        { $sort: { isInRegion: -1, totalRating: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
        {
          $project: {
            _id: 1,
            id: { $toString: "$_id" },
            name: 1,
            avatarUrl: 1,
            totalRating: 1,
            subject: 1,
            region: 1,
            tutorPlace: 1,
          },
        },
      ];

      console.log("Final pipeline:", JSON.stringify(pipeline, null, 2));

      // Запрос к Mongo
      console.log("Executing aggregateRaw...");
      const tutors = await prisma.tutor.aggregateRaw({ pipeline });
      console.log("Tutors found:", tutors.length);

      // Подсчёт общего числа для пагинации
      const countPipeline = [{ $match: baseMatch }, { $count: "total" }];
      const totalResult = await prisma.tutor.aggregateRaw({
        pipeline: countPipeline,
      });
      const total = totalResult[0]?.total || 0;
      console.log("Final total:", total);

      console.log("=== END getTutorsByFilters ===");

      return res.json({
        city: cityData,
        subject: subjectData,
        goal: goalData,
        place: placeSlug ? { slug: placeSlug, title: placeTitle } : null,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
        tutors,
      });
    } catch (e) {
      console.error("getTutorsByFilters error:", e);
      console.error("Error stack:", e.stack);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = LandingController;
