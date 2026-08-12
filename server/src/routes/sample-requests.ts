import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { locales, type Locale, type SampleRequestDocument } from "../domain/types.js";
import type { SampleRequestRepository } from "../repositories.js";
import { sendEmail, sendOwnerNotification } from "../email.js";
import { sampleConfirmationEmail } from "../email-templates.js";

type SampleRequestBody = {
  locale: Locale;
  customer: { name: string; email: string; company?: string; phone?: string };
  items: Array<{ productId: string; sku: string; variantId?: string; quantity: number }>;
  notes?: string;
};

export function sampleRequestRoutes(repository: SampleRequestRepository): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: SampleRequestBody }>("/api/v1/sample-requests", {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["locale", "customer", "items"],
          additionalProperties: false,
          properties: {
            locale: { type: "string", enum: [...locales] },
            customer: {
              type: "object",
              required: ["name", "email"],
              additionalProperties: false,
              properties: {
                name: { type: "string", minLength: 2, maxLength: 120 },
                email: { type: "string", format: "email", maxLength: 200 },
                company: { type: "string", maxLength: 160 },
                phone: { type: "string", maxLength: 60 },
              },
            },
            items: {
              type: "array",
              minItems: 1,
              maxItems: 50,
              items: {
                type: "object",
                required: ["productId", "sku", "quantity"],
                additionalProperties: false,
                properties: {
                  productId: { type: "string", minLength: 1, maxLength: 80 },
                  sku: { type: "string", minLength: 1, maxLength: 80 },
                  variantId: { type: "string", maxLength: 80 },
                  quantity: { type: "integer", minimum: 1, maximum: 20 },
                },
              },
            },
            notes: { type: "string", maxLength: 2_000 },
          },
        },
      },
    }, async (request, reply) => {
      const now = new Date();
      const requestNumber = `SR-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const document: SampleRequestDocument = {
        requestNumber,
        locale: request.body.locale,
        customer: request.body.customer,
        items: request.body.items,
        notes: request.body.notes,
        status: "new",
        guestId: String(request.headers["x-guest-id"] || "").match(/^[A-Za-z0-9_-]{16,80}$/)?.[0],
        createdAt: now,
        updatedAt: now,
      };
      await repository.create(document);
      const ownerText = [
        `New Nora TrimTex sample request ${requestNumber}`,
        `Customer: ${request.body.customer.name}`,
        `Email: ${request.body.customer.email}`,
        `Phone: ${request.body.customer.phone || "—"}`,
        `Company: ${request.body.customer.company || "—"}`,
        request.body.notes ? `Notes: ${request.body.notes}` : "",
        "",
        ...request.body.items.map((item) => `${item.sku}${item.variantId ? ` · ${item.variantId}` : ""} × ${item.quantity}`),
      ].filter(Boolean).join("\n");
      const customerMessage = sampleConfirmationEmail(
        request.body.locale,
        request.body.customer.name,
        requestNumber,
        request.body.items.reduce((sum, item) => sum + item.quantity, 0),
      );
      const results = await Promise.allSettled([
        sendOwnerNotification({ subject: `[Nora TrimTex] New sample request ${requestNumber}`, text: ownerText, replyTo: request.body.customer.email, idempotencyKey: `sample-owner-${requestNumber}` }),
        sendEmail({ to: request.body.customer.email, ...customerMessage, idempotencyKey: `sample-customer-${requestNumber}` }),
      ]);
      results.forEach((result, index) => { if (result.status === "rejected") request.log.error(result.reason, index === 0 ? "Owner sample notification failed" : "Customer sample confirmation failed"); });
      return reply.code(201).send({ data: { requestNumber, status: document.status } });
    });
  };
}
