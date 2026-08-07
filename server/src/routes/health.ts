import type { FastifyPluginAsync } from "fastify";

export function healthRoutes(databaseHealth: () => Promise<void>): FastifyPluginAsync {
  return async (app) => {
    app.get("/health", async () => ({ status: "ok", service: "nora-trimtex-api" }));

    app.get("/ready", async (_request, reply) => {
      try {
        await databaseHealth();
        return { status: "ready", database: "connected" };
      } catch {
        return reply.code(503).send({ status: "unavailable", database: "disconnected" });
      }
    });
  };
}
