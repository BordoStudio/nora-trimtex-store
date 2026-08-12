import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { locales, type Locale, type OrderDocument } from "../domain/types.js";
import type { OrderRepository } from "../repositories.js";
import { sendEmail, sendOwnerNotification } from "../email.js";
import { orderConfirmationEmail } from "../email-templates.js";

type OrderBody = {
  locale: Locale;
  customer: { name: string; email: string; phone: string; company?: string; country: string; city: string; address: string; postcode: string; notes?: string };
  items: Array<{ productId: string; sku: string; name?: string; slug?: string; categoryId?: string; variantId?: string; variantLabel?: string; unitPriceUsd?: number; quantity: number }>;
};

export function orderRoutes(repository: OrderRepository): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: OrderBody }>("/api/v1/orders", {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["locale", "customer", "items"],
          additionalProperties: true,
          properties: {
            locale: { type: "string", enum: [...locales] },
            customer: {
              type: "object",
              required: ["name", "email", "phone", "country", "city", "address", "postcode"],
              additionalProperties: false,
              properties: {
                name: { type: "string", minLength: 2, maxLength: 120 },
                email: { type: "string", format: "email", maxLength: 200 },
                phone: { type: "string", minLength: 5, maxLength: 60 },
                company: { type: "string", maxLength: 160 },
                country: { type: "string", minLength: 2, maxLength: 100 },
                city: { type: "string", minLength: 2, maxLength: 120 },
                address: { type: "string", minLength: 3, maxLength: 240 },
                postcode: { type: "string", minLength: 2, maxLength: 30 },
                notes: { type: "string", maxLength: 2_000 },
              },
            },
            items: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: {
                type: "object",
                required: ["productId", "sku", "quantity"],
                additionalProperties: true,
                properties: {
                  productId: { type: "string", minLength: 1, maxLength: 80 },
                  sku: { type: "string", minLength: 1, maxLength: 80 },
                  name: { type: "string", maxLength: 240 },
                  slug: { type: "string", maxLength: 240 },
                  categoryId: { type: "string", maxLength: 80 },
                  variantId: { type: "string", maxLength: 80 },
                  variantLabel: { type: "string", maxLength: 120 },
                  unitPriceUsd: { type: "number", minimum: 0, maximum: 1_000_000 },
                  quantity: { type: "integer", minimum: 1, maximum: 10_000 },
                },
              },
            },
          },
        },
      },
    }, async (request, reply) => {
      const now = new Date();
      const orderNumber = `LTX-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const document: OrderDocument = {
        orderNumber,
        locale: request.body.locale,
        customer: request.body.customer,
        items: request.body.items,
        pricedSubtotalUsd: 0,
        status: "received",
        guestId: String(request.headers["x-guest-id"] || "").match(/^[A-Za-z0-9_-]{16,80}$/)?.[0],
        createdAt: now,
        updatedAt: now,
      };
      await repository.create(document);
      const notification = [
        `New Nora TrimTex order ${orderNumber}`,
        `Customer: ${request.body.customer.name}`,
        `Email: ${request.body.customer.email}`,
        `Phone: ${request.body.customer.phone}`,
        `Company: ${request.body.customer.company || "—"}`,
        `Delivery: ${request.body.customer.country}, ${request.body.customer.city}, ${request.body.customer.address}, ${request.body.customer.postcode}`,
        "",
        ...request.body.items.map((item) => `${item.sku}${item.variantLabel ? ` · ${item.variantLabel}` : ""} × ${item.quantity}`),
      ].join("\n");
      const customerMessage = orderConfirmationEmail(
        request.body.locale,
        request.body.customer,
        orderNumber,
        request.body.items.reduce((sum, item) => sum + item.quantity, 0),
      );
      const results = await Promise.allSettled([
        sendOwnerNotification({ subject: `[Nora TrimTex] New order ${orderNumber}`, text: notification, replyTo: request.body.customer.email, idempotencyKey: `order-owner-${orderNumber}` }),
        sendEmail({ to: request.body.customer.email, ...customerMessage, idempotencyKey: `order-customer-${orderNumber}` }),
      ]);
      results.forEach((result, index) => { if (result.status === "rejected") request.log.error(result.reason, index === 0 ? "Owner order notification failed" : "Customer order confirmation failed"); });
      return reply.code(201).send({ data: { id: orderNumber, status: document.status } });
    });
  };
}
