FROM node:22-alpine
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve@14
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
