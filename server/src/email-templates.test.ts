import assert from "node:assert/strict";
import test from "node:test";
import { orderConfirmationEmail, partnerDecisionEmail, sampleConfirmationEmail, verificationEmail } from "./email-templates.js";

test("verification email is localized, branded and escapes customer data", () => {
  const message = verificationEmail("ru", "<Ирина>", "123456");
  assert.match(message.subject, /Код подтверждения/);
  assert.match(message.text, /123456/);
  assert.match(message.html, /NORA TRIMTEX/);
  assert.doesNotMatch(message.html, /<Ирина>/);
  assert.match(message.html, /&lt;Ирина&gt;/);
});

test("partner decisions and customer transaction emails support every locale", () => {
  for (const locale of ["ru", "uk", "de", "en"] as const) {
    assert.ok(partnerDecisionEmail(locale, "Nora", true, "https://noratrim.com").html.includes("https://noratrim.com"));
    assert.ok(orderConfirmationEmail(locale, { name: "Nora", country: "DE", city: "Berlin", address: "Street 1", postcode: "10115" }, "LTX-1", 3).text.includes("LTX-1"));
    assert.ok(sampleConfirmationEmail(locale, "Nora", "SR-1", 2).text.includes("SR-1"));
  }
});
