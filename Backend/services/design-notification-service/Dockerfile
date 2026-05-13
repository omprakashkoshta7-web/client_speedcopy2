FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY shared ./shared
COPY services/design-notification-service/server.js ./services/design-notification-service/server.js
COPY services/design-notification-service/bundle.config.js ./services/design-notification-service/bundle.config.js
COPY services/design-notification-service/components ./services/design-notification-service/components
RUN ln -s /app/shared /app/services/design-notification-service/shared
RUN cd /app/services/design-notification-service/components/design-service && npm ci --omit=dev \
    && cd /app/services/design-notification-service/components/notification-service && npm ci --omit=dev

EXPOSE 8080
CMD ["node", "services/design-notification-service/server.js"]
