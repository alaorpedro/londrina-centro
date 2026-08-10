FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# --include=dev é obrigatório: o Coolify injeta as variáveis do app como ARG no
# build, e um NODE_ENV=production faria o npm pular as devDependencies — aí o
# tsc some e o build quebra com "sh: tsc: not found".
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3000
CMD ["node", "server/index.js"]
