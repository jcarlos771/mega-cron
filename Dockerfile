FROM node:20-alpine
WORKDIR /app
COPY package.json worker.js ./
CMD ["node", "worker.js"]
