FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY shared ./shared
COPY services/design-notification-service/components/design-service/package*.json ./services/design-notification-service/components/design-service/
COPY services/design-notification-service/components/design-service/src ./services/design-notification-service/components/design-service/src

RUN ln -s /app/shared /app/services/design-notification-service/shared \
    && cd /app/services/design-notification-service/components/design-service \
    && npm ci --omit=dev

EXPOSE 8080
WORKDIR /app/services/design-notification-service/components/design-service

CMD ["node", "src/server.js"]
