const prisma = require("../prisma/prisma-client"); // поправь путь под себя

const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userID;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: user not found in request" });
    }

    const admin = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!admin) {
      return res
        .status(403)
        .json({ error: "Доступ запрещён: только для сотрудников" });
    }

    next();
  } catch (error) {
    console.error("Ошибка проверки админа:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

module.exports = isAdmin;
