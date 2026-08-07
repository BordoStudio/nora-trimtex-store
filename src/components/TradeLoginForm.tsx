"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

const copy = {
  en: { password: "Trade password", submit: "Enter trade area", loading: "Checking…", error: "Incorrect password or too many attempts." },
  de: { password: "Trade-Passwort", submit: "Trade-Bereich öffnen", loading: "Prüfung…", error: "Falsches Passwort oder zu viele Versuche." },
  uk: { password: "Пароль для оптовиків", submit: "Увійти до Trade", loading: "Перевіряємо…", error: "Невірний пароль або забагато спроб." },
  ru: { password: "Пароль для оптовиков", submit: "Войти в Trade", loading: "Проверяем…", error: "Неверный пароль или слишком много попыток." },
} satisfies Record<Locale, Record<string, string>>;

export function TradeLoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const t = copy[locale];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/trade/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) { setStatus("error"); return; }
    router.push(`/${locale}/trade`);
    router.refresh();
  };

  return <form className="trade-login-form" onSubmit={submit}>
    <label htmlFor="trade-password">{t.password}</label>
    <div><LockKeyhole /><input id="trade-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
    <button type="submit" className="button primary wide" disabled={status === "loading"}>{status === "loading" ? t.loading : t.submit}<ArrowRight /></button>
    {status === "error" && <p className="form-status error" role="alert">{t.error}</p>}
  </form>;
}
