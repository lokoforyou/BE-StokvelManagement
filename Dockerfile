FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Cloud Run automatically sets the PORT environment variable
ENV PORT 3000
EXPOSE 3000
CMD ["node", "server.js"]
