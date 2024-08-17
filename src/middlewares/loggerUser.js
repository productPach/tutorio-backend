const loggerUser = (request, response, next) => {
  console.log(`Запрос пользователя`);
  next();
};

module.exports = loggerUser;
