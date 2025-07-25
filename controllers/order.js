const { prisma } = require("../prisma/prisma-client");

const OrderController = {
  // Создание заказа
  createOrder: async (req, res) => {
    const {
      subject,
      goal,
      studentType,
      studentYears,
      studentClass,
      studentCourse,
      studentUniversity,
      studentExam,
      studyMethod,
      studyProgramm,
      deadline,
      studentLevel,
      tutorGender,
      studentSchedule,
      studentPlace,
      region,
      studentAdress,
      studentHomeLoc,
      studentTrip,
      tutorType,
      autoContactsOnResponse,
      studentWishes,
      responseCost,
      status,
    } = req.body;

    const userId = req.user.userID;
    const student = await prisma.student.findFirst({
      where: { userId },
    });

    const studentId = student ? student.id : null;

    if (!studentId || !subject || !region || !status) {
      return res
        .status(400)
        .json({ error: "Не заполнены все обязательные поля" });
    }

    try {
      const order = await prisma.order.create({
        data: {
          studentId,
          subject,
          goal: goal || undefined,
          studentType: studentType || undefined,
          studentYears: studentYears || undefined,
          studentClass: studentClass || undefined,
          studentCourse: studentCourse || undefined,
          studentUniversity: studentUniversity || undefined,
          studentExam: studentExam || undefined,
          studyMethod: studyMethod || undefined,
          studyProgramm: studyProgramm || undefined,
          deadline: deadline || undefined,
          studentLevel: studentLevel || undefined,
          tutorGender: tutorGender || undefined,
          studentSchedule: studentSchedule || undefined,
          studentPlace: studentPlace || undefined,
          region,
          studentAdress: studentAdress || undefined,
          studentHomeLoc: studentHomeLoc || undefined,
          studentTrip: studentTrip || undefined,
          tutorType: tutorType || undefined,
          autoContactsOnResponse: autoContactsOnResponse || false,
          studentWishes: studentWishes || undefined,
          responseCost: responseCost || undefined,
          status: status,
        },
      });

      res.json(order);
    } catch (error) {
      console.error("Create Order Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение всех заказов (SECURE) !!! ЗАКРЫТЬ ПОСЛЕ СОЗДАНИЯ ПЕРСОНАЛЬНОГО МЕтОДА
  // getAllOrders: async (req, res) => {
  //   try {
  //     const allOrders = await prisma.order.findMany({
  //       // include: {
  //       //   student: {
  //       //     include: { user: true },
  //       //   },
  //       //   chats: {
  //       //     include: { tutor: true },
  //       //   },
  //       // },
  //       orderBy: {
  //         createdAt: "desc",
  //       },
  //     });

  //     if (!allOrders) {
  //       return res.status(404).json({ error: "Не найдено ни одного заказа" });
  //     }

  //     res.json(allOrders);
  //   } catch (error) {
  //     console.error("Get All Orders Error", error);
  //     res.status(500).json({ error: "Internal server error" });
  //   }
  // },

  // СДЕЛАТЬ МЕТОД, КОТОРЫЙ ОТДАЕТ ТОЛЬКО ТЕ ЗАКАЗЫ, ПРЕДМЕТ КОТОРОГО СОВПАДАЕТ С ПРЕДМЕТАМИ РЕПЕТИТОРА
  getAllOrders: async (req, res) => {
    try {
      // 1. Получаем userID из JWT (например, из middleware)
      const userId = req.user.userID;

      // 2. Ищем соответствующего тутора по userId
      const tutor = await prisma.tutor.findUnique({
        where: { userId }, // userId — из токена
        select: { id: true, subject: true }, // только нужные поля
      });

      if (!tutor) {
        return res.status(404).json({ error: "Репетитор не найден" });
      }

      // 3. Фильтруем заказы, у которых предмет входит в массив предметов репетитора
      const matchingOrders = await prisma.order.findMany({
        where: {
          status: "Active",
          subject: {
            in: tutor.subject,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(matchingOrders);
    } catch (error) {
      console.error("Get All Orders Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение всех заказов (публично, без авторизации!) (SECURE)
  getAllOrdersPublic: async (req, res) => {
    try {
      const allOrders = await prisma.order.findMany({
        include: {
          student: {
            select: {
              name: true, // или другое безопасное поле
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!allOrders || allOrders.length === 0) {
        return res.status(404).json({ error: "Не найдено ни одного заказа" });
      }

      res.json(allOrders);
    } catch (error) {
      console.error("Get All Orders Public Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение заказа по studentId (SECURE)
  getOrdersByStudentId: async (req, res) => {
    const { studentId } = req.params; // Используем studentId из параметров маршрута
    try {
      const orders = await prisma.order.findMany({
        where: { studentId }, // Ищем по studentId
        include: {
          student: true, // Включаем информацию о студенте
          chats: {
            // include: { tutor: true },
            include: {
              tutor: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  lastOnline: true,
                },
              },
            },
          },
          contracts: {
            where: {
              canceledAt: null,
            },
            select: {
              tutorId: true,
            },
          },
        },
      });

      if (!orders || orders.length === 0) {
        return res
          .status(404)
          .json({ error: "Заказы для указанного студента не найдены" });
      }

      const enrichedOrders = orders.map((order) => {
        const selectedTutorIds = Array.isArray(order.contracts)
          ? order.contracts.map((c) => c.tutorId)
          : [];
        return {
          ...order,
          selectedTutorIds,
        };
      });

      res.json(enrichedOrders); // Возвращаем массив заказов
    } catch (error) {
      console.error("Get Orders By StudentId Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Получение заказа по ID (SECURE)
  getOrderById: async (req, res) => {
    const { id } = req.params;
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          // student: true,
          // chats: {
          //   include: {
          //     tutor: true,
          //     student: true,
          //     messages: true,
          //   },
          // },

          chats: {
            select: {
              id: true,
              tutorId: true,
              tutorHasAccess: true,
            },
          },
          contracts: {
            where: {
              canceledAt: null,
            },
            select: {
              tutorId: true,
              tutor: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  publicRating: true,
                  reviewsCount: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const selectedTutors = Array.isArray(order.contracts)
        ? order.contracts.map((c) => ({
            id: c.tutorId,
            name: c.tutor?.name ?? "",
            avatarUrl: c.tutor?.avatarUrl ?? "",
            publicRating: c.tutor?.publicRating,
            reviewsCount: c.tutor?.reviewsCount,
          }))
        : [];

      res.json({
        ...order,
        selectedTutors,
      });
    } catch (error) {
      console.error("Get Order By Id Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Публичный метод получения заказа по ID, без авторизации (SECURE)
  getOrderByIdPublic: async (req, res) => {
    const { id } = req.params;
    try {
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      res.json(order);
    } catch (error) {
      console.error("Get Order By Id Public Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Обновление заказа студентом
  updateOrder: async (req, res) => {
    const { id } = req.params;
    const {
      studentType,
      studentYears,
      studentClass,
      studentCourse,
      studentUniversity,
      studentExam,
      studyMethod,
      studyProgramm,
      deadline,
      studentLevel,
      tutorGender,
      studentSchedule,
      studentPlace,
      studentAdress,
      studentHomeLoc,
      studentTrip,
      tutorType,
      autoContactsOnResponse,
      studentWishes,
      region,
      responseCost,
      status,
    } = req.body;
    const userId = req.user.userID;

    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          student: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      if (order.student.userId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const updateOrder = await prisma.order.update({
        where: { id },
        data: {
          studentType: studentType || undefined,
          studentYears: studentYears || undefined,
          studentClass: studentClass || undefined,
          studentCourse: studentCourse || undefined,
          studentUniversity: studentUniversity || undefined,
          studentExam: studentExam || undefined,
          studyMethod: studyMethod || undefined,
          studyProgramm: studyProgramm || undefined,
          deadline: deadline || undefined,
          studentLevel: studentLevel || undefined,
          tutorGender: tutorGender || undefined,
          studentSchedule: studentSchedule || undefined,
          studentPlace: studentPlace || undefined,
          studentAdress: studentAdress || undefined,
          studentHomeLoc: studentHomeLoc || undefined,
          studentTrip: studentTrip || undefined,
          tutorType: tutorType || undefined,
          autoContactsOnResponse: autoContactsOnResponse || false,
          studentWishes: studentWishes || undefined,
          region: region || undefined,
          responseCost: responseCost || undefined,
          status: status || undefined,
        },
        include: {
          chats: {
            include: {
              tutor: true,
              messages: true,
            },
          },
          contracts: {
            where: {
              canceledAt: null,
            },
            select: {
              tutorId: true,
              tutor: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  publicRating: true,
                  reviewsCount: true,
                },
              },
            },
          },
        },
      });

      const selectedTutors = Array.isArray(updateOrder.contracts)
        ? updateOrder.contracts.map((c) => ({
            id: c.tutorId,
            name: c.tutor?.name ?? "",
            avatarUrl: c.tutor?.avatarUrl ?? "",
            publicRating: c.tutor?.publicRating,
            reviewsCount: c.tutor?.reviewsCount,
          }))
        : [];

      res.json({
        ...updateOrder,
        selectedTutors,
      });
    } catch (error) {
      console.error("Update Order Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Удаление заказа студентом
  deleteOrder: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userID;

    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          student: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      if (order.student.userId !== userId) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      await prisma.order.delete({ where: { id } });
      res.send("Заказ удален");
    } catch (error) {
      console.error("Delete Order Error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = OrderController;
