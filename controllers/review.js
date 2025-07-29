const { prisma } = require("../prisma/prisma-client");

const ReviewController = {
  // Создание отзыва от репетитора или ученика
  createReviewByUser: async (req, res) => {
    const { orderId, tutorId, studentId, authorRole, message, rating } =
      req.body;
    const userId = req.user.userID;

    if (
      !orderId ||
      !tutorId ||
      !studentId ||
      !authorRole ||
      typeof rating !== "number"
    ) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Рейтинг должен быть от 1 до 5" });
    }

    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return res.status(404).json({ error: "Заказ не найден" });

      if (authorRole === "student") {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: { user: true },
        });

        if (
          !student ||
          student.userId !== userId ||
          student.id !== order.studentId
        ) {
          return res.status(403).json({ error: "Нет доступа для студента" });
        }
      }

      if (authorRole === "tutor") {
        const tutor = await prisma.tutor.findUnique({
          where: { id: tutorId },
          include: { user: true },
        });

        if (!tutor || tutor.userId !== userId) {
          return res.status(403).json({ error: "Нет доступа для репетитора" });
        }

        // 💡 При необходимости: проверка, что репетитор участвовал в этом заказе
        // (например, был отклик или контракт)
      }

      const review = await prisma.review.create({
        data: {
          orderId,
          tutorId,
          studentId,
          message: message || undefined,
          rating,
          authorRole,
          status: "Pending",
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

  // Обновление отзыва от репетитора или ученика
  updateReviewByUser: async (req, res) => {
    const { id } = req.params; // id отзыва
    const { message, rating } = req.body;
    const userId = req.user.userID;

    if (
      rating !== undefined &&
      (typeof rating !== "number" || rating < 1 || rating > 5)
    ) {
      return res.status(400).json({ error: "Рейтинг должен быть от 1 до 5" });
    }

    try {
      const review = await prisma.review.findUnique({
        where: { id },
        include: {
          student: { select: { userId: true } },
          tutor: { select: { userId: true } },
        },
      });

      if (!review) {
        return res.status(404).json({ error: "Отзыв не найден" });
      }

      const isStudentAuthor =
        review.authorRole === "student" && review.student?.userId === userId;
      const isTutorAuthor =
        review.authorRole === "tutor" && review.tutor?.userId === userId;

      if (!isStudentAuthor && !isTutorAuthor) {
        return res
          .status(403)
          .json({ error: "Нет доступа к редактированию этого отзыва" });
      }

      const updatedReview = await prisma.review.update({
        where: { id },
        data: {
          ...(message !== undefined && { message }),
          ...(rating !== undefined && { rating }),
          updatedAt: new Date(),
        },
      });

      res.json(updatedReview);
    } catch (e) {
      console.error("updateReviewByUser error:", e);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Получение всех отзывов конкретного репетитора (включая комментарии)
  getReviewsByTutorId: async (req, res) => {
    const { tutorId } = req.params;

    if (!tutorId) {
      return res.status(400).json({ error: "Не передан ID репетитора" });
    }

    try {
      const reviews = await prisma.review.findMany({
        where: {
          tutorId,
          authorRole: "student",
          status: "Active",
        },
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
