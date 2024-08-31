# Исользуем образ линукс Alpine с версией node 14
FROM node:19.5.0-alpine

# Указываем нашу рабочую директорию
WORKDIR /app

# Скопировать package.json и package-lock.json внутрь контейнера
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем оставшееся приложение в контейнер
COPY . .

# Установить Prisma
RUN npm install -g prisma

# Генерируем Prisma client
RUN prisma generate

# Копируем Prisma schema
COPY prisma/schema.prisma ./prisma/

# Открываем порт в нашем контейнере
EXPOSE 3000

# Запускаем сервер
CMD ["npm", "start"]