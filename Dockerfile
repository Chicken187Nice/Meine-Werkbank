FROM node:22-alpine
RUN apk add --no-cache openssl tzdata
WORKDIR /app
COPY server.js jellyfin.js ./
COPY public ./public
ENV PORT=8080 HTTPS_PORT=8443 DATA_DIR=/data TZ=Europe/Berlin NODE_ENV=production
RUN mkdir -p /data && chown -R node:node /data /app
VOLUME /data
EXPOSE 8080 8443
USER node
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server.js"]
