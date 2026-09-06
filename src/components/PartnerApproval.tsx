"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

type ApprovalState = "loading" | "success" | "error";

export function PartnerApproval() {
  const [state, setState] = useState<ApprovalState>("loading");
  const [email, setEmail] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
    history.replaceState(null, "", location.pathname);
    if (!token) { queueMicrotask(() => setState("error")); return; }
    void fetch("/api/partner-approvals/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error("approval_failed");
      setEmail(payload?.data?.email || "");
      setState("success");
    }).catch(() => setState("error"));
  }, []);

  return <main className="approval-page"><section className="approval-card">
    <span>NORA TRIMTEX · DESIGNER ACCESS</span>
    {state === "loading" && <><LoaderCircle className="spin" /><h1>Выдаём доступ</h1><p>Пожалуйста, подождите несколько секунд.</p></>}
    {state === "success" && <><CheckCircle2 /><h1>Доступ подтверждён</h1><p>{email ? `Дизайнер ${email} получил доступ к специальным ценам.` : "Дизайнер получил доступ к специальным ценам."}</p><p>Письмо с подтверждением отправлено пользователю.</p></>}
    {state === "error" && <><ShieldAlert /><h1>Ссылка недействительна</h1><p>Она уже использована или прошло больше 7 дней. Откройте заявку в админке, чтобы изменить статус вручную.</p><Link className="button primary" href="/admin">Открыть админку</Link></>}
  </section></main>;
}
