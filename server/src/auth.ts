import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyRequest } from "fastify";
import type { Database } from "./db.js";
import { config } from "./config.js";

const scrypt = promisify(scryptCallback);

export type AccountRole = "retail" | "partner" | "admin";
export type AccountStatus = "email_pending" | "pending_approval" | "active" | "rejected" | "disabled";
export type AuthUser = {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  firstName: string;
  lastName: string;
  company?: string;
  emailVerifiedAt?: Date;
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const issueToken = () => randomBytes(32).toString("base64url");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltValue, hashValue] = stored.split(":");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const supplied = await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length) as Buffer;
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function bearerToken(request: FastifyRequest): string | undefined {
  const value = request.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : undefined;
}

export async function getSessionUser(db: Database, request: FastifyRequest): Promise<AuthUser | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const rows = await db<AuthUser[]>`
    select u.id, u.email, u.role, u.status,
      u.first_name as "firstName", u.last_name as "lastName", u.company,
      u.email_verified_at as "emailVerifiedAt"
    from auth_sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()
    limit 1
  `;
  if (rows[0]) await db`update auth_sessions set last_seen_at = now() where token_hash = ${hashToken(token)}`;
  return rows[0] ?? null;
}

export async function requireUser(db: Database, request: FastifyRequest): Promise<AuthUser> {
  const user = await getSessionUser(db, request);
  if (!user || user.status !== "active") throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  return user;
}

export async function requireAdmin(db: Database, request: FastifyRequest): Promise<AuthUser> {
  const user = await requireUser(db, request);
  if (user.role !== "admin") throw Object.assign(new Error("Administrator access required"), { statusCode: 403 });
  return user;
}

export async function createSession(db: Database, userId: string, request: FastifyRequest) {
  const token = issueToken();
  const expiresAt = new Date(Date.now() + config.AUTH_SESSION_DAYS * 86_400_000);
  await db`
    insert into auth_sessions (user_id, token_hash, expires_at, user_agent, ip_hash)
    values (${userId}, ${hashToken(token)}, ${expiresAt}, ${String(request.headers["user-agent"] || "").slice(0, 500)},
      ${hashToken(`${config.PRIVACY_IP_SALT}:${request.ip}`)})
  `;
  return { token, expiresAt };
}

export async function ensureAdminUser(db: Database): Promise<void> {
  if (!config.ADMIN_EMAIL || !config.ADMIN_BOOTSTRAP_PASSWORD) return;
  const email = normalizeEmail(config.ADMIN_EMAIL);
  const rows = await db<{ id: string }[]>`select id from users where email = ${email} limit 1`;
  const passwordHash = await hashPassword(config.ADMIN_BOOTSTRAP_PASSWORD);
  if (rows[0]) {
    await db`update users set role = 'admin', status = 'active', email_verified_at = coalesce(email_verified_at, now()), password_hash = ${passwordHash}, updated_at = now() where id = ${rows[0].id}`;
  } else {
    await db`insert into users (email, password_hash, role, status, first_name, last_name, locale, email_verified_at) values (${email}, ${passwordHash}, 'admin', 'active', 'Nora', 'Administrator', 'ru', now())`;
  }
}
