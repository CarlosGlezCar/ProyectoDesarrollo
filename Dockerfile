
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then test -r /etc/secrets/local-production.json || exit 1; ln -sfn /etc/secrets/local-production.json /app/config/local-production.json; fi; exec npm start"]