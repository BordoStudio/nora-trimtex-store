"use client";

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, MailCheck, Store, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

type AccountType = "retail" | "partner";
type Status = "idle" | "sent" | "resent" | "code_error" | "verified" | "pending_approval" | "exists" | "invalid" | "error";

const copy = {
  ru: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Регистрация", choose: "Выберите тип аккаунта", retail: "Розничный клиент", retailText: "Для личных заказов и сохранения корзины.", partner: "Партнёр", partnerText: "Для дизайнеров, студий и оптовых заказов.", first: "Имя", last: "Фамилия", email: "Email", password: "Пароль — не менее 10 символов", showPassword: "Показать пароль", hidePassword: "Скрыть пароль", phone: "Телефон", country: "Страна", city: "Город", company: "Компания", submitRetail: "Создать аккаунт", submitPartner: "Отправить заявку", sending: "Отправляем…", retailNote: "После регистрации мы отправим шестизначный код подтверждения.", partnerNote: "Сначала подтвердите email кодом, затем заявку проверит администратор.", sent: "Введите код из письма", sentBody: "Шестизначный код отправлен на", code: "Код подтверждения", verify: "Подтвердить email", verifying: "Проверяем…", resend: "Отправить код повторно", resent: "Новый код отправлен.", codeError: "Код неверный или уже истёк.", verified: "Email подтверждён. Аккаунт готов.", pending: "Email подтверждён. Заявка партнёра отправлена администратору.", exists: "Этот email уже зарегистрирован.", invalid: "Проверьте заполненные данные.", error: "Не удалось отправить форму. Попробуйте ещё раз.", signIn: "Перейти ко входу", back: "На главную" },
  uk: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Реєстрація", choose: "Оберіть тип акаунта", retail: "Роздрібний клієнт", retailText: "Для особистих замовлень і збереження кошика.", partner: "Партнер", partnerText: "Для дизайнерів, студій та оптових замовлень.", first: "Ім’я", last: "Прізвище", email: "Email", password: "Пароль — щонайменше 10 символів", showPassword: "Показати пароль", hidePassword: "Сховати пароль", phone: "Телефон", country: "Країна", city: "Місто", company: "Компанія", submitRetail: "Створити акаунт", submitPartner: "Надіслати заявку", sending: "Надсилаємо…", retailNote: "Після реєстрації ми надішлемо шестизначний код підтвердження.", partnerNote: "Спочатку підтвердьте email кодом, потім заявку перевірить адміністратор.", sent: "Введіть код із листа", sentBody: "Шестизначний код надіслано на", code: "Код підтвердження", verify: "Підтвердити email", verifying: "Перевіряємо…", resend: "Надіслати код повторно", resent: "Новий код надіслано.", codeError: "Код неправильний або вже закінчився.", verified: "Email підтверджено. Акаунт готовий.", pending: "Email підтверджено. Заявку партнера надіслано адміністратору.", exists: "Цей email уже зареєстровано.", invalid: "Перевірте заповнені дані.", error: "Не вдалося надіслати форму. Спробуйте ще раз.", signIn: "Перейти до входу", back: "На головну" },
  de: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Registrierung", choose: "Kontotyp wählen", retail: "Privatkunde", retailText: "Für persönliche Bestellungen und einen gespeicherten Warenkorb.", partner: "Partner", partnerText: "Für Designer, Studios und Großbestellungen.", first: "Vorname", last: "Nachname", email: "E-Mail", password: "Passwort — mindestens 10 Zeichen", showPassword: "Passwort anzeigen", hidePassword: "Passwort ausblenden", phone: "Telefon", country: "Land", city: "Stadt", company: "Unternehmen", submitRetail: "Konto erstellen", submitPartner: "Antrag senden", sending: "Wird gesendet…", retailNote: "Nach der Registrierung senden wir einen sechsstelligen Bestätigungscode.", partnerNote: "Bestätigen Sie zuerst Ihre E-Mail. Danach wird der Partnerantrag geprüft.", sent: "Code aus der E-Mail eingeben", sentBody: "Der sechsstellige Code wurde gesendet an", code: "Bestätigungscode", verify: "E-Mail bestätigen", verifying: "Wird geprüft…", resend: "Code erneut senden", resent: "Ein neuer Code wurde gesendet.", codeError: "Der Code ist falsch oder abgelaufen.", verified: "E-Mail bestätigt. Ihr Konto ist bereit.", pending: "E-Mail bestätigt. Ihr Partnerantrag wurde zur Prüfung gesendet.", exists: "Diese E-Mail ist bereits registriert.", invalid: "Bitte prüfen Sie Ihre Angaben.", error: "Formular konnte nicht gesendet werden. Bitte erneut versuchen.", signIn: "Zur Anmeldung", back: "Zur Startseite" },
  en: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Registration", choose: "Choose an account type", retail: "Retail customer", retailText: "For personal orders and a saved basket.", partner: "Partner", partnerText: "For designers, studios and wholesale orders.", first: "First name", last: "Last name", email: "Email", password: "Password — at least 10 characters", showPassword: "Show password", hidePassword: "Hide password", phone: "Phone", country: "Country", city: "City", company: "Company", submitRetail: "Create account", submitPartner: "Send application", sending: "Sending…", retailNote: "After registration we will send a six-digit confirmation code.", partnerNote: "Confirm your email first. An administrator will then review the partner application.", sent: "Enter the code from your email", sentBody: "We sent a six-digit code to", code: "Confirmation code", verify: "Confirm email", verifying: "Checking…", resend: "Send another code", resent: "A new code has been sent.", codeError: "The code is incorrect or has expired.", verified: "Email confirmed. Your account is ready.", pending: "Email confirmed. Your partner application was sent for review.", exists: "This email is already registered.", invalid: "Please check the entered details.", error: "Could not submit the form. Please try again.", signIn: "Go to sign in", back: "Home" },
} as const;

export function RegistrationPageClient({ locale, initialEmail }: { locale: Locale; initialEmail: string }) {
  const t = copy[locale];
  const [type, setType] = useState<AccountType>("retail");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [pendingEmail, setPendingEmail] = useState(initialEmail);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("idle");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/account/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, accountType: type, locale }) });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload?.error === "email_already_registered" ? "exists" : payload?.error === "invalid_registration" ? "invalid" : "error");
        return;
      }
      setPendingEmail(String(values.email));
      setStatus("sent");
    } catch { setStatus("error"); } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const code = String(new FormData(event.currentTarget).get("code") || "").replace(/\D/g, "");
    try {
      const response = await fetch("/api/account/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: pendingEmail, code }) });
      const payload = await response.json();
      if (!response.ok) { setStatus("code_error"); return; }
      setStatus(payload?.data?.status === "pending_approval" ? "pending_approval" : "verified");
    } catch { setStatus("code_error"); } finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true);
    try {
      const response = await fetch("/api/account/resend-verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: pendingEmail }) });
      setStatus(response.ok ? "resent" : "error");
    } catch { setStatus("error"); } finally { setBusy(false); }
  }

  if (["verified", "pending_approval"].includes(status)) return <section className="registration-card registration-success"><CheckCircle2 /><span>{t.eyebrow}</span><h1>{status === "pending_approval" ? t.pending : t.verified}</h1><Link className="button primary" href={`/${locale}`}>{t.signIn}</Link></section>;

  if (["sent", "resent", "code_error"].includes(status)) return <section className="registration-card registration-success registration-code"><MailCheck /><span>{t.eyebrow}</span><h1>{t.sent}</h1><p>{t.sentBody} <strong>{pendingEmail}</strong></p><form className="account-form" onSubmit={verify}><label>{t.code}<input name="code" className="verification-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus /></label>{status === "code_error" && <p className="account-message" role="alert">{t.codeError}</p>}{status === "resent" && <p className="account-note" role="status">{t.resent}</p>}<button className="button primary wide" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />}{busy ? t.verifying : t.verify}</button></form><button className="registration-resend" type="button" disabled={busy} onClick={resend}>{t.resend}</button></section>;

  const errorText = status === "exists" ? t.exists : status === "invalid" ? t.invalid : status === "error" ? t.error : "";
  return <section className="registration-card">
    <span>{t.eyebrow}</span><h1>{t.title}</h1><p className="registration-intro">{t.choose}</p>
    <div className="registration-choice" role="radiogroup" aria-label={t.choose}>
      <button type="button" role="radio" aria-checked={type === "retail"} className={type === "retail" ? "active" : ""} onClick={() => { setType("retail"); setStatus("idle"); }}><UserRound /><strong>{t.retail}</strong><small>{t.retailText}</small></button>
      <button type="button" role="radio" aria-checked={type === "partner"} className={type === "partner" ? "active" : ""} onClick={() => { setType("partner"); setStatus("idle"); }}><Store /><strong>{t.partner}</strong><small>{t.partnerText}</small></button>
    </div>
    <form className="account-form registration-form" onSubmit={submit}>
      <div className="account-grid"><label>{t.first}<input name="firstName" required autoComplete="given-name" /></label><label>{t.last}<input name="lastName" required autoComplete="family-name" /></label></div>
      <label>{t.email}<input name="email" type="email" required autoComplete="email" defaultValue={initialEmail} /></label>
      <label>{t.password}<span className="password-input"><input name="password" type={showPassword ? "text" : "password"} minLength={10} required autoComplete="new-password" /><button type="button" aria-label={showPassword ? t.hidePassword : t.showPassword} aria-pressed={showPassword} title={showPassword ? t.hidePassword : t.showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
      <div className="account-grid"><label>{t.phone}<input name="phone" autoComplete="tel" /></label><label>{t.country}<input name="country" autoComplete="country-name" /></label><label>{t.city}<input name="city" autoComplete="address-level2" /></label>{type === "partner" && <label>{t.company}<input name="company" required autoComplete="organization" /></label>}</div>
      <p className="account-note">{type === "partner" ? t.partnerNote : t.retailNote}</p>
      {errorText && <p className="account-message" role="alert">{errorText}</p>}
      <button className="button primary wide" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />}{busy ? t.sending : type === "retail" ? t.submitRetail : t.submitPartner}</button>
    </form>
    <Link className="registration-back" href={`/${locale}`}>{t.back}</Link>
  </section>;
}
