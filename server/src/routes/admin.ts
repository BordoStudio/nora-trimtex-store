import type { FastifyPluginAsync } from "fastify";
import type { Database } from "../db.js";
import { requireAdmin } from "../auth.js";
import { sendEmail } from "../email.js";

export function adminRoutes(db: Database): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Querystring: { status?: string; role?: string; q?: string; search?: string } }>("/api/v1/admin/users", async (request) => {
      await requireAdmin(db, request);
      const status = request.query.status || null;
      const role = request.query.role || null;
      const searchValue = request.query.q || request.query.search;
      const search = searchValue?.trim() ? `%${searchValue.trim()}%` : null;
      const users = await db<Array<Record<string, unknown>>>`
        select u.id, u.email, u.role, u.status, u.first_name as "firstName", u.last_name as "lastName",
          u.phone, u.company, u.country, u.city, u.email_verified_at as "emailVerifiedAt",
          u.last_login_at as "lastLoginAt", u.created_at as "createdAt",
          u.partner_discount_percent::float as "partnerDiscountPercent",
          jsonb_array_length(coalesce(c.items, '[]'::jsonb)) as "cartItems", c.updated_at as "cartUpdatedAt",
          (select count(*)::int from orders o where lower(o.customer ->> 'email') = u.email) as "orders"
        from users u left join carts c on c.user_id = u.id
        where (${status}::text is null or u.status = ${status}) and (${role}::text is null or u.role = ${role})
          and (${search}::text is null or u.email ilike ${search} or u.first_name ilike ${search} or u.last_name ilike ${search} or coalesce(u.company, '') ilike ${search})
        order by case when u.status = 'pending_approval' then 0 else 1 end, u.created_at desc limit 500
      `;
      return { data: { items: users } };
    });

    app.get<{ Params: { id: string } }>("/api/v1/admin/users/:id", async (request, reply) => {
      await requireAdmin(db, request);
      const users = await db<Array<Record<string, unknown>>>`select id, email, role, status, first_name as "firstName", last_name as "lastName", phone, company, country, city, locale, email_verified_at as "emailVerifiedAt", approved_at as "approvedAt", last_login_at as "lastLoginAt", created_at as "createdAt", partner_discount_percent::float as "partnerDiscountPercent" from users where id = ${request.params.id}`;
      if (!users[0]) return reply.code(404).send({ error: "not_found" });
      const carts = await db`select items, country_code as "countryCode", user_agent as "userAgent", updated_at as "updatedAt" from carts where user_id = ${request.params.id}`;
      const orders = await db`select order_number as "orderNumber", items, status, priced_subtotal_usd as "subtotal", created_at as "createdAt" from orders where lower(customer ->> 'email') = ${String(users[0].email).toLowerCase()} order by created_at desc`;
      const sessions = await db`select country_code as "countryCode", region, city, user_agent as "userAgent", referrer, last_seen_at as "lastSeenAt", created_at as "createdAt" from auth_sessions where user_id = ${request.params.id} order by last_seen_at desc limit 30`;
      const connectedAccounts = await db`select provider, provider_email as "providerEmail", display_name as "displayName", created_at as "createdAt" from connected_accounts where user_id = ${request.params.id} order by created_at desc`;
      return { data: { user: users[0], cart: carts[0] ?? { items: [] }, orders, sessions, connectedAccounts } };
    });

    app.patch<{ Params: { id: string }; Body: { action?: "approve" | "reject" | "disable"; status?: "active" | "rejected" | "disabled" } }>("/api/v1/admin/users/:id/status", async (request, reply) => {
      const admin = await requireAdmin(db, request);
      const action = request.body?.action || (request.body?.status === "active" ? "approve" : request.body?.status === "rejected" ? "reject" : request.body?.status === "disabled" ? "disable" : undefined);
      if (!action || !["approve", "reject", "disable"].includes(action)) return reply.code(400).send({ error: "invalid_action" });
      const rows = await db<{ email: string; firstName: string; locale: string; role: string }[]>`select email, first_name as "firstName", locale, role from users where id = ${request.params.id}`;
      const user = rows[0];
      if (!user) return reply.code(404).send({ error: "not_found" });
      if (action === "approve" && user.role !== "partner") return reply.code(400).send({ error: "not_partner" });
      const status = action === "approve" ? "active" : action === "reject" ? "rejected" : "disabled";
      await db`update users set status = ${status}, approved_at = ${action === "approve" ? new Date() : null}, approved_by = ${action === "approve" ? admin.id : null}, updated_at = now() where id = ${request.params.id}`;
      if (action === "approve") await sendEmail({ to: user.email, subject: "Nora TrimTex — partner account approved", text: `Hello ${user.firstName}, your Nora TrimTex partner account is approved. You can now sign in and view wholesale prices.`, idempotencyKey: `partner-approved-${request.params.id}` }).catch(() => false);
      return { data: { status } };
    });

    app.patch<{ Params: { id: string }; Body: { partnerDiscountPercent?: number } }>("/api/v1/admin/users/:id/pricing", async (request, reply) => {
      await requireAdmin(db, request);
      const discount = Number(request.body?.partnerDiscountPercent);
      if (!Number.isFinite(discount) || discount < 0 || discount > 80) return reply.code(400).send({ error: "invalid_discount" });
      const rows = await db<{ id: string }[]>`update users set partner_discount_percent = ${discount}, updated_at = now() where id = ${request.params.id} and role = 'partner' returning id`;
      if (!rows[0]) return reply.code(404).send({ error: "partner_not_found" });
      return { data: { partnerDiscountPercent: discount } };
    });

    app.get<{ Querystring: { q?: string; page?: string } }>("/api/v1/admin/products", async (request) => {
      await requireAdmin(db, request);
      const search = request.query.q?.trim() ? `%${request.query.q.trim()}%` : null;
      const page = Math.max(1, Number(request.query.page || 1));
      const limit = 100;
      const offset = (page - 1) * limit;
      const items = await db<Array<Record<string, unknown>>>`
        select p.id, p.sku, p.slug, p.category_id as "categoryId", p.names,
          p.price_usd::float as "priceUsd", p.status, p.primary_image_key as "imageKey", p.updated_at as "updatedAt"
        from products p
        where (${search}::text is null or p.sku ilike ${search} or coalesce(p.names ->> 'ru', p.names ->> 'en', '') ilike ${search})
        order by p.sku asc limit ${limit} offset ${offset}
      `;
      const totals = await db<{ total: number }[]>`select count(*)::int as total from products p where (${search}::text is null or p.sku ilike ${search} or coalesce(p.names ->> 'ru', p.names ->> 'en', '') ilike ${search})`;
      return { data: { items, page, total: totals[0]?.total ?? 0 } };
    });

    app.patch<{ Params: { id: string }; Body: { priceUsd?: number | null } }>("/api/v1/admin/products/:id/price", async (request, reply) => {
      await requireAdmin(db, request);
      const raw = request.body?.priceUsd;
      const price = raw === null || raw === undefined ? null : Number(raw);
      if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000)) return reply.code(400).send({ error: "invalid_price" });
      const rows = await db<{ id: string }[]>`update products set price_usd = ${price}, updated_at = now() where id = ${request.params.id} returning id`;
      if (!rows[0]) return reply.code(404).send({ error: "product_not_found" });
      return { data: { priceUsd: price } };
    });

    app.get("/api/v1/admin/activity", async (request) => {
      await requireAdmin(db, request);
      const sessions = await db`
        select s.user_id as "userId", u.email, u.first_name as "firstName", u.last_name as "lastName",
          s.country_code as "countryCode", s.region, s.city, s.user_agent as "userAgent", s.referrer,
          s.created_at as "createdAt", s.last_seen_at as "lastSeenAt"
        from auth_sessions s join users u on u.id = s.user_id
        order by s.last_seen_at desc limit 200
      `;
      return { data: { sessions } };
    });
  };
}
