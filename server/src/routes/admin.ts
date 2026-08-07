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
          u.last_login_at as "lastLoginAt", u.created_at as "createdAt", jsonb_array_length(coalesce(c.items, '[]'::jsonb)) as "cartItems", c.updated_at as "cartUpdatedAt",
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
      const users = await db<Array<Record<string, unknown>>>`select id, email, role, status, first_name as "firstName", last_name as "lastName", phone, company, country, city, locale, email_verified_at as "emailVerifiedAt", approved_at as "approvedAt", last_login_at as "lastLoginAt", created_at as "createdAt" from users where id = ${request.params.id}`;
      if (!users[0]) return reply.code(404).send({ error: "not_found" });
      const carts = await db`select items, country_code as "countryCode", user_agent as "userAgent", updated_at as "updatedAt" from carts where user_id = ${request.params.id}`;
      const orders = await db`select order_number as "orderNumber", items, status, priced_subtotal_usd as "subtotal", created_at as "createdAt" from orders where lower(customer ->> 'email') = ${String(users[0].email).toLowerCase()} order by created_at desc`;
      return { data: { user: users[0], cart: carts[0] ?? { items: [] }, orders } };
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
  };
}
