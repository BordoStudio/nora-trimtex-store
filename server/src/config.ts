import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4001),
  MONGODB_URI: z.string().min(1),
  MONGODB_DATABASE: z.string().regex(/^[A-Za-z0-9_-]+$/).default("nora_trimtex"),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(30).default(10),
  CORS_ORIGINS: z.string().default("http://localhost:4000"),
  ASSETS_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  INTERNAL_API_KEY: z.string().min(24).optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("nora-trimtex-assets"),
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_FROM_EMAIL: z.string().default("Nora TrimTex <info@noratrim.com>"),
  NOTIFICATION_TO_EMAIL: z.string().email().default("info@noratrim.com"),
  STOREFRONT_URL: z.string().url().default("http://localhost:4000"),
  ADMIN_URL: z.string().url().default("http://localhost:4000/admin"),
  AUTH_SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  PRIVACY_IP_SALT: z.string().min(16).default("development-only-change-me"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(10).optional(),
});

export const config = schema.parse(process.env);
export const corsOrigins = config.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
