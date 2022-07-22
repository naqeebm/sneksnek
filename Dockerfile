# Dockerfile
FROM node:11.15.0-alpine

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 8080
CMD npm run start