import assert from "node:assert/strict";
import test from "node:test";
import { config } from "./config.js";
import { sendEmail, sendOwnerNotification } from "./email.js";

test("owner notifications reach both recipients; verification goes only to the customer", async (t) => {
  const original = { key: config.RESEND_API_KEY, to: config.NOTIFICATION_TO_EMAIL, copy: config.NOTIFICATION_COPY_TO_EMAIL };
  config.RESEND_API_KEY = "test-key";
  config.NOTIFICATION_TO_EMAIL = "owner@example.com";
  config.NOTIFICATION_COPY_TO_EMAIL = "copy@example.com";
  const sent: Array<{ to: string[] }> = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response("{}", { status: 200 });
  });
  try {
    assert.equal(await sendOwnerNotification({ subject: "Order", text: "New order", idempotencyKey: "order-1" }), true);
    assert.deepEqual(sent.flatMap(m => m.to), ["owner@example.com", "copy@example.com"]);
    sent.length = 0;
    await sendEmail({ to: "customer@example.com", subject: "Code", text: "123456", idempotencyKey: "verify-1" });
    assert.deepEqual(sent.flatMap(m => m.to), ["customer@example.com"]);
    config.NOTIFICATION_COPY_TO_EMAIL = config.NOTIFICATION_TO_EMAIL;
    sent.length = 0;
    await sendOwnerNotification({ subject: "Order", text: "New order", idempotencyKey: "order-2" });
    assert.equal(sent.length, 1);
  } finally {
    config.RESEND_API_KEY = original.key;
    config.NOTIFICATION_TO_EMAIL = original.to;
    config.NOTIFICATION_COPY_TO_EMAIL = original.copy;
  }
});
