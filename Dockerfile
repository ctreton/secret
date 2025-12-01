FROM node:25-bookworm

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Régénérer le client Prisma pour prendre en compte les modifications du schéma
RUN npx prisma generate

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]