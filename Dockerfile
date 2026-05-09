FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Cloud Run automatically sets the PORT environment variable to 8080
EXPOSE 8080
CMD ["node", "server.js"]
