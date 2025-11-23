const { defineConfig } = require("@prisma/config");

module.exports = defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    db: {
      url: process.env.DATABASE_URL, // ← MongoDB URL
    },
  },
});
