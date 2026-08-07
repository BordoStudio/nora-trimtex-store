import type { FastifyPluginAsync } from "fastify";
import type { Database } from "../db.js";
import { hashToken, requireUser } from "../auth.js";
import { config } from "../config.js";

type CartBody = { items: Array<Record<string, unknown>> };

export function cartRoutes(db: Database): FastifyPluginAsync {
  return async (app) => {
    app.get("/api/v1/cart", async (request) => {
      const user = await requireUser(db, request);
      const rows = await db<{ items: unknown[]; updatedAt: Date }[]>`select items, updated_at as "updatedAt" from carts where user_id = ${user.id}`;
      return { data: rows[0] ?? { items: [], updatedAt: null } };
    });

    app.put<{ Body: CartBody }>("/api/v1/cart", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request, reply) => {
      const user = await requireUser(db, request);
      if (!Array.isArray(request.body?.items) || request.body.items.length > 100) return reply.code(400).send({ error: "invalid_cart" });
      const country = String(request.headers["cf-ipcountry"] || "").slice(0, 8) || null;
      const userAgent = String(request.headers["user-agent"] || "").slice(0, 500) || null;
      const ipHash = hashToken(`${config.PRIVACY_IP_SALT}:${request.ip}`);
      await db`
        insert into carts (user_id, items, country_code, user_agent, ip_hash, updated_at)
        values (${user.id}, ${db.json(request.body.items as never)}, ${country}, ${userAgent}, ${ipHash}, now())
        on conflict (user_id) do update set items = excluded.items, country_code = excluded.country_code,
          user_agent = excluded.user_agent, ip_hash = excluded.ip_hash, updated_at = now()
      `;
      return { data: { saved: true } };
    });
  };
}
