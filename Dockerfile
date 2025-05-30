FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN ls

RUN npm run build

RUN npm install -g serve

EXPOSE 3000
CMD [ "serve", "-s", "dist" ]