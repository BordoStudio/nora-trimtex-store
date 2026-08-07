import { config } from "./config.js";

type EmailMessage = { to: string; subject: string; text: string; html?: string; idempotencyKey: string };
type Notification = Omit<EmailMessage, "to">;

export async function sendEmail(message: EmailMessage) {
  if (!config.RESEND_API_KEY || !config.NOTIFICATION_FROM_EMAIL) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.RESEND_API_KEY}`,
      "content-type": "application/json",
      "user-agent": "NoraTrimTexAPI/1.0",
      "idempotency-key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from: config.NOTIFICATION_FROM_EMAIL,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Notification provider returned ${response.status}`);
  return true;
}

export async function sendOwnerNotification(notification: Notification) {
  return sendEmail({ ...notification, to: config.NOTIFICATION_TO_EMAIL });
}
