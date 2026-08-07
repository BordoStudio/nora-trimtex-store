FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
RUN pnpm install --frozen-lockfile
COPY server server
RUN pnpm --dir server build
RUN pnpm deploy --filter @nora-trimtex/api --prod /api
RUN cp -R server/dist /api/dist

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /api ./
USER node
EXPOSE 4000
CMD ["node", "dist/start.js"]
