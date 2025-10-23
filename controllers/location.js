const { prisma } = require("../prisma/prisma-client");
const path = require("path");
const ip2location = require("ip2location-nodejs");
const { title } = require("process");

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

  // Массовое создание городов
  createCitiesBulk: async (req, res) => {
    const { cities } = req.body;

    // Проверяем обязательные поля
    if (!cities || !Array.isArray(cities)) {
      return res.status(400).json({
        error: "Поле cities является обязательным и должно быть массивом",
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

      // Валидация каждого города
      for (const city of cities) {
        if (!city.title || !city.area || !city.shortTitle || !city.slug) {
          return res.status(400).json({
            error: `Город ${city.title || "без названия"}:
Поля title, area, shortTitle и slug являются обязательными`,
          });
        }
      }

      const results = [];
      const errors = [];

      // Создаем города по одному
      for (const cityData of cities) {
        try {
          // Проверка на существование города с таким же названием
          const existingCityByTitle = await prisma.city.findUnique({
            where: { title: cityData.title },
          });

          if (existingCityByTitle) {
            errors.push({
              title: cityData.title,
              error: "Город с таким названием уже существует",
            });
            continue;
          }

          // Проверка на существование города с таким же slug
          const existingCityBySlug = await prisma.city.findUnique({
            where: { slug: cityData.slug },
          });

          if (existingCityBySlug) {
            errors.push({
              title: cityData.title,
              error: `Город с таким slug '${cityData.slug}' уже существует`,
            });
            continue;
          }

          // Создание нового города
          const newCity = await prisma.city.create({
            data: {
              title: cityData.title,
              area: cityData.area,
              shortTitle: cityData.shortTitle,
              region_name_dative: cityData.region_name_dative || null,
              slug: cityData.slug,
              districts: {
                create:
                  cityData.districts?.map((district) => ({
                    title: district.title,
                    type: district.type,
                  })) || [],
              },
              regionalCities: {
                create:
                  cityData.regionalCities?.map((regionalCity) => ({
                    title: regionalCity.title,
                  })) || [],
              },
              metros: {
                create:
                  cityData.metros?.map((metro) => ({
                    title: metro.title,
                    color: metro.color || null,
                    lineName: metro.lineName || null,
                    lineNumber: metro.lineNumber || null,
                    cityPrefix: metro.cityPrefix || null,
                  })) || [],
              },
            },
            include: {
              districts: true,
              regionalCities: true,
              metros: true,
            },
          });

          results.push({
            id: newCity.id,
            title: newCity.title,
            slug: newCity.slug,
            status: "success",
            districtsCount: newCity.districts.length,
            regionalCitiesCount: newCity.regionalCities.length,
            metrosCount: newCity.metros.length,
          });
        } catch (error) {
          errors.push({
            title: cityData.title,
            error: error.message,
          });
        }
      }

      res.status(201).json({
        message: `Успешно создано ${results.length} городов, ошибок: ${errors.length}`,
        created: results,
        errors: errors,
      });
    } catch (error) {
      console.error("Ошибка при массовом создании городов:", error);
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

  // Получение города по Slug (префикс в урл)
  getCityBySlug: async (req, res) => {
    const { slug } = req.params;

    if (!slug) {
      return res
        .status(400)
        .json({ error: "Slug города является обязательным полем" });
    }

    try {
      const city = await prisma.city.findUnique({
        where: { slug },
        // select: {
        //   title: true,
        //   region_name_dative: true,
        // },
      });

      if (!city) {
        return res.status(404).json({ error: "Город не найден" });
      }

      res.status(200).json(city);
    } catch (error) {
      console.error("Ошибка при получении города по Slug:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  // Массовое обновление городов
  updateCitiesBulk: async (req, res) => {
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

      const { cities } = req.body;

      if (!cities || !Array.isArray(cities)) {
        return res.status(400).json({
          error: "Поле cities является обязательным и должно быть массивом",
        });
      }

      // Валидация данных
      for (const city of cities) {
        if (!city.id) {
          return res
            .status(400)
            .json({ error: "ID города является обязательным полем" });
        }
        if (!city.title) {
          return res
            .status(400)
            .json({ error: "Title является обязательным полем" });
        }
        if (!city.slug) {
          return res
            .status(400)
            .json({ error: "Slug является обязательным полем" });
        }
      }

      const results = [];
      const errors = [];

      // Обновляем города по одному
      for (const cityData of cities) {
        try {
          // Проверяем существование города
          const existingCity = await prisma.city.findUnique({
            where: { id: cityData.id },
          });

          if (!existingCity) {
            errors.push({ id: cityData.id, error: "Город не найден" });
            continue;
          }

          // Проверяем уникальность title (если title меняется)
          if (cityData.title !== existingCity.title) {
            const titleExists = await prisma.city.findUnique({
              where: { title: cityData.title },
            });

            if (titleExists) {
              errors.push({
                id: cityData.id,
                currentTitle: existingCity.title,
                error: `Title '${cityData.title}' уже используется городом с ID '${titleExists.id}'`,
              });
              continue;
            }
          }

          // Проверяем уникальность slug (если slug меняется)
          if (cityData.slug !== existingCity.slug) {
            const slugExists = await prisma.city.findFirst({
              where: { slug: cityData.slug },
            });

            if (slugExists) {
              errors.push({
                id: cityData.id,
                currentTitle: existingCity.title,
                error: `Slug '${cityData.slug}' уже используется городом '${slugExists.title}'`,
              });
              continue;
            }
          }

          // Обновляем ВСЕ поля города
          const updatedCity = await prisma.city.update({
            where: { id: cityData.id },
            data: {
              title: cityData.title,
              area: cityData.area,
              shortTitle: cityData.shortTitle,
              region_name_dative: cityData.region_name_dative,
              slug: cityData.slug,
              // Все остальные поля которые могут быть
            },
          });

          results.push({
            id: cityData.id,
            title: updatedCity.title,
            area: updatedCity.area,
            shortTitle: updatedCity.shortTitle,
            slug: updatedCity.slug,
            region_name_dative: updatedCity.region_name_dative,
            status: "success",
          });
        } catch (error) {
          errors.push({
            id: cityData.id,
            error: error.message,
          });
        }
      }

      res.status(200).json({
        message: `Обновлено ${results.length} городов, ошибок: ${errors.length}`,
        results,
        errors,
      });
    } catch (error) {
      console.error("Ошибка при массовом обновлении городов:", error);
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

  // detectUserRegion: async (req, res) => {
  //   try {
  //     console.log("=== detectUserRegion START ===");

  //     // 🧪 ТЕСТОВЫЙ РЕЖИМ - берем IP из параметра
  //     if (req.query.test_ip) {
  //       console.log("🧪 TEST MODE activated with IP:", req.query.test_ip);
  //       const cleanIp = req.query.test_ip;

  //       // Дальше твой обычный код, но с test IP
  //       const ipv4BinPath = path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "IP2LOCATION-LITE-DB3.BIN"
  //       );
  //       const ipv6BinPath = path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "IP2LOCATION-LITE-DB3.IPV6.BIN"
  //       );

  //       const ip2loc4 = new ip2location.IP2Location();
  //       const ip2loc6 = new ip2location.IP2Location();

  //       ip2loc4.open(ipv4BinPath);
  //       ip2loc6.open(ipv6BinPath);

  //       const geo = cleanIp.includes(":")
  //         ? ip2loc6.getAll(cleanIp)
  //         : ip2loc4.getAll(cleanIp);
  //       console.log("🧪 Geo info:", geo);

  //       if (
  //         !geo ||
  //         (geo.countryLong !== "Russian Federation" &&
  //           geo.countryLong !== "Russia")
  //       ) {
  //         return res.status(404).json({
  //           error: "Регион не найден (не РФ)",
  //           testIp: cleanIp,
  //           country: geo?.countryLong,
  //         });
  //       }

  //       const regionEn = (geo.region || "").trim();
  //       if (!regionEn) {
  //         return res
  //           .status(404)
  //           .json({ error: "Регион не определён в BIN", testIp: cleanIp });
  //       }

  //       const regionMap = require(path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "regionMapEnToRu.json"
  //       ));
  //       const regionRu = regionMap[regionEn] || regionEn;
  //       console.log(`🧪 regionEn = ${regionEn}, regionRu = ${regionRu}`);

  //       const cityRecord = await prisma.city.findFirst({
  //         where: {
  //           OR: [
  //             { title: { equals: regionRu, mode: "insensitive" } },
  //             { area: { equals: regionRu, mode: "insensitive" } },
  //           ],
  //         },
  //       });

  //       if (!cityRecord) {
  //         return res.status(404).json({
  //           error: "Регион не найден в базе",
  //           regionEn,
  //           regionRu,
  //           testIp: cleanIp,
  //         });
  //       }

  //       return res.json({ ...cityRecord, _test: true, testIp: cleanIp });
  //     }

  //     // 📍 Обычный режим (твой текущий код)

  //     // Получаем РЕАЛЬНЫЙ IP пользователя через заголовки
  //     let ip =
  //       req.headers["x-real-ip"] ||
  //       req.headers["x-forwarded-for"]?.split(",")[0] ||
  //       req.connection?.remoteAddress ||
  //       req.socket?.remoteAddress;

  //     console.log("All headers:", req.headers);
  //     console.log("Raw IP from request:", ip);

  //     // Безопасная проверка на внутренние IP
  //     const isInternalIp = (ip) => {
  //       if (!ip) return true;
  //       return (
  //         ip === "::1" ||
  //         ip === "127.0.0.1" ||
  //         ip.startsWith("172.") ||
  //         ip.startsWith("10.") ||
  //         ip.startsWith("192.168.")
  //       );
  //     };

  //     const cleanIp = isInternalIp(ip) ? "5.167.255.255" : ip;
  //     console.log("IP from request:", ip);
  //     console.log("Clean IP:", cleanIp);

  //     // Путь к BIN файлам
  //     const ipv4BinPath = path.join(
  //       __dirname,
  //       "data",
  //       "ip2location",
  //       "IP2LOCATION-LITE-DB3.BIN"
  //     );
  //     const ipv6BinPath = path.join(
  //       __dirname,
  //       "data",
  //       "ip2location",
  //       "IP2LOCATION-LITE-DB3.IPV6.BIN"
  //     );
  //     console.log("IPv4 BIN path:", ipv4BinPath);
  //     console.log("IPv6 BIN path:", ipv6BinPath);

  //     // Создаём объекты IP2Location
  //     const ip2loc4 = new ip2location.IP2Location();
  //     const ip2loc6 = new ip2location.IP2Location();

  //     // Открываем BIN файлы
  //     ip2loc4.open(ipv4BinPath);
  //     console.log("IPv4 BIN opened");
  //     ip2loc6.open(ipv6BinPath);
  //     console.log("IPv6 BIN opened");

  //     // Определяем гео через IP2Location
  //     const geo = cleanIp.includes(":")
  //       ? ip2loc6.getAll(cleanIp)
  //       : ip2loc4.getAll(cleanIp);
  //     console.log("Geo info:", geo);

  //     if (!geo || geo.countryLong !== "Russian Federation") {
  //       return res.status(404).json({ error: "Регион не найден (не РФ)" });
  //     }

  //     const regionEn = (geo.region || "").trim();
  //     if (!regionEn) {
  //       return res.status(404).json({ error: "Регион не определён в BIN" });
  //     }

  //     // JSON-маппинг в русские названия
  //     const regionMap = require(path.join(
  //       __dirname,
  //       "data",
  //       "ip2location",
  //       "regionMapEnToRu.json"
  //     ));
  //     const regionRu = regionMap[regionEn] || regionEn;
  //     console.log(`regionEn = ${regionEn}`);
  //     console.log(`regionRu = ${regionRu}`);

  //     // Ищем в базе
  //     const cityRecord = await prisma.city.findFirst({
  //       where: {
  //         OR: [
  //           { title: { equals: regionRu, mode: "insensitive" } },
  //           { area: { equals: regionRu, mode: "insensitive" } },
  //         ],
  //       },
  //     });

  //     if (!cityRecord) {
  //       return res.status(404).json({
  //         error: "Регион не найден в базе",
  //         regionEn,
  //         regionRu,
  //       });
  //     }

  //     return res.json(cityRecord);
  //   } catch (e) {
  //     console.error("detectUserRegion error:", e.message, e.stack);
  //     res.status(500).json({ error: "Ошибка при определении региона" });
  //   }
  // },

  // Вариант с кукой
  // detectUserRegion: async (req, res) => {
  //   try {
  //     console.log("=== detectUserRegion START ===");
  //     console.log("Query params:", req.query);

  //     const { set_cookie, region_id, test_ip } = req.query;
  //     const shouldSetCookie = set_cookie === "true";
  //     const manualRegionId = region_id ? region_id : null;

  //     // 🧪 ТЕСТОВЫЙ РЕЖИМ - берем IP из параметра
  //     if (test_ip) {
  //       console.log("🧪 TEST MODE activated with IP:", test_ip);
  //       const cleanIp = test_ip;

  //       // Дальше твой обычный код, но с test IP
  //       const ipv4BinPath = path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "IP2LOCATION-LITE-DB3.BIN"
  //       );
  //       const ipv6BinPath = path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "IP2LOCATION-LITE-DB3.IPV6.BIN"
  //       );

  //       const ip2loc4 = new ip2location.IP2Location();
  //       const ip2loc6 = new ip2location.IP2Location();

  //       ip2loc4.open(ipv4BinPath);
  //       ip2loc6.open(ipv6BinPath);

  //       const geo = cleanIp.includes(":")
  //         ? ip2loc6.getAll(cleanIp)
  //         : ip2loc4.getAll(cleanIp);
  //       console.log("🧪 Geo info:", geo);

  //       if (
  //         !geo ||
  //         (geo.countryLong !== "Russian Federation" &&
  //           geo.countryLong !== "Russia")
  //       ) {
  //         return res.status(404).json({
  //           error: "Регион не найден (не РФ)",
  //           testIp: cleanIp,
  //           country: geo?.countryLong,
  //         });
  //       }

  //       const regionEn = (geo.region || "").trim();
  //       if (!regionEn) {
  //         return res
  //           .status(404)
  //           .json({ error: "Регион не определён в BIN", testIp: cleanIp });
  //       }

  //       const regionMap = require(path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "regionMapEnToRu.json"
  //       ));
  //       const regionRu = regionMap[regionEn] || regionEn;
  //       console.log(`🧪 regionEn = ${regionEn}, regionRu = ${regionRu}`);

  //       const cityRecord = await prisma.city.findFirst({
  //         where: {
  //           OR: [
  //             { title: { equals: regionRu, mode: "insensitive" } },
  //             { area: { equals: regionRu, mode: "insensitive" } },
  //           ],
  //         },
  //       });

  //       if (!cityRecord) {
  //         return res.status(404).json({
  //           error: "Регион не найден в базе",
  //           regionEn,
  //           regionRu,
  //           testIp: cleanIp,
  //         });
  //       }

  //       // Устанавливаем куку если нужно (для тестового режима)
  //       if (shouldSetCookie) {
  //         res.cookie("region-id", cityRecord.id.toString(), {
  //           maxAge: 365 * 24 * 60 * 60 * 1000, // 1 год
  //           httpOnly: true,
  //           secure: process.env.NODE_ENV === "production",
  //           sameSite: "lax",
  //         });
  //         console.log("🧪 Cookie set for test mode:", cityRecord.id);
  //       }

  //       return res.json({ ...cityRecord, _test: true, testIp: cleanIp });
  //     }

  //     // 🔄 НОВАЯ ЛОГИКА ПРИОРИТЕТОВ

  //     let cityRecord;

  //     // 1. ПРИОРИТЕТ: Ручной выбор региона (region_id из query)
  //     if (manualRegionId) {
  //       console.log(`🎯 MANUAL REGION SELECTION: ${manualRegionId}`);
  //       cityRecord = await prisma.city.findUnique({
  //         where: { id: manualRegionId },
  //       });

  //       if (!cityRecord) {
  //         return res.status(404).json({
  //           error: "Указанный регион не найден в базе",
  //           region_id: manualRegionId,
  //         });
  //       }
  //       console.log(`🎯 Manual region found: ${cityRecord.title}`);
  //     }
  //     // 2. ПРИОРИТЕТ: Регион из куки
  //     else if (req.cookies["region-id"]) {
  //       const regionIdFromCookie = req.cookies["region-id"];
  //       console.log(`🍪 REGION FROM COOKIE: ${regionIdFromCookie}`);

  //       cityRecord = await prisma.city.findUnique({
  //         where: { id: regionIdFromCookie },
  //       });

  //       if (cityRecord) {
  //         console.log(`🍪 Region from cookie found: ${cityRecord.title}`);
  //       } else {
  //         console.log(`🍪 Region from cookie not found, falling back to IP`);
  //         // Если региона из куки нет в базе - продолжаем определение по IP
  //       }
  //     }

  //     // 3. ПРИОРИТЕТ: Определение по IP (если не нашли выше)
  //     if (!cityRecord) {
  //       console.log("📍 DETERMINING REGION BY IP");

  //       // Получаем РЕАЛЬНЫЙ IP пользователя через заголовки
  //       let ip =
  //         req.headers["x-real-ip"] ||
  //         req.headers["x-forwarded-for"]?.split(",")[0] ||
  //         req.connection?.remoteAddress ||
  //         req.socket?.remoteAddress;

  //       console.log("All headers:", req.headers);
  //       console.log("Raw IP from request:", ip);

  //       // Безопасная проверка на внутренние IP
  //       const isInternalIp = (ip) => {
  //         if (!ip) return true;
  //         return (
  //           ip === "::1" ||
  //           ip === "127.0.0.1" ||
  //           ip.startsWith("172.") ||
  //           ip.startsWith("10.") ||
  //           ip.startsWith("192.168.")
  //         );
  //       };

  //       const cleanIp = isInternalIp(ip) ? "5.167.255.255" : ip;
  //       console.log("IP from request:", ip);
  //       console.log("Clean IP:", cleanIp);

  //       // Путь к BIN файлам
  //       const ipv4BinPath = path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "IP2LOCATION-LITE-DB3.BIN"
  //       );
  //       const ipv6BinPath = path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "IP2LOCATION-LITE-DB3.IPV6.BIN"
  //       );
  //       console.log("IPv4 BIN path:", ipv4BinPath);
  //       console.log("IPv6 BIN path:", ipv6BinPath);

  //       // Создаём объекты IP2Location
  //       const ip2loc4 = new ip2location.IP2Location();
  //       const ip2loc6 = new ip2location.IP2Location();

  //       // Открываем BIN файлы
  //       ip2loc4.open(ipv4BinPath);
  //       console.log("IPv4 BIN opened");
  //       ip2loc6.open(ipv6BinPath);
  //       console.log("IPv6 BIN opened");

  //       // Определяем гео через IP2Location
  //       const geo = cleanIp.includes(":")
  //         ? ip2loc6.getAll(cleanIp)
  //         : ip2loc4.getAll(cleanIp);
  //       console.log("Geo info:", geo);

  //       if (!geo || geo.countryLong !== "Russian Federation") {
  //         return res.status(404).json({ error: "Регион не найден (не РФ)" });
  //       }

  //       const regionEn = (geo.region || "").trim();
  //       if (!regionEn) {
  //         return res.status(404).json({ error: "Регион не определён в BIN" });
  //       }

  //       // JSON-маппинг в русские названия
  //       const regionMap = require(path.join(
  //         __dirname,
  //         "data",
  //         "ip2location",
  //         "regionMapEnToRu.json"
  //       ));
  //       const regionRu = regionMap[regionEn] || regionEn;
  //       console.log(`regionEn = ${regionEn}`);
  //       console.log(`regionRu = ${regionRu}`);

  //       // Ищем в базе
  //       cityRecord = await prisma.city.findFirst({
  //         where: {
  //           OR: [
  //             { title: { equals: regionRu, mode: "insensitive" } },
  //             { area: { equals: regionRu, mode: "insensitive" } },
  //           ],
  //         },
  //       });

  //       if (!cityRecord) {
  //         return res.status(404).json({
  //           error: "Регион не найден в базе",
  //           regionEn,
  //           regionRu,
  //         });
  //       }
  //     }

  //     // 🍪 УСТАНОВКА КУКИ (если запрошено)
  //     if (shouldSetCookie) {
  //       const isDevelopment = process.env.NODE_ENV === "development";

  //       res.cookie("region-id", cityRecord.id, {
  //         maxAge: 365 * 24 * 60 * 60 * 1000, // 1 год
  //         httpOnly: true,
  //         secure: !isDevelopment, // false в development, true в production
  //         sameSite: "lax",
  //         domain: isDevelopment ? "localhost" : ".dev-tutorio.ru",
  //         path: "/",
  //       });
  //       console.log("🍪 Cookie set:", cityRecord.id);
  //     }

  //     // ✅ ВОЗВРАЩАЕМ РЕЗУЛЬТАТ
  //     console.log("✅ Final region:", {
  //       id: cityRecord.id,
  //       title: cityRecord.title,
  //       slug: cityRecord.slug,
  //       region_name_dative: cityRecord.region_name_dative,
  //     });
  //     return res.json(cityRecord); // Включая region_name_dative и slug!
  //   } catch (e) {
  //     console.error("detectUserRegion error:", e.message, e.stack);
  //     res.status(500).json({ error: "Ошибка при определении региона" });
  //   }
  // },

  // Новая логика. Кука на фронте. Если не совпадает регион, возвращаем флаг

  detectUserRegion: async (req, res) => {
    try {
      // === Существующий лог — начало
      console.log("=== detectUserRegion START ===");

      // Берём slug (текущий слаг с фронта), и test_ip для тестов
      // Пример запроса: /api/region?slug=spb
      let { test_ip, slug: currentSlug = "" } = req.query;

      // 🔹 Если slug не передан (например dev-tutorio.ru/), то по умолчанию это Москва
      if (!currentSlug || currentSlug.trim() === "") {
        currentSlug = "msk";
      }

      // --- 1) Проверка cookie: если кука есть — возвращаем регион напрямую ---
      const cookieRegionId = req.cookies["region-id"];
      if (cookieRegionId) {
        const cityFromCookie = await prisma.city.findUnique({
          where: { id: cookieRegionId },
        });
        if (cityFromCookie) {
          // Существующий лог оставлен без изменений
          console.log(`🍪 Регион найден в куки: ${cityFromCookie.title}`);
          return res.json({ city: cityFromCookie, askUserConfirmation: false });
        }
      }

      // --- 2) Определяем IP пользователя (или используем test_ip) ---
      let ip =
        test_ip ||
        req.headers["x-real-ip"] ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress;

      // Существующий лог — показываем headers и raw IP как раньше
      console.log("All headers:", req.headers);
      console.log("Raw IP from request:", ip);

      // Внутренние IP заменяем на публичный пример
      const isInternalIp = (ip) =>
        !ip ||
        ip === "::1" ||
        ip === "127.0.0.1" ||
        ip.startsWith("172.") ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.");
      const cleanIp = isInternalIp(ip) ? "5.167.255.255" : ip;

      // Существующие логи про IP
      console.log("IP from request:", ip);
      console.log("Clean IP:", cleanIp);

      // --- 3) IP2Location BIN paths и открытие баз ---
      const ipv4BinPath = path.join(
        __dirname,
        "data",
        "ip2location",
        "IP2LOCATION-LITE-DB3.BIN"
      );
      const ipv6BinPath = path.join(
        __dirname,
        "data",
        "ip2location",
        "IP2LOCATION-LITE-DB3.IPV6.BIN"
      );

      const ip2loc4 = new ip2location.IP2Location();
      const ip2loc6 = new ip2location.IP2Location();

      ip2loc4.open(ipv4BinPath);
      ip2loc6.open(ipv6BinPath);

      // Получаем geo
      const geo = cleanIp.includes(":")
        ? ip2loc6.getAll(cleanIp)
        : ip2loc4.getAll(cleanIp);

      if (!geo || geo.countryLong !== "Russian Federation") {
        return res.status(404).json({ error: "Регион не найден (не РФ)" });
      }

      // --- 4) Маппинг region EN → RU ---
      const regionMap = require(path.join(
        __dirname,
        "data",
        "ip2location",
        "regionMapEnToRu.json"
      ));
      const regionEn = (geo.region || "").trim();
      const regionRu = regionMap[regionEn] || regionEn;

      // Существующие логи
      console.log(`regionEn = ${regionEn}`);
      console.log(`regionRu = ${regionRu}`);

      // --- 5) Поиск в БД (title или area) ---
      const cityRecord = await prisma.city.findFirst({
        where: {
          OR: [
            { title: { equals: regionRu, mode: "insensitive" } },
            { area: { equals: regionRu, mode: "insensitive" } },
          ],
        },
      });

      if (!cityRecord) {
        return res
          .status(404)
          .json({ error: "Регион не найден в базе", regionEn, regionRu });
      }

      // === НОВАЯ ЛОГИКА СРАВНЕНИЯ SLUG — логами с эмодзи
      console.log(
        "🆕 New logic: comparing detected region slug with provided slug from front"
      );
      console.log(
        `🔎 Detected slug: ${cityRecord.slug}, provided slug: "${currentSlug}"`
      );

      // Если пользователь передал slug из фронта:
      // - если provided slug пустой ("/"), то currentSlug === ""
      // - askUserConfirmation = true только если detected.slug !== providedSlug AND providedSlug !== ""
      const askUserConfirmation =
        cityRecord.slug !== currentSlug && currentSlug !== "";

      console.log(`✅ askUserConfirmation = ${askUserConfirmation}`);

      // --- Возвращаем результат (как раньше) ---
      return res.json({ city: cityRecord, askUserConfirmation });
    } catch (e) {
      console.error("detectUserRegion error:", e);
      res.status(500).json({ error: "Ошибка при определении региона" });
    }
  },
};

module.exports = LocationController;
