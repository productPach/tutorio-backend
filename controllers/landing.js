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
};

module.exports = LandingController;
