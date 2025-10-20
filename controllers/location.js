const { prisma } = require("../prisma/prisma-client");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const turf = require("@turf/turf");

const geoJsonPath = path.join(
  __dirname,
  "../data/geoBoundaries-RUS-ADM1_simplified.geojson"
);
const geoBoundaries = JSON.parse(fs.readFileSync(geoJsonPath, "utf-8"));

// Маппинг английских названий GeoJSON → русские для базы
const geoToRusMap = {
  Moscow: { city: "Москва", area: "Московская область" },
  "Moscow Oblast": { city: "Москва", area: "Московская область" },
  "Saint Petersburg": {
    city: "Санкт-Петербург",
    area: "Ленинградская область",
  },
  "Altai Krai": { city: "", area: "Алтайский край" },
  Bashkortostan: { city: "", area: "Башкортостан" },
  "Krasnodar Krai": { city: "", area: "Краснодарский край" },
  Tatarstan: { city: "", area: "Татарстан" },
  // ...добавь все остальные регионы РФ
};

const LocationController = {
  // Добавление нового города
  createCity: async (req, res) => {
    const { title, area, shortTitle, districts, regionalCities, metros } =
      req.body;

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
                type: district.type,
              })) || [],
          },
          regionalCities: {
            create:
              regionalCities?.map((regionalCity) => ({
                title: regionalCity.title,
              })) || [],
          },
          metros: {
            create:
              metros?.map((metro) => ({
                title: metro.title,
                color: metro.color || null,
                lineName: metro.lineName || null,
                lineNumber: metro.lineNumber || null,
                cityPrefix: metro.cityPrefix || null,
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
          metros: true, // Получаем станции метро напрямую у города
          districts: true, // Получаем районы без метро
          regionalCities: true, // Получаем региональные города
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
          metros: true, // Получаем станции метро напрямую у города
          districts: true, // Получаем районы без метро
          regionalCities: true, // Получаем региональные города
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
    const { title, area, shortTitle, districts, regionalCities, metros } =
      req.body;

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
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({ where: { userId } });

      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      const existingCity = await prisma.city.findUnique({
        where: { id },
        include: {
          districts: true,
          regionalCities: true,
          metros: true,
        },
      });

      if (!existingCity) {
        return res.status(404).json({ error: "Город не найден" });
      }

      // Обновляем сам город
      await prisma.city.update({
        where: { id },
        data: { title, area, shortTitle },
      });

      // Обновление districts
      if (districts?.length) {
        for (const district of districts) {
          if (district.id) {
            await prisma.district.update({
              where: { id: district.id },
              data: {
                title: district.title,
                type: district.type,
              },
            });
          } else {
            await prisma.district.create({
              data: {
                title: district.title,
                type: district.type,
                cityId: id,
              },
            });
          }
        }
      }

      // Обновление regionalCities
      if (regionalCities?.length) {
        for (const regCity of regionalCities) {
          if (regCity.id) {
            await prisma.regionalCity.update({
              where: { id: regCity.id },
              data: { title: regCity.title },
            });
          } else {
            await prisma.regionalCity.create({
              data: { title: regCity.title, cityId: id },
            });
          }
        }
      }

      // Обновление/создание метро на уровне города
      if (metros?.length) {
        for (const metro of metros) {
          if (metro.id) {
            await prisma.metro.update({
              where: { id: metro.id },
              data: {
                title: metro.title,
                color: metro.color || null,
                lineName: metro.lineName || null,
                lineNumber: metro.lineNumber || null,
                cityPrefix: metro.cityPrefix || null,
              },
            });
          } else {
            await prisma.metro.create({
              data: {
                title: metro.title,
                color: metro.color || null,
                lineName: metro.lineName || null,
                lineNumber: metro.lineNumber || null,
                cityPrefix: metro.cityPrefix || null,
                cityId: id,
              },
            });
          }
        }
      }

      // Возвращаем полный объект города
      const fullCity = await prisma.city.findUnique({
        where: { id },
        include: {
          districts: true,
          regionalCities: true,
          metros: true,
        },
      });

      res.status(200).json({
        message: "Город успешно обновлен",
        city: fullCity,
      });
    } catch (error) {
      console.error("Ошибка при обновлении города:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Добавление района в город по ID
  createDistrict: async (req, res) => {
    const { cityId } = req.params;
    const { title, type } = req.body;

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

      // Добавляем новый район в город
      const newDistrict = await prisma.district.create({
        data: {
          title,
          type,
          cityId,
        },
      });

      res.status(201).json({
        message: "Район успешно добавлен",
        district: newDistrict,
      });
    } catch (error) {
      console.error("Ошибка при добавлении района:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Добавление районов города по строке через запятую и одному типу для всех
  createDistrictsBulk: async (req, res) => {
    const { cityId } = req.params; // id города
    const { districts, type } = req.body; // districts: "А, Б, В", type: "Area" или "District" и т.д.

    if (!cityId) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    if (!districts || typeof districts !== "string") {
      return res.status(400).json({
        error: "Поле districts должно быть строкой с названиями через запятую",
      });
    }

    if (!type || typeof type !== "string") {
      return res.status(400).json({
        error: "Поле type является обязательным и должно быть строкой",
      });
    }

    try {
      // Проверка прав: только сотрудники/админы
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({ where: { userId } });
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      // Проверяем, существует ли город
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) {
        return res.status(404).json({ error: "Город не найден" });
      }

      // Парсим входную строку в массив
      const districtsArray = districts
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      if (districtsArray.length === 0) {
        return res
          .status(400)
          .json({ error: "Нужно передать хотя бы один район" });
      }

      // Получим все существующие районы города (чтобы сравнить нечувствительно к регистру)
      const existingDistricts = await prisma.district.findMany({
        where: { cityId },
        select: { id: true, title: true, type: true },
      });

      const existingTitlesLower = new Set(
        existingDistricts.map((d) => d.title.toLowerCase())
      );

      // Выбираем, какие создавать (пропускаем те, что уже есть)
      const toCreate = districtsArray.filter(
        (title) => !existingTitlesLower.has(title.toLowerCase())
      );

      const created = [];
      for (const title of toCreate) {
        const createdDistrict = await prisma.district.create({
          data: {
            title,
            type: type.trim(),
            cityId,
          },
        });
        created.push(createdDistrict);
      }

      // Формируем ответ: что создали и что уже было
      const skipped = existingDistricts.filter((d) =>
        districtsArray.some((t) => t.toLowerCase() === d.title.toLowerCase())
      );

      if (created.length === 0) {
        return res.status(200).json({
          message:
            "Районы не добавлены — все указанные районы уже существуют в городе",
          skipped,
        });
      }

      return res.status(201).json({
        message: "Районы успешно добавлены",
        created,
        skipped,
      });
    } catch (error) {
      console.error("Ошибка при добавлении районов:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление района по ID (только название)
  updateDistrictById: async (req, res) => {
    const { id } = req.params;
    const { title, type } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID района является обязательным полем" });
    }

    if (!title || !type) {
      return res
        .status(400)
        .json({ error: "Поля title и type являются обязательными" });
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
          type,
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

  // Добавление метро в город по ID города
  createMetro: async (req, res) => {
    const { cityId } = req.params;
    const { title, color, lineName, lineNumber, cityPrefix } = req.body;

    if (!cityId) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    if (!title) {
      return res.status(400).json({
        error: "Поле title является обязательным",
      });
    }

    try {
      // 🔒 Проверка: является ли пользователь сотрудником (админом)
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({ where: { userId } });

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

      // Создаём новое метро для города
      const newMetro = await prisma.metro.create({
        data: {
          title,
          color: color || null,
          lineName: lineName || null,
          lineNumber: lineNumber || null,
          cityPrefix: cityPrefix || null,
          cityId,
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

  // Добавление списка метро в город по ID города
  createMetrosToCityBulk: async (req, res) => {
    const { cityId } = req.params;
    const { metros } = req.body;

    if (!cityId) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    if (!Array.isArray(metros) || metros.length === 0) {
      return res.status(400).json({
        error: "Поле metros должно быть массивом объектов метро",
      });
    }

    try {
      // Проверка прав: только сотрудники/админы
      const userId = req.user.userID;
      const isAdmin = await prisma.employee.findUnique({ where: { userId } });
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Доступ запрещён: только для сотрудников" });
      }

      // Проверяем, существует ли город
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) {
        return res.status(404).json({ error: "Город не найден" });
      }

      // Создаём список новых станций метро
      const createdMetros = [];
      for (const metro of metros) {
        if (!metro.title) continue; // название обязательно

        const newMetro = await prisma.metro.create({
          data: {
            title: metro.title,
            color: metro.color || null,
            lineName: metro.lineName || null,
            lineNumber: metro.lineNumber || null,
            cityPrefix: metro.cityPrefix || null,
            cityId,
          },
        });

        createdMetros.push(newMetro);
      }

      if (createdMetros.length === 0) {
        return res.status(400).json({
          error: "Не удалось добавить метро — проверьте входные данные",
        });
      }

      res.status(201).json({
        message: "Станции метро успешно добавлены",
        created: createdMetros,
      });
    } catch (error) {
      console.error("Ошибка при добавлении метро:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Обновление метро по ID
  updateMetroById: async (req, res) => {
    const { id } = req.params;
    const { title, color, lineName, lineNumber, cityPrefix } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID метро является обязательным полем" });
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

      // Формируем объект обновления только с переданными полями
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (color !== undefined) updateData.color = color;
      if (lineName !== undefined) updateData.lineName = lineName;
      if (lineNumber !== undefined) updateData.lineNumber = lineNumber;
      if (cityPrefix !== undefined) updateData.cityPrefix = cityPrefix;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "Не переданы поля для обновления",
        });
      }

      const updatedMetro = await prisma.metro.update({
        where: { id },
        data: updateData,
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
    const { title, type } = req.body;

    if (!cityId) {
      return res
        .status(400)
        .json({ error: "ID города является обязательным полем" });
    }

    if (!title || !type) {
      return res
        .status(400)
        .json({ error: "Поле title и type являются обязательными" });
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
          type,
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

  // Добавление нескольких городов
  createRegionalCitiesBulk: async (req, res) => {
    try {
      const { cityId } = req.params;
      const { titles, type } = req.body;

      if (!cityId) {
        return res.status(400).json({ error: "ID города — обязательное поле" });
      }
      if (!titles) {
        return res.status(400).json({ error: "Поле titles — обязательное" });
      }

      // titles приходят строкой: "Павловск, Зеленогорск, Сестрорецк"
      const titlesArray = titles
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (titlesArray.length === 0) {
        return res.status(400).json({ error: "Список городов пуст" });
      }

      const regionalCities = titlesArray.map((title) => ({
        title,
        type: type || null,
        cityId,
      }));

      const created = await prisma.regionalCity.createMany({
        data: regionalCities,
      });

      return res.status(201).json({
        message: "Региональные города успешно добавлены",
        count: created.count,
      });
    } catch (error) {
      console.error("Ошибка при добавлении региональных городов:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  // Обновление регионального города по ID
  updateRegionalCityById: async (req, res) => {
    const { id } = req.params;
    const { title, type } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID регионального города является обязательным полем" });
    }

    if (!title || !type) {
      return res
        .status(400)
        .json({ error: "Поле title и type являются обязательными" });
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
          type,
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

  detectUserRegion: async (req, res) => {
    try {
      console.log("=== detectUserRegion START ===");

      // Получаем IP пользователя
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress;

      const cleanIp = ip === "::1" || ip === "127.0.0.1" ? "46.36.217.153" : ip;

      // Пробуем получить гео по IP
      let geoData = {};
      try {
        const { data } = await axios.get(`https://ipapi.co/${cleanIp}/json/`);
        geoData = data;
      } catch (e) {
        console.warn(
          "IP-сервис не ответил, используем fallback по координатам"
        );
      }

      let lat = geoData.latitude;
      let lon = geoData.longitude;

      // Фоллбек через query params
      if ((!lat || !lon) && req.query.lat && req.query.lon) {
        lat = parseFloat(req.query.lat);
        lon = parseFloat(req.query.lon);
      }

      if (!lat || !lon) {
        return res
          .status(400)
          .json({ error: "Не удалось определить координаты пользователя" });
      }

      // Определяем регион через GeoJSON
      const point = turf.point([lon, lat]);
      let matchedRegion = null;

      for (const feature of geoBoundaries.features) {
        if (feature.geometry && turf.booleanPointInPolygon(point, feature)) {
          matchedRegion = feature.properties.shapeName;
          break;
        }
      }

      // Фоллбек через OSM
      if (!matchedRegion) {
        try {
          const osm = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
              params: {
                format: "json",
                lat,
                lon,
                zoom: 6,
                addressdetails: 1,
                "accept-language": "ru",
              },
              headers: { "User-Agent": "TutorioServer/1.0" },
            }
          );
          const address = osm.data.address || {};
          matchedRegion = address.state || address.region || "";
        } catch (e) {
          console.warn("OSM fallback не сработал:", e.message);
        }
      }

      if (!matchedRegion) {
        return res.status(404).json({ error: "Регион не найден" });
      }

      // Преобразуем через маппинг
      const mapping = geoToRusMap[matchedRegion] || {
        city: "",
        area: matchedRegion,
      };
      const normalizedCity = mapping.city;
      const normalizedArea = mapping.area;

      // Ищем в базе
      const cityRecord = await prisma.city.findFirst({
        where: {
          OR: [
            {
              title: {
                equals: normalizedCity || matchedRegion,
                mode: "insensitive",
              },
            },
            { area: { equals: normalizedArea, mode: "insensitive" } },
          ],
        },
      });

      if (!cityRecord) {
        return res.status(404).json({
          error: "Регион не найден в базе",
          geo: { matchedRegion },
        });
      }

      return res.json(cityRecord);
    } catch (e) {
      console.error("detectUserRegion error:", e.message, e.stack);
      res.status(500).json({ error: "Ошибка при определении региона" });
    }
  },
};

module.exports = LocationController;
