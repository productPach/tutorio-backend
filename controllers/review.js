const { prisma } = require("../prisma/prisma-client");

const ReviewController = {
  // Создание отзыва от репетитора или ученика
  createReviewByUser: async (req, res) => {
    const { orderId, message, authorRole } = req.body; // "tutor" | "student"
    const userId = req.user.userID;

    if (!orderId || !message || !authorRole) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return res.status(404).json({ error: "Заказ не найден" });

      const student = await prisma.student.findUnique({ where: { userId } });
      const tutor = await prisma.tutor.findUnique({ where: { userId } });

      if (authorRole === "student") {
        if (!student || student.id !== order.studentId) {
          return res.status(403).json({ error: "Нет доступа" });
        }
      }

      if (authorRole === "tutor") {
        if (!tutor || tutor.id !== order.tutorId) {
          return res.status(403).json({ error: "Нет доступа" });
        }
      }
      const review = await prisma.review.create({
        data: {
          orderId,
          message,
          authorRole,
          studentId: authorRole === "student" ? student.id : undefined,
          tutorId: authorRole === "tutor" ? tutor.id : undefined,
          status: "Pending", // или auto-approve, как нужно
        },
      });

      res.json(review);
    } catch (e) {
      console.error("createReviewByUser error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Создание комментария к отзыву от репетитора или ученика
  createCommentByUser: async (req, res) => {
    const { reviewId, text } = req.body;
    const userId = req.user.userID;

    if (!reviewId || !text) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });
      if (!review) return res.status(404).json({ error: "Отзыв не найден" });

      // Получаем связанного репетитора и ученика по userId
      const tutor = await prisma.tutor.findUnique({ where: { userId } });
      const student = await prisma.student.findUnique({ where: { userId } });

      if (!tutor && !student) {
        return res.status(403).json({
          error: "Пользователь не является ни репетитором, ни учеником",
        });
      }

      // Проверяем доступ к отзыву
      if (review.tutorId) {
        if (!tutor || review.tutorId !== tutor.id) {
          return res.status(403).json({ error: "Нет доступа к отзыву" });
        }
      }
      if (review.studentId) {
        if (!student || review.studentId !== student.id) {
          return res.status(403).json({ error: "Нет доступа к отзыву" });
        }
      }

      // Определяем роль и id отправителя для комментария
      let senderId, senderRole;
      if (tutor && review.tutorId === tutor.id) {
        senderId = tutor.id;
        senderRole = "tutor";
      } else if (student && review.studentId === student.id) {
        senderId = student.id;
        senderRole = "student";
      } else {
        return res
          .status(403)
          .json({ error: "Нет прав оставлять комментарий" });
      }

      const comment = await prisma.comment.create({
        data: {
          reviewId,
          text,
          senderId,
          senderRole,
        },
      });

      res.json(comment);
    } catch (e) {
      console.error("createCommentByUser error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение всех отзывов конкретного репетитора (включая комментарии)
  getReviewsByTutorId: async (req, res) => {
    const { tutorId } = req.params;

    if (!tutorId)
      return res.status(400).json({ error: "Не передан ID репетитора" });

    try {
      const reviews = await prisma.review.findMany({
        where: { tutorId },
        orderBy: { createdAt: "desc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
          },
          student: {
            select: { id: true, name: true },
          },
          order: {
            select: { id: true, subject: true, goal: true },
          },
        },
      });

      res.json(reviews);
    } catch (e) {
      console.error("getReviewsByTutorId error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = ReviewController;
