FROM node:14-alpine
WORKDIR /app
RUN apk add chromium python3 && ln -sf python3 /usr/bin/python
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD npm run master