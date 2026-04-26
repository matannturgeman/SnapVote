FROM node:20-slim

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y --no-install-recommends openssl libssl3 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm nx build api

CMD ["node", "dist/api/main.js"]