ARG SERVICE_PACKAGE
ARG SERVICE_NAME
ARG SERVICE_PORT

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS pruner
ARG SERVICE_PACKAGE
RUN npm install -g turbo@2
COPY . .
RUN turbo prune ${SERVICE_PACKAGE} --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN npm ci
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build
RUN mkdir -p packages/shared-types/dist packages/logger/dist packages/db/dist packages/auth-middleware/dist packages/storage/dist

FROM base AS runner
ARG SERVICE_NAME
ARG SERVICE_PORT
ENV SERVICE_PORT=${SERVICE_PORT}

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

ENV NODE_ENV=production

COPY --from=pruner /app/out/json/ .
RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared-types/dist/ packages/shared-types/dist/
COPY --from=builder /app/packages/logger/dist/ packages/logger/dist/
COPY --from=builder /app/packages/db/dist/ packages/db/dist/
COPY --from=builder /app/packages/auth-middleware/dist/ packages/auth-middleware/dist/
COPY --from=builder /app/packages/storage/dist/ packages/storage/dist/
COPY --from=builder /app/apps/${SERVICE_NAME}/dist/ apps/${SERVICE_NAME}/dist/

USER appuser

EXPOSE ${SERVICE_PORT}
WORKDIR /app/apps/${SERVICE_NAME}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${SERVICE_PORT}/api/health || exit 1

CMD ["node", "dist/server.js"]
