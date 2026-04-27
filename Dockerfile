FROM node:20-slim

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y --no-install-recommends openssl libssl3 libssl1.1 || apt-get install -y --no-install-recommends openssl libssl3 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm nx build api

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/api/main.js"]