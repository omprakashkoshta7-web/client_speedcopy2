FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY shared ./shared
COPY services/commerce-service/server.js ./services/commerce-service/server.js
COPY services/commerce-service/bundle.config.js ./services/commerce-service/bundle.config.js
COPY services/commerce-service/components ./services/commerce-service/components
RUN ln -s /app/shared /app/services/commerce-service/shared
RUN cd /app/services/commerce-service/components/product-service && npm ci --omit=dev \
    && cd /app/services/commerce-service/components/order-service && npm ci --omit=dev \
    && cd /app/services/commerce-service/components/payment-service && npm ci --omit=dev \
    && cd /app/services/commerce-service/components/delivery-service && npm ci --omit=dev \
    && cd /app/services/commerce-service/components/finance-service && npm ci --omit=dev

EXPOSE 8080
CMD ["node", "services/commerce-service/server.js"]
