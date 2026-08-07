"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, LogOut, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type User = { email: string; role: "retail" | "partner" | "admin"; firstName: string; lastName: string };
type LoginIssue = "" | "not_found" | "pending" | "invalid" | "error";

const copy = {
  ru: { title: "Войти", email: "Email", password: "Пароль", submit: "Войти", register: "Регистрация", noAccount: "Нет аккаунта?", notFound: "Аккаунт с этим email не найден.", registerEmail: "Зарегистрироваться с этим email", pending: "Аккаунт ещё не активирован или ожидает подтверждения.", invalid: "Неверный email или пароль.", error: "Не удалось войти. Попробуйте ещё раз.", logout: "Выйти", close: "Закрыть" },
  uk: { title: "Увійти", email: "Email", password: "Пароль", submit: "Увійти", register: "Реєстрація", noAccount: "Немає акаунта?", notFound: "Акаунт із цим email не знайдено.", registerEmail: "Зареєструватися з цим email", pending: "Акаунт ще не активовано або очікує підтвердження.", invalid: "Невірний email або пароль.", error: "Не вдалося увійти. Спробуйте ще раз.", logout: "Вийти", close: "Закрити" },
  de: { title: "Anmelden", email: "E-Mail", password: "Passwort", submit: "Anmelden", register: "Registrieren", noAccount: "Noch kein Konto?", notFound: "Für diese E-Mail wurde kein Konto gefunden.", registerEmail: "Mit dieser E-Mail registrieren", pending: "Das Konto ist noch nicht aktiv oder wartet auf Bestätigung.", invalid: "E-Mail oder Passwort ist falsch.", error: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.", logout: "Abmelden", close: "Schließen" },
  en: { title: "Sign in", email: "Email", password: "Password", submit: "Sign in", register: "Register", noAccount: "No account yet?", notFound: "No account was found for this email.", registerEmail: "Register with this email", pending: "The account is not active yet or is awaiting confirmation.", invalid: "Incorrect email or password.", error: "Could not sign in. Please try again.", logout: "Sign out", close: "Close" },
} as const;

export function AccountPanel({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = copy[locale];
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<LoginIssue>("");
  const [email, setEmail] = useState("");

  useEffect(() => { void fetch("/api/account/me").then(async (response) => { if (response.ok) setUser((await response.json()).data.user); }).catch(() => undefined); }, []);

  const registerHref = `/${locale}/account/register${email ? `?email=${encodeURIComponent(email)}` : ""}`;
  const issueText = issue === "not_found" ? t.notFound : issue === "pending" ? t.pending : issue === "invalid" ? t.invalid : issue === "error" ? t.error : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setIssue("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/account/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json();
      if (!response.ok) {
        setIssue(payload?.error === "account_not_found" ? "not_found" : payload?.error === "account_not_active" ? "pending" : payload?.error === "invalid_credentials" ? "invalid" : "error");
        return;
      }
      window.location.reload();
    } catch {
      setIssue("error");
    } finally {
      setBusy(false);
    }
  }

  return <section className="account-panel account-auth" role="dialog" aria-modal="true" aria-label={t.title} onClick={(event) => event.stopPropagation()}>
    <button type="button" className="account-close" onClick={onClose} aria-label={t.close}><X /></button>
    <span>NORA TRIMTEX ACCOUNT</span><h2>{t.title}</h2>
    {user ? <div className="account-profile"><CheckCircle2 /><strong>{user.firstName} {user.lastName}</strong><p>{user.email}</p><small>{user.role}</small><button className="button outline" onClick={async () => { await fetch("/api/account/logout", { method: "POST" }); window.location.reload(); }}><LogOut size={16} />{t.logout}</button></div> : <>
      <form className="account-form" onSubmit={submit}>
        <label>{t.email}<input name="email" type="email" required autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setIssue(""); }} /></label>
        <label>{t.password}<input name="password" type="password" minLength={10} required autoComplete="current-password" onChange={() => setIssue("")} /></label>
        {issueText && <div className={`account-message${issue === "not_found" ? " is-not-found" : ""}`} role="alert"><p>{issueText}</p>{issue === "not_found" && <Link className="button primary wide" href={registerHref} onClick={onClose}>{t.registerEmail}</Link>}</div>}
        <button className="button primary wide" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />}{t.submit}</button>
      </form>
      <div className="account-register-link"><span>{t.noAccount}</span><Link className="button outline wide" href={registerHref} onClick={onClose}>{t.register}</Link></div>
    </>}
  </section>;
}
