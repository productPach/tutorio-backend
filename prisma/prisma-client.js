const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Middleware для удаления полей перед возвратом данных
prisma.$use(async (params, next) => {
  const result = await next(params);

  if (params.model === "Tutor" && result) {
    if (Array.isArray(result)) {
      return result.map((tutor) =>
        omitFields(tutor, ["emailVerificationToken", "emailTokenExpires"])
      );
    } else {
      return omitFields(result, [
        "emailVerificationToken",
        "emailTokenExpires",
      ]);
    }
  }

  return result;
});

const omitFields = (obj, fields) => {
  if (!obj || typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !fields.includes(key))
  );
};

module.exports = {
  prisma,
};
