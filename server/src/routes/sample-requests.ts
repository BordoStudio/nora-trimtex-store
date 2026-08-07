import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { locales, type Locale, type SampleRequestDocument } from "../domain/types.js";
import type { SampleRequestRepository } from "../repositories.js";

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
        createdAt: now,
        updatedAt: now,
      };
      await repository.create(document);
      return reply.code(201).send({ data: { requestNumber, status: document.status } });
    });
  };
}
