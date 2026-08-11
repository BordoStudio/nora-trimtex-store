"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const copy = {
  ru: { loading: "Подтверждаем email…", active: "Email подтверждён. Теперь можно войти в аккаунт.", pending_approval: "Email подтверждён. Заявка партнёра отправлена администратору.", error: "Ссылка недействительна или уже использована.", home: "На главную" },
  uk: { loading: "Підтверджуємо email…", active: "Email підтверджено. Тепер можна увійти до акаунта.", pending_approval: "Email підтверджено. Заявку партнера надіслано адміністратору.", error: "Посилання недійсне або вже використане.", home: "На головну" },
  de: { loading: "E-Mail wird bestätigt…", active: "E-Mail bestätigt. Sie können sich jetzt anmelden.", pending_approval: "E-Mail bestätigt. Der Partnerantrag wurde zur Prüfung gesendet.", error: "Der Link ist ungültig oder wurde bereits verwendet.", home: "Zur Startseite" },
  en: { loading: "Confirming email…", active: "Email confirmed. You can now sign in.", pending_approval: "Email confirmed. The partner application was sent for approval.", error: "The link is invalid or has already been used.", home: "Home" },
} as const;

export default function VerifyAccountPage() {
  const { locale } = useParams<{ locale: string }>();
  const token = useSearchParams().get("token");
  const language = locale in copy ? locale as keyof typeof copy : "en";
  const [state, setState] = useState<"loading" | "active" | "pending_approval" | "error">(() => token ? "loading" : "error");
  useEffect(() => {
    if (!token) return;
    void fetch("/api/account/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const payload = await response.json(); setState(response.ok ? payload.data.status : "error"); })
      .catch(() => setState("error"));
  }, [token]);
  return <section className="account-verify"><span>ACCOUNT</span><h1>{copy[language][state]}</h1><Link className="button primary" href={`/${language}`}>{copy[language].home}</Link></section>;
}
