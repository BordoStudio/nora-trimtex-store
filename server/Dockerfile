FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
RUN pnpm install --frozen-lockfile
COPY server server
COPY data/catalog.full.json data/catalog.full.json
COPY data/catalog.samples.json data/catalog.samples.json
COPY data/migration/catalog.postgres.json data/migration/catalog.postgres.json
RUN pnpm --dir server build
RUN pnpm deploy --filter @nora-trimtex/api --prod /api
RUN cp -R server/dist /api/dist
RUN mkdir -p /api/data/migration \
  && cp data/catalog.full.json /api/data/catalog.full.json \
  && cp data/catalog.samples.json /api/data/catalog.samples.json \
  && cp data/migration/catalog.postgres.json /api/data/migration/catalog.postgres.json

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /api ./
USER node
EXPOSE 4000
CMD ["node", "dist/start.js"]
