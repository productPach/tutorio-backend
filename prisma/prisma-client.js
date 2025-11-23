const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  adapter: {
    provider: "mongodb",
    url: process.env.DATABASE_URL,
  },
});

module.exports = { prisma };
