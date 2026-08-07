import type { FastifyPluginAsync } from "fastify";
import type { Database } from "../db.js";
import { config } from "../config.js";
import { createSession, getSessionUser, hashPassword, hashToken, issueToken, normalizeEmail, verifyPassword } from "../auth.js";
import { sendEmail, sendOwnerNotification } from "../email.js";

type RegisterBody = {
  accountType: "retail" | "partner";
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  country?: string;
  city?: string;
  locale: "en" | "de" | "uk" | "ru";
};

const copy = {
  ru: { subject: "Подтвердите email — Nora TrimTex", hello: "Здравствуйте", action: "Подтвердить email", note: "Ссылка действует 24 часа." },
  uk: { subject: "Підтвердьте email — Nora TrimTex", hello: "Вітаємо", action: "Підтвердити email", note: "Посилання діє 24 години." },
  de: { subject: "E-Mail bestätigen — Nora TrimTex", hello: "Guten Tag", action: "E-Mail bestätigen", note: "Der Link ist 24 Stunden gültig." },
  en: { subject: "Confirm your email — Nora TrimTex", hello: "Hello", action: "Confirm email", note: "This link is valid for 24 hours." },
} as const;

export function authRoutes(db: Database): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: RegisterBody }>("/api/v1/auth/register", { config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (request, reply) => {
      const body = request.body;
      if (!body || !["retail", "partner"].includes(body.accountType) || !body.email || !body.password || body.password.length < 10 || !body.firstName || !body.lastName || (body.accountType === "partner" && !body.company?.trim())) {
        return reply.code(400).send({ error: "invalid_registration" });
      }
      const email = normalizeEmail(body.email);
      const existing = await db<{ id: string }[]>`select id from users where email = ${email} limit 1`;
      if (existing[0]) return reply.code(409).send({ error: "email_already_registered" });

      const passwordHash = await hashPassword(body.password);
      const rows = await db<{ id: string }[]>`
        insert into users (email, password_hash, role, status, first_name, last_name, phone, company, country, city, locale)
        values (${email}, ${passwordHash}, ${body.accountType}, 'email_pending', ${body.firstName.trim()}, ${body.lastName.trim()},
          ${body.phone?.trim() || null}, ${body.company?.trim() || null}, ${body.country?.trim() || null}, ${body.city?.trim() || null}, ${body.locale})
        returning id
      `;
      const token = issueToken();
      await db`insert into auth_tokens (user_id, token_hash, purpose, expires_at) values (${rows[0]!.id}, ${hashToken(token)}, 'verify_email', now() + interval '24 hours')`;
      const text = copy[body.locale];
      const link = `${config.STOREFRONT_URL}/${body.locale}/account/verify?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: text.subject,
        text: `${text.hello}, ${body.firstName}!\n\n${text.action}: ${link}\n\n${text.note}`,
        html: `<p>${text.hello}, ${body.firstName}!</p><p><a href="${link}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#b99553;color:#30221b;text-decoration:none">${text.action}</a></p><p>${text.note}</p>`,
        idempotencyKey: `verify-${rows[0]!.id}`,
      });
      return reply.code(201).send({ data: { status: "email_pending" } });
    });

    app.post<{ Body: { token: string } }>("/api/v1/auth/verify-email", async (request, reply) => {
      const tokenHash = hashToken(request.body?.token || "");
      const rows = await db<{ id: string; userId: string; role: "retail" | "partner"; email: string }[]>`
        select t.id, t.user_id as "userId", u.role, u.email from auth_tokens t join users u on u.id = t.user_id
        where t.token_hash = ${tokenHash} and t.purpose = 'verify_email' and t.used_at is null and t.expires_at > now() limit 1
      `;
      const record = rows[0];
      if (!record) return reply.code(400).send({ error: "invalid_or_expired_token" });
      const nextStatus = record.role === "partner" ? "pending_approval" : "active";
      await db.begin(async (transaction) => {
        await transaction`update auth_tokens set used_at = now() where id = ${record.id}`;
        await transaction`update users set email_verified_at = now(), status = ${nextStatus}, updated_at = now() where id = ${record.userId}`;
      });
      if (record.role === "partner") {
        await sendOwnerNotification({ subject: "[Nora TrimTex] New partner approval", text: `Partner ${record.email} confirmed the email and is waiting for approval.\n${config.ADMIN_URL}`, idempotencyKey: `partner-${record.userId}` }).catch(() => false);
      }
      return { data: { status: nextStatus } };
    });

    app.post<{ Body: { email: string; password: string } }>("/api/v1/auth/login", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (request, reply) => {
      const email = normalizeEmail(request.body?.email || "");
      const rows = await db<Array<{ id: string; email: string; passwordHash: string; role: string; status: string; firstName: string; lastName: string }>>`
        select id, email, password_hash as "passwordHash", role, status, first_name as "firstName", last_name as "lastName" from users where email = ${email} limit 1
      `;
      const user = rows[0];
      if (!user) return reply.code(404).send({ error: "account_not_found" });
      if (!(await verifyPassword(request.body?.password || "", user.passwordHash))) return reply.code(401).send({ error: "invalid_credentials" });
      if (user.status !== "active") return reply.code(403).send({ error: "account_not_active", status: user.status });
      const session = await createSession(db, user.id, request);
      await db`update users set last_login_at = now(), updated_at = now() where id = ${user.id}`;
      return { data: { ...session, user: { id: user.id, email: user.email, role: user.role, status: user.status, firstName: user.firstName, lastName: user.lastName } } };
    });

    app.post("/api/v1/auth/logout", async (request) => {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (token) await db`delete from auth_sessions where token_hash = ${hashToken(token)}`;
      return { data: { success: true } };
    });

    app.get("/api/v1/auth/me", async (request, reply) => {
      const user = await getSessionUser(db, request);
      if (!user || user.status !== "active") return reply.code(401).send({ error: "unauthorized" });
      return { data: { user } };
    });
  };
}
