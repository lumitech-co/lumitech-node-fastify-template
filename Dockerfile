FROM node:22 AS base

WORKDIR /home/node/app

COPY package*.json .npmrc ./

# npm >= 11.10 is required by devEngines (enforces min-release-age from .npmrc)
RUN npm install -g npm@11.19.1

RUN npm ci

COPY . .

FROM base AS production

ENV NODE_PATH=./build

RUN npm run build

CMD ["node", "build/src/index.js"]
