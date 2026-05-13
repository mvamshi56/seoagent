FROM node:20-bookworm
RUN npx -y playwright@1.59.1 install --with-deps chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 10000
ENV PORT=10000
CMD ["npm", "start"]
