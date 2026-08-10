"use client";

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, Store, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

type AccountType = "retail" | "partner";

const copy = {
  ru: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Регистрация", choose: "Выберите тип аккаунта", retail: "Розничный клиент", retailText: "Для личных заказов и сохранения корзины.", partner: "Партнёр", partnerText: "Для дизайнеров, студий и оптовых заказов.", first: "Имя", last: "Фамилия", email: "Email", password: "Пароль — не менее 10 символов", showPassword: "Показать пароль", hidePassword: "Скрыть пароль", phone: "Телефон", country: "Страна", city: "Город", company: "Компания", submitRetail: "Создать аккаунт", submitPartner: "Отправить заявку", sending: "Отправляем…", retailNote: "После регистрации подтвердите email.", partnerNote: "После подтверждения email заявку партнёра проверит администратор.", sent: "Проверьте почту — мы отправили ссылку для подтверждения email.", exists: "Этот email уже зарегистрирован.", invalid: "Проверьте заполненные данные.", error: "Не удалось отправить форму. Попробуйте ещё раз.", signIn: "Перейти ко входу", back: "На главную" },
  uk: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Реєстрація", choose: "Оберіть тип акаунта", retail: "Роздрібний клієнт", retailText: "Для особистих замовлень і збереження кошика.", partner: "Партнер", partnerText: "Для дизайнерів, студій та оптових замовлень.", first: "Ім’я", last: "Прізвище", email: "Email", password: "Пароль — щонайменше 10 символів", showPassword: "Показати пароль", hidePassword: "Сховати пароль", phone: "Телефон", country: "Країна", city: "Місто", company: "Компанія", submitRetail: "Створити акаунт", submitPartner: "Надіслати заявку", sending: "Надсилаємо…", retailNote: "Після реєстрації підтвердьте email.", partnerNote: "Після підтвердження email заявку партнера перевірить адміністратор.", sent: "Перевірте пошту — ми надіслали посилання для підтвердження email.", exists: "Цей email уже зареєстровано.", invalid: "Перевірте заповнені дані.", error: "Не вдалося надіслати форму. Спробуйте ще раз.", signIn: "Перейти до входу", back: "На головну" },
  de: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Registrierung", choose: "Kontotyp wählen", retail: "Privatkunde", retailText: "Für persönliche Bestellungen und einen gespeicherten Warenkorb.", partner: "Partner", partnerText: "Für Designer, Studios und Großbestellungen.", first: "Vorname", last: "Nachname", email: "E-Mail", password: "Passwort — mindestens 10 Zeichen", showPassword: "Passwort anzeigen", hidePassword: "Passwort ausblenden", phone: "Telefon", country: "Land", city: "Stadt", company: "Unternehmen", submitRetail: "Konto erstellen", submitPartner: "Antrag senden", sending: "Wird gesendet…", retailNote: "Bestätigen Sie nach der Registrierung Ihre E-Mail.", partnerNote: "Nach der E-Mail-Bestätigung wird der Partnerantrag geprüft.", sent: "Bitte prüfen Sie Ihre E-Mails. Wir haben einen Bestätigungslink gesendet.", exists: "Diese E-Mail ist bereits registriert.", invalid: "Bitte prüfen Sie Ihre Angaben.", error: "Formular konnte nicht gesendet werden. Bitte erneut versuchen.", signIn: "Zur Anmeldung", back: "Zur Startseite" },
  en: { eyebrow: "NORA TRIMTEX ACCOUNT", title: "Registration", choose: "Choose an account type", retail: "Retail customer", retailText: "For personal orders and a saved basket.", partner: "Partner", partnerText: "For designers, studios and wholesale orders.", first: "First name", last: "Last name", email: "Email", password: "Password — at least 10 characters", showPassword: "Show password", hidePassword: "Hide password", phone: "Phone", country: "Country", city: "City", company: "Company", submitRetail: "Create account", submitPartner: "Send application", sending: "Sending…", retailNote: "Confirm your email after registration.", partnerNote: "After email confirmation, an administrator will review the partner application.", sent: "Check your inbox — we sent an email confirmation link.", exists: "This email is already registered.", invalid: "Please check the entered details.", error: "Could not submit the form. Please try again.", signIn: "Go to sign in", back: "Home" },
} as const;

export function RegistrationPageClient({ locale, initialEmail }: { locale: Locale; initialEmail: string }) {
  const t = copy[locale];
  const [type, setType] = useState<AccountType>("retail");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "exists" | "invalid" | "error">("idle");

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
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "sent") return <section className="registration-card registration-success"><CheckCircle2 /><span>{t.eyebrow}</span><h1>{t.sent}</h1><Link className="button primary" href={`/${locale}`}>{t.signIn}</Link></section>;

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
