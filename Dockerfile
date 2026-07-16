FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY bussin-frontend/package.json ./bussin-frontend/package.json
COPY bussin-server/package.json ./bussin-server/package.json
COPY bussin-shared/package.json ./bussin-shared/package.json

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]
