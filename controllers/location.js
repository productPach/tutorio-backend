const { prisma } = require("../prisma/prisma-client");

const LocationController = {
  // Добавление города и области
  // Добавление нового города
  createCity: async (req, res) => {
    const { title, area, shortTitle, districts, regionalCities } = req.body;

    // Проверяем обязательные поля
    if (!title || !area || !shortTitle) {
      return res.status(400).json({
        error: "Поля title, area и shortTitle являются обязательными",
      });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверка на существование города с таким же названием
      const existingCity = await prisma.city.findUnique({
        where: { title },
      });

      if (existingCity) {
        return res.status(400).json({
          error: "Город с таким названием уже существует",
        });
      }

      // Создание нового города
      const newCity = await prisma.city.create({
        data: {
          title,
          area,
          shortTitle,
          districts: {
            create:
              districts?.map((district) => ({
                title: district.title,
                metros: {
                  create:
                    district.metros?.map((metro) => ({
                      title: metro.title,
                      color: metro.color || null,
                      lineName: metro.lineName || null,
                      lineNumber: metro.lineNumber || null,
                    })) || [],
                },
              })) || [],
          },
          regionalCities: {
            create:
              regionalCities?.map((regionalCity) => ({
                title: regionalCity.title,
              })) || [],
          },
        },
      });

      res.status(201).json(newCity);
    } catch (error) {
      console.error("Ошибка при создании города:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение списка всех городов
  getAllCity: async (req, res) => {
    try {
      const cities = await prisma.city.findMany({
        include: {
          districts: {
            include: {
              metros: true, // Получаем вложенные станции метро
            },
          },
          regionalCities: true, // Получаем вложенные региональные города
        },
      });

      res.status(200).json(cities);
    } catch (error) {
      console.error("Ошибка при получении списка городов:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Получение города по ID
  getCityById: async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    try {
      const city = await prisma.city.findUnique({
        where: { id },
        include: {
          districts: {
            include: {
              metros: true, // Получаем вложенные станции метро
            },
          },
          regionalCities: true, // Получаем вложенные региональные города
        },
      });

      if (!city) {
        return res.status(404).json({ error: "Город не найден" });
      }

      res.status(200).json(city);
    } catch (error) {
      console.error("Ошибка при получении города по ID:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление города по ID (только title, area и shortTitle)
  updateCityById: async (req, res) => {
    const { id } = req.params;
    const { title, area, shortTitle } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    if (!title || !area || !shortTitle) {
      return res.status(400).json({
        error: "Поля title, area и shortTitle являются обязательными",
      });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем существование города
      const existingCity = await prisma.city.findUnique({ where: { id } });

      if (!existingCity) {
        return res.status(404).json({ error: "Город не найден" });
      }

      // Обновляем только необходимые поля
      const updatedCity = await prisma.city.update({
        where: { id },
        data: {
          title,
          area,
          shortTitle,
        },
      });

      res.status(200).json({
        message: "Город успешно обновлен",
        city: updatedCity,
      });
    } catch (error) {
      console.error("Ошибка при обновлении города:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Добавление района в город по ID
  createDistrict: async (req, res) => {
    const { cityId } = req.params;
    const { title, metros } = req.body;

    if (!title) {
      return res.status(400).json({
        error: "Поле title является обязательным",
      });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем, существует ли город
      const existingCity = await prisma.city.findUnique({
        where: { id: cityId },
      });

      if (!existingCity) {
        return res.status(404).json({
          error: "Город не найден",
        });
      }

      // Добавляем новый район в список существующих районов города
      const updatedCity = await prisma.city.update({
        where: { id: cityId },
        data: {
          districts: {
            create: {
              title,
              metros: {
                create:
                  metros?.map((metro) => ({
                    title: metro.title,
                    color: metro.color || null,
                    lineName: metro.lineName || null,
                    lineNumber: metro.lineNumber || null,
                  })) || [],
              },
            },
          },
        },
        include: {
          districts: true,
        },
      });

      res.status(201).json({
        message: "Район успешно добавлен",
        city: updatedCity,
      });
    } catch (error) {
      console.error("Ошибка при добавлении района:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление района по ID (только название)
  updateDistrictById: async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID района является обязательным полем" });
    }

    if (!title) {
      return res
        .status(400)
        .json({ error: "Поле title является обязательным" });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем существование района
      const existingDistrict = await prisma.district.findUnique({
        where: { id },
      });

      if (!existingDistrict) {
        return res.status(404).json({ error: "Район не найден" });
      }

      // Обновляем только название района
      const updatedDistrict = await prisma.district.update({
        where: { id },
        data: {
          title,
        },
      });

      res.status(200).json({
        message: "Район успешно обновлен",
        district: updatedDistrict,
      });
    } catch (error) {
      console.error("Ошибка при обновлении района:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Добавление метро в район по ID района
  createMetro: async (req, res) => {
    const { districtId } = req.params;
    const { title, color, lineName, lineNumber } = req.body;

    if (!districtId) {
      return res
        .status(400)
        .json({ error: "ID района является обязательным полем" });
    }

    if (!title || !color || !lineName || !lineNumber) {
      return res.status(400).json({
        error:
          "Поля title, color, lineName и lineNumber являются обязательными",
      });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем существование района
      const existingDistrict = await prisma.district.findUnique({
        where: { id: districtId },
      });

      if (!existingDistrict) {
        return res.status(404).json({ error: "Район не найден" });
      }

      // Добавляем новое метро в существующий район
      const newMetro = await prisma.metro.create({
        data: {
          title,
          color,
          lineName,
          lineNumber,
          districtId, // Привязываем метро к району
        },
      });

      res.status(201).json({
        message: "Метро успешно добавлено",
        metro: newMetro,
      });
    } catch (error) {
      console.error("Ошибка при добавлении метро:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление метро по ID
  updateMetroById: async (req, res) => {
    const { id } = req.params;
    const { title, color, lineName, lineNumber } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID метро является обязательным полем" });
    }

    if (!title || !color || !lineName || !lineNumber) {
      return res.status(400).json({
        error:
          "Поля title, color, lineName и lineNumber являются обязательными",
      });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем существование метро
      const existingMetro = await prisma.metro.findUnique({ where: { id } });

      if (!existingMetro) {
        return res.status(404).json({ error: "Метро не найдено" });
      }

      // Обновляем только данные метро
      const updatedMetro = await prisma.metro.update({
        where: { id },
        data: {
          title,
          color,
          lineName,
          lineNumber,
        },
      });

      res.status(200).json({
        message: "Метро успешно обновлено",
        metro: updatedMetro,
      });
    } catch (error) {
      console.error("Ошибка при обновлении метро:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Добавление регионального города в город по ID города
  createRegionalCity: async (req, res) => {
    const { cityId } = req.params;
    const { title } = req.body;

    if (!cityId) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    if (!title) {
      return res
        .status(400)
        .json({ error: "Поле title является обязательным" });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем существование города
      const existingCity = await prisma.city.findUnique({
        where: { id: cityId },
      });

      if (!existingCity) {
        return res.status(404).json({ error: "Город не найден" });
      }

      // Добавляем новый региональный город в город
      const newRegionalCity = await prisma.regionalCity.create({
        data: {
          title,
          cityId, // Привязываем региональный город к основному городу
        },
      });

      res.status(201).json({
        message: "Региональный город успешно добавлен",
        regionalCity: newRegionalCity,
      });
    } catch (error) {
      console.error("Ошибка при добавлении регионального города:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление регионального города по ID
  updateRegionalCityById: async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID регионального города является обязательным полем" });
    }

    if (!title) {
      return res
        .status(400)
        .json({ error: "Поле title является обязательным" });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }
      // Проверяем существование регионального города
      const existingRegionalCity = await prisma.regionalCity.findUnique({
        where: { id },
      });

      if (!existingRegionalCity) {
        return res.status(404).json({ error: "Региональный город не найден" });
      }

      // Обновляем только название регионального города
      const updatedRegionalCity = await prisma.regionalCity.update({
        where: { id },
        data: {
          title,
        },
      });

      res.status(200).json({
        message: "Региональный город успешно обновлен",
        regionalCity: updatedRegionalCity,
      });
    } catch (error) {
      console.error("Ошибка при обновлении регионального города:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
};

module.exports = LocationController;
