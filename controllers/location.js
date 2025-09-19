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
                type: district.type,
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
  // updateCityById: async (req, res) => {
  //   const { id } = req.params;
  //   const { title, area, shortTitle } = req.body;

  //   if (!id) {
  //     return res
  //       .status(400)
  //       .json({ error: "ID города является обязательным полем" });
  //   }

  //   if (!title || !area || !shortTitle) {
  //     return res.status(400).json({
  //       error: "Поля title, area и shortTitle являются обязательными",
  //     });
  //   }

  //   try {
  //     // 🔒 Проверка: является ли пользователь сотрудником (админом)
  //     const userId = req.user.userID;
  //     const isAdmin = await prisma.employee.findUnique({
  //       where: { userId },
  //     });

  //     if (!isAdmin) {
  //       return res
  //         .status(403)
  //         .json({ error: "Доступ запрещён: только для сотрудников" });
  //     }
  //     // Проверяем существование города
  //     const existingCity = await prisma.city.findUnique({ where: { id } });

  //     if (!existingCity) {
  //       return res.status(404).json({ error: "Город не найден" });
  //     }

  //     // Обновляем только необходимые поля
  //     const updatedCity = await prisma.city.update({
  //       where: { id },
  //       data: {
  //         title,
  //         area,
  //         shortTitle,
  //       },
  //     });

  //     res.status(200).json({
  //       message: "Город успешно обновлен",
  //       city: updatedCity,
  //     });
  //   } catch (error) {
  //     console.error("Ошибка при обновлении города:", error);
  //     res.status(500).json({ error: "Внутренняя ошибка сервера" });
  //   }
  // },
  updateCityById: async (req, res) => {
    const { id } = req.params;
    const { title, area, shortTitle, districts, regionalCities } = req.body;

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
          districts: { include: { metros: true } },
          regionalCities: true,
        },
      });

      if (!existingCity) {
        return res.status(404).json({ error: "Город не найден" });
      }

      // Обновляем сам город
      const updatedCity = await prisma.city.update({
        where: { id },
        data: { title, area, shortTitle },
      });

      // Обновление districts
      if (districts?.length) {
        for (const district of districts) {
          if (district.id) {
            // Обновляем существующий район
            await prisma.district.update({
              where: { id: district.id },
              data: {
                title: district.title,
                type: district.type,
                // Обновляем или создаем метро
                metros: {
                  upsert:
                    district.metros?.map((metro) => ({
                      where: { id: metro.id || 0 }, // если есть id, обновляем; иначе создаем
                      update: {
                        title: metro.title,
                        color: metro.color || null,
                        lineName: metro.lineName || null,
                        lineNumber: metro.lineNumber || null,
                      },
                      create: {
                        title: metro.title,
                        color: metro.color || null,
                        lineName: metro.lineName || null,
                        lineNumber: metro.lineNumber || null,
                      },
                    })) || [],
                },
              },
            });
          } else {
            // Создаем новый район
            await prisma.district.create({
              data: {
                title: district.title,
                type: district.type,
                cityId: id,
                metros: {
                  create:
                    district.metros?.map((metro) => ({
                      title: metro.title,
                      color: metro.color || null,
                      lineName: metro.lineName || null,
                      lineNumber: metro.lineNumber || null,
                    })) || [],
                },
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

      // Возвращаем полный объект города
      const fullCity = await prisma.city.findUnique({
        where: { id },
        include: {
          districts: { include: { metros: true } },
          regionalCities: true,
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
    const { title, type, metros } = req.body;

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
              type,
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
};

module.exports = LocationController;
