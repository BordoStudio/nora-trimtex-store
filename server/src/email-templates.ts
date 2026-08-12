import type { Locale } from "./domain/types.js";

type MailContent = { subject: string; text: string; html: string };

const escapeHtml = (value: string | number) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const brandEmail = ({ preheader, eyebrow, title, greeting, paragraphs, code, action, details = [] }: {
  preheader: string;
  eyebrow: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  code?: string;
  action?: { label: string; href: string };
  details?: Array<{ label: string; value: string }>;
}): { text: string; html: string } => {
  const text = [greeting, "", ...paragraphs, code ? `\n${code}` : "", ...details.map(({ label, value }) => `${label}: ${value}`), action ? `\n${action.label}: ${action.href}` : "", "", "Nora TrimTex", "info@noratrim.com"].filter(Boolean).join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4ede2;color:#30221b;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4ede2;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffaf3;border:1px solid #e4d3bb;border-radius:28px;overflow:hidden"><tr><td style="padding:38px"><div style="font-size:11px;letter-spacing:.22em;color:#8f6834">NORA TRIMTEX · ${escapeHtml(eyebrow)}</div><h1 style="margin:18px 0 28px;font-family:Georgia,serif;font-size:38px;font-weight:400;line-height:1.08">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.65">${escapeHtml(greeting)}</p>${paragraphs.map((paragraph) => `<p style="font-size:15px;line-height:1.65;color:#5f4b3d">${escapeHtml(paragraph)}</p>`).join("")}${code ? `<div style="margin:28px 0;padding:20px;border-radius:18px;background:#efe2cd;text-align:center;font-size:34px;font-weight:700;letter-spacing:.24em">${escapeHtml(code)}</div>` : ""}${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0;border-top:1px solid #e4d3bb">${details.map(({ label, value }) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e4d3bb;color:#8f7968">${escapeHtml(label)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e4d3bb;font-weight:600">${escapeHtml(value)}</td></tr>`).join("")}</table>` : ""}${action ? `<p style="margin:30px 0"><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#b99553;color:#241a14;text-decoration:none;font-weight:700">${escapeHtml(action.label)}</a></p>` : ""}<p style="margin:34px 0 0;padding-top:22px;border-top:1px solid #e4d3bb;font-size:12px;color:#8f7968">Nora TrimTex · <a href="mailto:info@noratrim.com" style="color:#6f512d">info@noratrim.com</a></p></td></tr></table></td></tr></table></body></html>`;
  return { text, html };
};

const translations = {
  ru: {
    hello: (name: string) => `Здравствуйте, ${name}!`,
    verifySubject: "Код подтверждения — Nora TrimTex", verifyTitle: "Подтвердите email", verifyBody: "Введите этот код на странице регистрации.", verifyExpiry: "Код действует 15 минут. Если вы не создавали аккаунт, просто проигнорируйте письмо.",
    approvedSubject: "Ваш партнёрский аккаунт одобрен — Nora TrimTex", approvedTitle: "Партнёрский аккаунт одобрен", approvedBody: "Теперь вы можете войти в аккаунт и видеть партнёрские цены.", signIn: "Войти в аккаунт",
    rejectedSubject: "Статус партнёрской заявки — Nora TrimTex", rejectedTitle: "Заявка рассмотрена", rejectedBody: "Сейчас мы не можем одобрить партнёрский доступ. Ответьте на это письмо, если хотите уточнить детали.",
    orderSubject: (number: string) => `Заказ ${number} получен — Nora TrimTex`, orderTitle: "Мы получили ваш заказ", orderBody: "Заказ сохранён. Мы проверим наличие, цены и доставку и свяжемся с вами для подтверждения.", order: "Заказ", items: "Товаров", delivery: "Доставка",
    sampleSubject: (number: string) => `Заявка на образцы ${number} получена — Nora TrimTex`, sampleTitle: "Заявка на образцы получена", sampleBody: "Мы проверим наличие выбранных образцов и свяжемся с вами.", request: "Заявка",
  },
  uk: {
    hello: (name: string) => `Вітаємо, ${name}!`,
    verifySubject: "Код підтвердження — Nora TrimTex", verifyTitle: "Підтвердьте email", verifyBody: "Введіть цей код на сторінці реєстрації.", verifyExpiry: "Код діє 15 хвилин. Якщо ви не створювали акаунт, просто проігноруйте лист.",
    approvedSubject: "Ваш партнерський акаунт схвалено — Nora TrimTex", approvedTitle: "Партнерський акаунт схвалено", approvedBody: "Тепер ви можете увійти в акаунт і бачити партнерські ціни.", signIn: "Увійти в акаунт",
    rejectedSubject: "Статус партнерської заявки — Nora TrimTex", rejectedTitle: "Заявку розглянуто", rejectedBody: "Наразі ми не можемо схвалити партнерський доступ. Дайте відповідь на цей лист, якщо хочете уточнити деталі.",
    orderSubject: (number: string) => `Замовлення ${number} отримано — Nora TrimTex`, orderTitle: "Ми отримали ваше замовлення", orderBody: "Замовлення збережено. Ми перевіримо наявність, ціни й доставку та зв’яжемося з вами для підтвердження.", order: "Замовлення", items: "Товарів", delivery: "Доставка",
    sampleSubject: (number: string) => `Заявку на зразки ${number} отримано — Nora TrimTex`, sampleTitle: "Заявку на зразки отримано", sampleBody: "Ми перевіримо наявність обраних зразків і зв’яжемося з вами.", request: "Заявка",
  },
  de: {
    hello: (name: string) => `Guten Tag, ${name}!`,
    verifySubject: "Bestätigungscode — Nora TrimTex", verifyTitle: "E-Mail bestätigen", verifyBody: "Geben Sie diesen Code auf der Registrierungsseite ein.", verifyExpiry: "Der Code ist 15 Minuten gültig. Falls Sie kein Konto erstellt haben, ignorieren Sie diese E-Mail.",
    approvedSubject: "Ihr Partnerkonto wurde freigeschaltet — Nora TrimTex", approvedTitle: "Partnerkonto freigeschaltet", approvedBody: "Sie können sich jetzt anmelden und Partnerpreise sehen.", signIn: "Jetzt anmelden",
    rejectedSubject: "Status Ihres Partnerantrags — Nora TrimTex", rejectedTitle: "Antrag geprüft", rejectedBody: "Der Partnerzugang kann derzeit nicht freigeschaltet werden. Antworten Sie auf diese E-Mail, wenn Sie Fragen haben.",
    orderSubject: (number: string) => `Bestellung ${number} erhalten — Nora TrimTex`, orderTitle: "Wir haben Ihre Bestellung erhalten", orderBody: "Ihre Bestellung wurde gespeichert. Wir prüfen Verfügbarkeit, Preise und Lieferung und melden uns zur Bestätigung.", order: "Bestellung", items: "Artikel", delivery: "Lieferung",
    sampleSubject: (number: string) => `Musteranfrage ${number} erhalten — Nora TrimTex`, sampleTitle: "Musteranfrage erhalten", sampleBody: "Wir prüfen die Verfügbarkeit der ausgewählten Muster und melden uns bei Ihnen.", request: "Anfrage",
  },
  en: {
    hello: (name: string) => `Hello, ${name}!`,
    verifySubject: "Your confirmation code — Nora TrimTex", verifyTitle: "Confirm your email", verifyBody: "Enter this code on the registration page.", verifyExpiry: "The code is valid for 15 minutes. If you did not create an account, you can ignore this email.",
    approvedSubject: "Your partner account is approved — Nora TrimTex", approvedTitle: "Partner account approved", approvedBody: "You can now sign in and view partner prices.", signIn: "Sign in",
    rejectedSubject: "Your partner application status — Nora TrimTex", rejectedTitle: "Application reviewed", rejectedBody: "We cannot approve partner access at this time. Reply to this email if you would like more information.",
    orderSubject: (number: string) => `Order ${number} received — Nora TrimTex`, orderTitle: "We received your order", orderBody: "Your order has been saved. We will check availability, pricing and delivery and contact you to confirm.", order: "Order", items: "Items", delivery: "Delivery",
    sampleSubject: (number: string) => `Sample request ${number} received — Nora TrimTex`, sampleTitle: "Sample request received", sampleBody: "We will check the selected samples and contact you.", request: "Request",
  },
} as const;

export function verificationEmail(locale: Locale, name: string, code: string): MailContent {
  const t = translations[locale];
  return { subject: t.verifySubject, ...brandEmail({ preheader: t.verifyBody, eyebrow: "EMAIL", title: t.verifyTitle, greeting: t.hello(name), paragraphs: [t.verifyBody, t.verifyExpiry], code }) };
}

export function partnerDecisionEmail(locale: Locale, name: string, approved: boolean, signInUrl: string): MailContent {
  const t = translations[locale];
  return approved
    ? { subject: t.approvedSubject, ...brandEmail({ preheader: t.approvedBody, eyebrow: "PARTNER", title: t.approvedTitle, greeting: t.hello(name), paragraphs: [t.approvedBody], action: { label: t.signIn, href: signInUrl } }) }
    : { subject: t.rejectedSubject, ...brandEmail({ preheader: t.rejectedBody, eyebrow: "PARTNER", title: t.rejectedTitle, greeting: t.hello(name), paragraphs: [t.rejectedBody] }) };
}

export function orderConfirmationEmail(locale: Locale, customer: { name: string; country: string; city: string; address: string; postcode: string }, orderNumber: string, itemCount: number): MailContent {
  const t = translations[locale];
  return { subject: t.orderSubject(orderNumber), ...brandEmail({ preheader: t.orderBody, eyebrow: "ORDER", title: t.orderTitle, greeting: t.hello(customer.name), paragraphs: [t.orderBody], details: [{ label: t.order, value: orderNumber }, { label: t.items, value: String(itemCount) }, { label: t.delivery, value: `${customer.country}, ${customer.city}, ${customer.address}, ${customer.postcode}` }] }) };
}

export function sampleConfirmationEmail(locale: Locale, name: string, requestNumber: string, itemCount: number): MailContent {
  const t = translations[locale];
  return { subject: t.sampleSubject(requestNumber), ...brandEmail({ preheader: t.sampleBody, eyebrow: "SAMPLES", title: t.sampleTitle, greeting: t.hello(name), paragraphs: [t.sampleBody], details: [{ label: t.request, value: requestNumber }, { label: t.items, value: String(itemCount) }] }) };
}

