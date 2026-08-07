"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function VerifyAccountPage() {
  const { locale } = useParams<{ locale: string }>();
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"loading" | "active" | "pending_approval" | "error">("loading");
  useEffect(() => {
    if (!token) { setState("error"); return; }
    void fetch("/api/account/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const payload = await response.json(); setState(response.ok ? payload.data.status : "error"); })
      .catch(() => setState("error"));
  }, [token]);
  const text = state === "loading" ? "Подтверждаем email…" : state === "active" ? "Email подтверждён. Теперь можно войти в аккаунт." : state === "pending_approval" ? "Email подтверждён. Заявка партнёра отправлена администратору." : "Ссылка недействительна или уже использована.";
  return <section className="account-verify"><span>ACCOUNT</span><h1>{text}</h1><Link className="button primary" href={`/${locale}`}>На главную</Link></section>;
}
