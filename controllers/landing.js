const { prisma } = require("../prisma/prisma-client");

const LandingController = {
  // Получение предметов, по которым есть хотя бы один активный репетитор
  // getSubjectWithTutor: async (req, res) => {
  //   try {
  //     const subjects = await prisma.subject.findMany({
  //       where: {
  //         tutors: {
  //           some: {
  //             status: "Active",
  //           },
  //         },
  //       },
  //       orderBy: {
  //         name: "asc",
  //       },
  //       select: {
  //         id: true,
  //         name: true,
  //         for_chpu: true,
  //         tutors: {
  //           where: { status: "Active" },
  //           select: { id: true },
  //         },
  //       },
  //     });

  //     // Оставляем только те предметы, у которых реально есть репетиторы
  //     const filteredSubjects = subjects.filter((s) => s.tutors.length > 0);

  //     res.json(filteredSubjects);
  //   } catch (e) {
  //     console.error("getSubjectWithTutor error:", e);
  //     res.status(500).json({ error: "Ошибка сервера" });
  //   }
  // },
  // GET /api/landing/subjects?region=msk
  getSubjectWithTutor: async (req, res) => {
    try {
      const regionFilter = req.query.region; // регион передаём через query

      // 1️⃣ Получаем дистанционных репетиторов (Tutor - tutorPlace.includes("1"))
      const remoteTutors = await prisma.tutor.findMany({
        where: {
          status: "Active",
          isPublicProfile: true,
          tutorPlace: { has: "1" }, // дистанционно
        },
        select: { subject: true }, // legacy id_p
      });

      const remoteSubjects = new Set(
        remoteTutors.flatMap((t) => t.subject).filter(Boolean)
      );

      // 2️⃣ Получаем региональных репетиторов (не дистанционно)
      let regionalSubjects = new Set();
      if (regionFilter) {
        const regionalTutors = await prisma.tutor.findMany({
          where: {
            status: "Active",
            isPublicProfile: true,
            region: regionFilter,
            NOT: { tutorPlace: { has: "1" } }, // исключаем дистанционно
          },
          select: { subject: true },
        });

        regionalSubjects = new Set(
          regionalTutors.flatMap((t) => t.subject).filter(Boolean)
        );
      }

      // 3️⃣ Объединяем уникальные id_p
      const legacyIds = Array.from(
        new Set([...remoteSubjects, ...regionalSubjects])
      );

      if (legacyIds.length === 0) {
        return res.json([]);
      }

      // 4️⃣ Ищем предметы по id_p
      const subjects = await prisma.subject.findMany({
        where: { id_p: { in: legacyIds } },
        orderBy: { title: "asc" },
        select: {
          id: true,
          id_p: true,
          title: true,
          for_chpu: true,
        },
      });

      res.json(subjects);
    } catch (e) {
      console.error("getSubjectWithTutor error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение целей, по которым есть хотя бы один активный репетитор
  getGoalsWithTutors: async (req, res) => {
    try {
      const regionSlug = req.query.region;
      const subjectSlug = req.query.subjectSlug;

      if (!subjectSlug)
        return res.status(400).json({ error: "Нет subjectSlug" });

      // 1️⃣ Находим регион
      let cityTitle = null;
      if (regionSlug) {
        const city = await prisma.city.findUnique({
          where: { slug: regionSlug },
          select: { title: true },
        });
        if (!city) return res.status(404).json({ error: "Регион не найден" });
        cityTitle = city.title;
      }

      // 2️⃣ Находим предмет
      const subject = await prisma.subject.findUnique({
        where: { for_chpu: subjectSlug },
        select: { id: true, id_p: true, goalCategoryId: true },
      });
      if (!subject) return res.status(404).json({ error: "Предмет не найден" });

      // 3️⃣ Получаем цели из категории предмета
      let goals = [];
      if (subject.goalCategoryId) {
        const category = await prisma.goalCategory.findUnique({
          where: { id: subject.goalCategoryId },
          select: {
            goalCategories: {
              select: {
                goal: { select: { id: true, title: true, goalSlug: true } },
              },
            },
          },
        });

        if (category) {
          goals = category.goalCategories.map((gc) => gc.goal);
        }
      }

      if (goals.length === 0) return res.json([]);

      // 4️⃣ Находим активных репетиторов по предмету c их целями по этому предмету
      const tutors = await prisma.tutor.findMany({
        where: {
          status: "Active",
          isPublicProfile: true,
          subject: { has: subject.id_p },
        },
        select: {
          tutorPlace: true,
          region: true,
          tutorGoals: {
            where: { subjectId: subject.id_p }, // ВАЖНО: цели только по этому предмету
            select: { goalId: true },
          },
        },
      });

      // 5️⃣ Фильтруем цели — оставляем те, где есть хоть один репетитор
      const validGoalIds = new Set();

      for (const goal of goals) {
        const hasTutor = tutors.some((t) => {
          const teachesGoal = t.tutorGoals.some((tg) => tg.goalId === goal.id);

          if (!teachesGoal) return false;

          // дистанционно
          if (t.tutorPlace.includes("1")) return true;

          // по региону
          if (cityTitle && t.region === cityTitle) return true;

          return false;
        });

        if (hasTutor) validGoalIds.add(goal.id);
      }

      const result = goals.filter((g) => validGoalIds.has(g.id));
      res.json(result);
    } catch (e) {
      console.error("getGoalsWithTutors error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Проверка наличия репетиторов по формату занятий
  getSubjectFormatsAvailability: async (req, res) => {
    try {
      const regionSlug = req.query.region;
      const subjectSlug = req.query.subjectSlug;

      if (!subjectSlug)
        return res.status(400).json({ error: "Нет subjectSlug" });

      // 1️⃣ Находим регион
      let cityTitle = null;
      if (regionSlug) {
        const city = await prisma.city.findUnique({
          where: { slug: regionSlug },
          select: { title: true },
        });
        if (!city) return res.status(404).json({ error: "Регион не найден" });
        cityTitle = city.title;
      }

      // 2️⃣ Находим предмет
      const subject = await prisma.subject.findUnique({
        where: { for_chpu: subjectSlug },
        select: { id: true, id_p: true },
      });
      if (!subject) return res.status(404).json({ error: "Предмет не найден" });

      // ---------------------------
      // 3️⃣ Три быстрых COUNT запроса
      // ---------------------------

      // 🟦 Дистанционно — регион не нужен
      const remoteCount = await prisma.tutor.count({
        where: {
          status: "Active",
          isPublicProfile: true,
          subject: { has: subject.id_p },
          tutorPlace: { has: "1" },
        },
      });

      // 🟩 У репетитора — регион обязателен
      let atTutorCount = 0;
      let atStudentCount = 0;

      if (cityTitle) {
        // У репетитора
        atTutorCount = await prisma.tutor.count({
          where: {
            status: "Active",
            isPublicProfile: true,
            subject: { has: subject.id_p },
            region: cityTitle,
            tutorPlace: { has: "2" },
          },
        });

        // Выезд к ученику
        atStudentCount = await prisma.tutor.count({
          where: {
            status: "Active",
            isPublicProfile: true,
            subject: { has: subject.id_p },
            region: cityTitle,
            tutorPlace: { has: "3" },
          },
        });
      }

      // ---------------------------

      res.json({
        remote: remoteCount > 0,
        atTutor: atTutorCount > 0,
        atStudent: atStudentCount > 0,
      });
    } catch (e) {
      console.error("getSubjectFormatsAvailability error:", e);
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

      // console.log("=== START getTutorsByFilters ===");
      // console.log("Query params:", {
      //   citySlug,
      //   subjectSlug,
      //   goalSlug,
      //   placeSlug,
      //   page,
      //   limit,
      // });

      // 1️⃣ Получаем город
      let cityTitle = "Москва";
      let cityData = null;
      if (citySlug) {
        cityData = await prisma.city.findUnique({
          where: { slug: citySlug },
          select: { title: true, region_name_dative: true, slug: true },
        });
        // console.log("City data:", cityData);
        if (cityData) cityTitle = cityData.title;
      }
      // console.log("Final cityTitle:", cityTitle);

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
        // console.log("Subject data:", subjectData);
        if (!subjectData) {
          // console.log("Subject not found");
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
        // console.log("Goal data:", goalData);
        if (!goalData) {
          // console.log("Goal not found");
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
          // console.log(
          //   `Place mapping: ${placeSlug} → ${placeValue} (${placeTitle})`
          // );
        } else {
          // console.log("Invalid placeSlug:", placeSlug);
          return res.status(404).json({ error: "Место занятий не найдено" });
        }
      }

      // 5️⃣ Если есть цель - сначала получаем ID репетиторов
      let tutorIdsByGoal = null;
      if (goalData) {
        // console.log("Looking for TutorGoals with goalId:", goalData.id);

        const tutorGoals = await prisma.tutorGoal.findMany({
          where: {
            goalId: goalData.id,
            ...(subjectData ? { subjectId: subjectData.id_p } : {}),
          },
          select: { tutorId: true },
        });

        // console.log("TutorGoals found:", tutorGoals.length);
        tutorIdsByGoal = tutorGoals.map((tg) => tg.tutorId);
        // console.log("tutorIdsByGoal:", tutorIdsByGoal);

        if (tutorIdsByGoal.length === 0) {
          // console.log("No tutors found for this goal, returning empty result");
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

      // console.log("Base match before subject filter:", baseMatch);

      // Всегда фильтруем по предмету если он есть
      if (subjectData) {
        baseMatch.subject = { $in: [subjectData.id_p] };
        // console.log("Added subject filter:", baseMatch.subject);
      }

      // Если есть цель - фильтруем по ID репетиторов
      if (tutorIdsByGoal) {
        // console.log("Attempting to filter by tutor IDs:", tutorIdsByGoal);
        const tutorIdsByGoalObjectId = tutorIdsByGoal.map((id) => ({
          $oid: id,
        }));
        baseMatch._id = { $in: tutorIdsByGoalObjectId };
        // console.log("Added _id filter (ObjectId):", baseMatch._id);
      }

      // console.log("Final baseMatch:", JSON.stringify(baseMatch, null, 2));

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
        // Добавляем lookup для educations
        {
          $lookup: {
            from: "TutorEducation", // Проверьте точное название коллекции в MongoDB
            localField: "_id",
            foreignField: "tutorId",
            as: "educations",
          },
        },
        // Добавляем lookup для subjectPrices
        {
          $lookup: {
            from: "TutorSubjectPrice", // Проверьте точное название коллекции
            localField: "_id",
            foreignField: "tutorId",
            as: "subjectPrices",
          },
        },
        // Добавляем lookup для reviews (только активные)
        {
          $lookup: {
            from: "Review", // Проверьте точное название коллекции
            let: { tutorId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$tutorId", "$$tutorId"] },
                  status: "Active",
                },
              },
            ],
            as: "reviews",
          },
        },
        {
          $project: {
            _id: 1,
            id: { $toString: "$_id" },
            name: 1,
            avatarUrl: 1,
            totalRating: 1,
            subject: 1,
            subjectComments: 1,
            region: 1,
            tutorPlace: 1,
            tutorHomeLoc: 1,
            tutorTrip: 1,
            tutorTripCityData: 1,
            tutorTripCity: 1,
            tutorTripArea: 1,
            profileInfo: 1,
            experience: 1,
            educations: 1,
            documents: 1,
            isGroup: 1,
            subjectPrices: 1,
            lastOnline: 1,
            badges: 1,
            userRating: 1,
            reviews: 1,
          },
        },
      ];

      // console.log("Final pipeline:", JSON.stringify(pipeline, null, 2));

      // Запрос к Mongo
      // console.log("Executing aggregateRaw...");
      const tutors = await prisma.tutor.aggregateRaw({ pipeline });
      // console.log("Tutors found:", tutors.length);

      // Подсчёт общего числа для пагинации
      const countPipeline = [{ $match: baseMatch }, { $count: "total" }];
      const totalResult = await prisma.tutor.aggregateRaw({
        pipeline: countPipeline,
      });
      const total = totalResult[0]?.total || 0;
      // console.log("Final total:", total);

      // console.log("=== END getTutorsByFilters ===");

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
