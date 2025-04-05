FROM node:22 AS base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm ci

COPY . .

FROM base AS production

ENV NODE_PATH=./build

RUN npm run build

CMD ["node", "build/src/index.js"]
