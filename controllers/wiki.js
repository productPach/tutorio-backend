const { prisma } = require("../prisma/prisma-client");

const WikiController = {
  // Создание топика
  createTopic: async (req, res) => {
    const { title, description, order } = req.body;

    if (!title || !description || order === undefined) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const newTopic = await prisma.topic.create({
        data: { title, description, order },
      });

      res.status(201).json(newTopic);
    } catch (error) {
      console.error("Ошибка при создании топика:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех топиков
  getAllTopics: async (req, res) => {
    try {
      const topics = await prisma.topic.findMany({
        include: { themes: true },
        orderBy: { order: "asc" },
      });

      res.status(200).json(topics);
    } catch (error) {
      console.error("Ошибка при получении топиков:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение топика по ID
  getTopicById: async (req, res) => {
    const { id } = req.params;

    try {
      const topic = await prisma.topic.findUnique({
        where: { id },
        include: { themes: true },
      });

      if (!topic) {
        return res.status(404).json({ error: "Топик не найден" });
      }

      res.status(200).json(topic);
    } catch (error) {
      console.error("Ошибка при получении топика:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление топика
  updateTopic: async (req, res) => {
    const { id } = req.params;
    const { title, description, order } = req.body;

    try {
      const updatedTopic = await prisma.topic.update({
        where: { id },
        data: { title, description, order },
      });

      res.status(200).json(updatedTopic);
    } catch (error) {
      console.error("Ошибка при обновлении топика:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление топика
  deleteTopic: async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.topic.delete({ where: { id } });
      res.status(200).json({ message: "Топик удален" });
    } catch (error) {
      console.error("Ошибка при удалении топика:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение всех тем
  getAllThemes: async (req, res) => {
    try {
      const themes = await prisma.theme.findMany();

      res.status(200).json(themes);
    } catch (error) {
      console.error("Ошибка при получении всех тем:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение тем для конкретного топика
  getThemesByTopic: async (req, res) => {
    const { id: topicId } = req.params;

    try {
      const themes = await prisma.theme.findMany({
        where: { topicId: topicId },
      });

      res.status(200).json(themes);
    } catch (error) {
      console.error("Ошибка при получении тем для топика:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Создание темы внутри топика
  createTheme: async (req, res) => {
    const { topicId, title, content, order } = req.body;

    if (!topicId || !title || !content || order === undefined) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const newTheme = await prisma.theme.create({
        data: { topicId, title, content, order },
      });

      res.status(201).json(newTheme);
    } catch (error) {
      console.error("Ошибка при создании темы:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение темы по ID
  getThemeById: async (req, res) => {
    const { id } = req.params;

    try {
      const theme = await prisma.theme.findUnique({ where: { id } });

      if (!theme) {
        return res.status(404).json({ error: "Тема не найдена" });
      }

      res.status(200).json(theme);
    } catch (error) {
      console.error("Ошибка при получении темы:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление темы
  updateTheme: async (req, res) => {
    const { id } = req.params;
    const { title, content, order } = req.body;

    try {
      const updatedTheme = await prisma.theme.update({
        where: { id },
        data: { title, content, order },
      });

      res.status(200).json(updatedTheme);
    } catch (error) {
      console.error("Ошибка при обновлении темы:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Удаление темы
  deleteTheme: async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.theme.delete({ where: { id } });
      res.status(200).json({ message: "Тема удалена" });
    } catch (error) {
      console.error("Ошибка при удалении темы:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
};

module.exports = WikiController;
