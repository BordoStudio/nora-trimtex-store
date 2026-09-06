import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type { MongoDatabase } from "./mongo.js";
import { authRoutes } from "./routes/auth.js";
import { verifyPassword } from "./auth.js";

test("partner registration accepts name, email and password without company or address", async () => {
  const saved: Record<string, unknown>[] = [];
  const db = { collection: () => ({ findOne: async () => null, updateMany: async () => ({}), insertOne: async (record: Record<string, unknown>) => { saved.push(record); return {}; } }) } as unknown as MongoDatabase;
  const app = Fastify();
  await app.register(authRoutes(db));
  try {
    const result = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { accountType: "partner", firstName: "Test", lastName: "Designer", email: "designer@example.com", password: "test-password-123", locale: "en" } });
    assert.equal(result.statusCode, 201);
    assert.equal(saved[0]?.role, "partner");
    assert.equal(saved[0]?.status, "email_pending");
    assert.equal(await verifyPassword("test-password-123", String(saved[0]?.passwordHash)), true);
    const invalid = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { accountType: "partner", firstName: "Test", lastName: "Designer", email: "designer@example.com", locale: "en" } });
    assert.equal(invalid.statusCode, 400);
  } finally { await app.close(); }
});
