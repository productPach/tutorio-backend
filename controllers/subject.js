const { prisma } = require("../prisma/prisma-client");

const SubjectController = {
  // Добавление нового предмета
  createSubject: async (req, res) => {
    try {
      const subjects = Array.isArray(req.body) ? req.body : [req.body];
      const createdSubjects = [];

      for (const subject of subjects) {
        const {
          title,
          for_request,
          for_chpu,
          id_cat,
          general,
          nextPage,
          id_p,
          goalCategoryId,
          // goal_id,
        } = subject;

        // ✅ Проверка обязательных полей
        if (
          !title ||
          !for_request ||
          !for_chpu ||
          !id_cat ||
          general === undefined ||
          !nextPage ||
          !id_p
          //!goalCategoryId
          // !goal_id
        ) {
          return res.status(400).json({
            error:
              "Все поля (title, for_request, for_chpu, id_cat, general, nextPage, id_p, goalCategoryId) являются обязательными",
          });
        }

        // 🔍 Проверка на уникальность title
        const existing = await prisma.subject.findUnique({
          where: { title },
        });

        if (existing) {
          return res.status(400).json({
            error: `Предмет с названием "${title}" уже существует`,
          });
        }

        // ✅ Проверка, что категория целей существует
        const category = await prisma.goalCategory.findUnique({
          where: { id: goalCategoryId },
        });

        if (!category) {
          return res.status(400).json({
            error: `Категория целей с id "${goalCategoryId}" не найдена`,
          });
        }

        // ✅ Создание предмета
        const created = await prisma.subject.create({
          data: {
            title,
            for_request,
            for_chpu,
            id_cat,
            general,
            nextPage,
            id_p,
            //goal_id,
            goalCategoryId,
          },
        });

        createdSubjects.push(created);
      }

      return res.status(201).json(createdSubjects);
    } catch (error) {
      console.error("Ошибка при создании предмета(ов):", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех предметов
  getAllSubjects: async (req, res) => {
    try {
      const subjects = await prisma.subject.findMany();
      res.status(200).json(subjects);
    } catch (error) {
      console.error("Ошибка при получении списка предметов:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех предметов без категории целей
  getAllSubjectsNoGoalsCategory: async (req, res) => {
    try {
      const subjects = await prisma.subject.findMany({
        select: {
          id: true,
          title: true,
          for_request: true,
          for_chpu: true,
          id_cat: true,
          general: true,
          nextPage: true,
          id_p: true,
          goal_id: true,
          // goalCategoryId: false  // исключаем это поле
        },
      });
      res.status(200).json(subjects);
    } catch (error) {
      console.error("Ошибка при получении списка предметов:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение предмета по ID
  getSubjectById: async (req, res) => {
    const { id } = req.params;

    try {
      const subject = await prisma.subject.findUnique({
        where: { id },
      });

      if (!subject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      res.status(200).json(subject);
    } catch (error) {
      console.error("Ошибка при получении предмета по id:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление предмета
  updateSubject: async (req, res) => {
    try {
      const subjects = Array.isArray(req.body) ? req.body : [req.body];

      const updatedSubjects = [];

      for (const subject of subjects) {
        const {
          id, // теперь `id` приходит из тела, не из `req.params`
          title,
          for_request,
          for_chpu,
          id_cat,
          general,
          nextPage,
          id_p,
          //goal_id,
          goalCategoryId,
        } = subject;

        // Проверка обязательных полей
        if (
          !id ||
          !title ||
          !for_request ||
          !for_chpu ||
          !id_cat ||
          general === undefined ||
          !nextPage ||
          !id_p ||
          //!goal_id
          !goalCategoryId
        ) {
          return res.status(400).json({
            error:
              "Все поля (id, title, for_request, for_chpu, id_cat, general, nextPage, id_p, goalCategoryId) являются обязательными",
          });
        }

        // Проверка существования
        const existingSubject = await prisma.subject.findUnique({
          where: { id },
        });

        if (!existingSubject) {
          return res
            .status(404)
            .json({ error: `Предмет с id ${id} не найден` });
        }

        const updated = await prisma.subject.update({
          where: { id },
          data: {
            title,
            for_request,
            for_chpu,
            id_cat,
            general,
            nextPage,
            id_p,
            //goal_id,
            goalCategoryId,
          },
        });

        updatedSubjects.push(updated);
      }

      return res
        .status(200)
        .json(Array.isArray(req.body) ? updatedSubjects : updatedSubjects[0]);
    } catch (error) {
      console.error("Ошибка при обновлении предмета(ов):", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление предмета
  deleteSubject: async (req, res) => {
    const { id } = req.params;

    try {
      // 🔍 Проверка: существует ли такой предмет
      const existingSubject = await prisma.subject.findUnique({
        where: { id },
      });

      if (!existingSubject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      // 🗑 Удаление предмета
      await prisma.subject.delete({
        where: { id },
      });

      res.status(200).json({ message: "Предмет успешно удалён" });
    } catch (error) {
      console.error("Ошибка при удалении предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение целей по предмету
  getGoalsBySubject: async (req, res) => {
    const { subjectId } = req.params;

    try {
      // 1️⃣ Получаем предмет с его категорией целей
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { goalCategoryId: true },
      });

      if (!subject) {
        return res.status(404).json({ error: "Предмет не найден" });
      }

      // 2️⃣ Получаем все связи GoalToCategory для этой категории
      const goalLinks = await prisma.goalToCategory.findMany({
        where: { categoryId: subject.goalCategoryId },
        include: { goal: true },
      });

      // 3️⃣ Формируем массив целей
      const goals = goalLinks.map((link) => link.goal);

      res.status(200).json(goals);
    } catch (error) {
      console.error("Ошибка при получении целей для предмета:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Миграция данных: заполнение goalCategoryId и goal_id в предметах на основе id_cat
  migrateGoalIdsToGoalCategories: async (req, res) => {
    try {
      // === ручное соответствие id_cat → goalCategoryId + goal_id ===
      const mapping = {
        1: {
          goalCategoryId: "68e63dfd2149b86c6923530f",
          goal_id: "3",
          nextPage: "/match/goal/artistic-subjects",
        }, // Искусство artistic-subjects
        2: {
          goalCategoryId: "68e63dfd2149b86c69235311",
          goal_id: "7",
          nextPage: "/match/goal/english",
        }, // Языки основные english
        3: {
          goalCategoryId: "68e63dfd2149b86c69235312",
          goal_id: "6",
          nextPage: "/match/goal/language-subjects",
        }, // Языки дополнительные language-subjects
        4: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        5: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        6: {
          goalCategoryId: "68e63dfd2149b86c6923530f",
          goal_id: "3",
          nextPage: "/match/goal/artistic-subjects",
        }, // Искусство artistic-subjects
        7: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        8: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        9: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        10: {
          goalCategoryId: "68e63dfd2149b86c6923530f",
          goal_id: "3",
          nextPage: "/match/goal/artistic-subjects",
        }, // Искусство artistic-subjects
        11: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        12: {
          goalCategoryId: "68e63dfd2149b86c69235312",
          goal_id: "6",
          nextPage: "/match/goal/language-subjects",
        }, // Языки дополнительные language-subjects
        13: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        14: {
          goalCategoryId: "68e63dfd2149b86c6923531b",
          goal_id: "16",
          nextPage: "/match/goal/spanish",
        }, // Испанский spanish
        15: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        16: {
          goalCategoryId: "68e63dfd2149b86c6923531c",
          goal_id: "17",
          nextPage: "/match/goal/italian",
        }, // Итальянский italian
        17: {
          goalCategoryId: "68e63dfd2149b86c69235313",
          goal_id: "8",
          nextPage: "/match/goal/chinese",
        }, // Китайский chinese
        18: {
          goalCategoryId: "68e63dfd2149b86c6923531d",
          goal_id: "18",
          nextPage: "/match/goal/korean",
        }, // Корейский korean
        19: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        20: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        21: {
          goalCategoryId: "68e63dfd2149b86c6923530e",
          goal_id: "4",
          nextPage: "/match/goal/school-subjects-2",
        }, // Школьные дополнительные school-subjects-2
        //22: { goalCategoryId: "", goal_id: "22" }, // НУЖНА ОТДЕЛЬНАЯ КАТЕГОРИЯ ДЛЯ ЛОГОПЕДОВ!!
        23: {
          goalCategoryId: "68e63dfd2149b86c6923530d",
          goal_id: "2",
          nextPage: "/match/goal/school-subjects-no-ege",
        }, // Школьные без ЕГЭ school-subjects-no-ege
        24: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        25: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        26: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        27: {
          goalCategoryId: "68e63dfd2149b86c6923530f",
          goal_id: "3",
          nextPage: "/match/goal/artistic-subjects",
        }, // Искусство artistic-subjects
        28: {
          goalCategoryId: "68e63dfd2149b86c69235315",
          goal_id: "10",
          nextPage: "/match/goal/school-subjects",
        }, // Начальная школа primary-school-subjects
        29: {
          goalCategoryId: "68e63dfd2149b86c69235314",
          goal_id: "9",
          nextPage: "/match/goal/german",
        }, // Немецкий german
        // 30: { goalCategoryId: "", goal_id: "30" }, // НУЖНА ОТДЕЛЬНАЯ КАТЕГОРИЯ ДЛЯ НЯНИ!!
        31: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        32: {
          goalCategoryId: "68e63dfd2149b86c69235317",
          goal_id: "12",
          nextPage: "/match/goal/preparing-for-school",
        }, // Подготовка к школе preparing-for-school
        33: {
          goalCategoryId: "68e63dfd2149b86c69235312",
          goal_id: "6",
          nextPage: "/match/goal/language-subjects",
        }, // Языки дополнительные language-subjects
        34: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        35: {
          goalCategoryId: "68e63dfd2149b86c69235318",
          goal_id: "13",
          nextPage: "/match/goal/programming",
        }, // Программирование programming
        36: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        37: {
          goalCategoryId: "68e63dfd2149b86c69235319",
          goal_id: "14",
          nextPage: "/match/goal/rki",
        }, // РКИ rki
        38: {
          goalCategoryId: "68e63dfd2149b86c6923530f",
          goal_id: "3",
          nextPage: "/match/goal/artistic-subjects",
        }, // Искусство artistic-subjects
        39: {
          goalCategoryId: "68e63dfd2149b86c6923530e",
          goal_id: "4",
          nextPage: "/match/goal/school-subjects-2",
        }, // Школьные дополнительные school-subjects-2
        40: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        41: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        42: {
          goalCategoryId: "68e63dfd2149b86c6923530e",
          goal_id: "4",
          nextPage: "/match/goal/school-subjects-2",
        }, // Школьные дополнительные school-subjects-2
        43: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        44: {
          goalCategoryId: "68e63dfd2149b86c6923531a",
          goal_id: "15",
          nextPage: "/match/goal/french",
        }, // Французский french
        45: {
          goalCategoryId: "68e63dfd2149b86c6923530c",
          goal_id: "1",
          nextPage: "/match/goal/school-subjects",
        }, // Школьные основные school-subjects
        46: {
          goalCategoryId: "68e63dfd2149b86c69235312",
          goal_id: "6",
          nextPage: "/match/goal/language-subjects",
        }, // Языки дополнительные language-subjects
        47: {
          goalCategoryId: "68e63dfd2149b86c6923530e",
          goal_id: "4",
          nextPage: "/match/goal/school-subjects-2",
        }, // Школьные дополнительные school-subjects-2
        // 48: { goalCategoryId: "", goal_id: "48" }, // НУЖНА ОТДЕЛЬНАЯ КАТЕГОРИЯ ДЛЯ ШАХМАТЫ!!
        49: {
          goalCategoryId: "68e63dfd2149b86c6923530d",
          goal_id: "2",
          nextPage: "/match/goal/school-subjects-no-ege",
        }, // Школьные без ЕГЭ school-subjects-no-ege
        50: {
          goalCategoryId: "68e63dfd2149b86c69235310",
          goal_id: "5",
          nextPage: "/match/goal/special-subjects",
        }, // Специальные special-subjects
        51: {
          goalCategoryId: "68e63dfd2149b86c6923531e",
          goal_id: "19",
          nextPage: "/match/goal/japanese",
        }, // Японский язык japanese
      };

      const subjects = await prisma.subject.findMany();

      console.log(`Найдено ${subjects.length} предметов для обновления`);

      let updatedCount = 0;
      const unknownCats = new Set();

      for (const subject of subjects) {
        if (!subject.id_cat) continue;

        const mappingData = mapping[subject.id_cat];

        if (!mappingData) {
          unknownCats.add(subject.id_cat);
          continue;
        }

        await prisma.subject.update({
          where: { id: subject.id },
          data: {
            goalCategoryId: mappingData.goalCategoryId,
            goal_id: mappingData.goal_id,
            nextPage: mappingData.nextPage,
          },
        });

        updatedCount++;
      }

      res.json({
        message: `Обновление завершено.`,
        updated: updatedCount,
        skipped: Array.from(unknownCats),
      });
    } catch (error) {
      console.error("Ошибка при обновлении goalCategoryId и goal_id:", error);
      res.status(500).json({ error: "Ошибка при миграции данных" });
    }
  },
};

module.exports = SubjectController;
