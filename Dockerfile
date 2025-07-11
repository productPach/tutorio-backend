# Используем стабильный образ линукс Alpine с версией Node.js 18
FROM node:20-alpine

# Указываем нашу рабочую директорию
WORKDIR /app

# Устанавливаем OpenSSL
RUN apk update && apk add --no-cache openssl

RUN apk add --no-cache bash

# Скопировать package.json и package-lock.json внутрь контейнера
COPY package*.json ./

# Обновляем npm до последней версии
RUN npm install -g npm@latest

# Устанавливаем зависимости
RUN npm install

# Копируем оставшееся приложение в контейнер
COPY . .

# Установить Prisma
RUN npm install -g prisma

# Генерируем Prisma client (после того, как схема уже скопирована)
RUN npx prisma generate

# Копируем скрипт ожидания MongoDB
COPY wait-for-it.sh /wait-for-it.sh

# Делаем скрипт исполняемым
RUN chmod +x /wait-for-it.sh

# Открываем порт в нашем контейнере
EXPOSE 3000

# Запускаем сервер
CMD ["npm", "start"]