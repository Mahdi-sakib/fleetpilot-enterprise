# Builds just the API (server/) — the frontend is a separate static deploy.
# Node 24 for a mature node:sqlite (this app deliberately avoids native
# modules like better-sqlite3 so no C++ toolchain is needed anywhere).
FROM node:24-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

COPY server ./server

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server/src/index.js"]
