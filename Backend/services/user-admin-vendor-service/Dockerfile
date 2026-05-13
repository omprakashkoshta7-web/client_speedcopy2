FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY shared ./shared
COPY services/user-admin-vendor-service/server.js ./services/user-admin-vendor-service/server.js
COPY services/user-admin-vendor-service/bundle.config.js ./services/user-admin-vendor-service/bundle.config.js
COPY services/user-admin-vendor-service/components ./services/user-admin-vendor-service/components
RUN ln -s /app/shared /app/services/user-admin-vendor-service/shared
RUN cd /app/services/user-admin-vendor-service/components/auth-service && npm ci --omit=dev \
    && cd /app/services/user-admin-vendor-service/components/user-service && npm ci --omit=dev \
    && cd /app/services/user-admin-vendor-service/components/admin-service && npm ci --omit=dev \
    && cd /app/services/user-admin-vendor-service/components/vendor-service && npm ci --omit=dev

EXPOSE 8080
CMD ["node", "services/user-admin-vendor-service/server.js"]
