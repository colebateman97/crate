FROM node:22-alpine
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["sh", "-c", "npx vite preview --host --port ${PORT:-3000}"]
