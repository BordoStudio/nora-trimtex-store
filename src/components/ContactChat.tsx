"use client";

import { Check, MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getGuestId, guestHeaders } from "@/lib/guest";

const copy = {
  en: { title: "Ask your question", name: "Name (optional)", contact: "Email or phone for a reply", message: "Your question", send: "Send", sending: "Sending…", sent: "Your question has been sent.", again: "Ask another question", error: "Message not sent. Please try again.", open: "Ask a question", close: "Close" },
  de: { title: "Stellen Sie Ihre Frage", name: "Name (optional)", contact: "E-Mail oder Telefon für die Antwort", message: "Ihre Frage", send: "Senden", sending: "Wird gesendet…", sent: "Ihre Frage wurde gesendet.", again: "Weitere Frage stellen", error: "Nachricht nicht gesendet. Bitte erneut versuchen.", open: "Frage stellen", close: "Schließen" },
  uk: { title: "Поставте своє запитання", name: "Ім’я (необов’язково)", contact: "Email або телефон для відповіді", message: "Ваше запитання", send: "Надіслати", sending: "Надсилаємо…", sent: "Запитання надіслано.", again: "Поставити ще одне запитання", error: "Повідомлення не надіслано. Спробуйте ще раз.", open: "Поставити запитання", close: "Закрити" },
  ru: { title: "Задайте свой вопрос", name: "Имя (необязательно)", contact: "Email или телефон для ответа", message: "Ваш вопрос", send: "Отправить", sending: "Отправляем…", sent: "Вопрос отправлен.", again: "Задать ещё вопрос", error: "Сообщение не отправлено. Попробуйте ещё раз.", open: "Задать вопрос", close: "Закрыть" },
} satisfies Record<Locale, Record<string, string>>;

export function ContactChat({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    window.setTimeout(() => dialog.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(), 80);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: guestHeaders(pathname),
        body: JSON.stringify({ guestId: getGuestId(), name: data.get("name"), contact: data.get("contact"), message: data.get("message"), website: data.get("website"), locale, page: pathname }),
      });
      if (!response.ok) throw new Error("chat_failed");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const toggleOpen = () => {
    if (!open && status === "sent") setStatus("idle");
    setOpen((value) => !value);
  };

  return <div className={open ? "contact-chat is-open" : "contact-chat"}>
    {open && <div className="chat-panel" ref={dialog} role="dialog" aria-modal="false" aria-label={t.title}>
      <header><strong>{t.title}</strong><button type="button" onClick={() => setOpen(false)} aria-label={t.close}><X /></button></header>
      <div className="chat-body">
        {status === "sent" ? <div className="chat-success" role="status"><Check /><p>{t.sent}</p><button className="button secondary" type="button" onClick={() => setStatus("idle")}>{t.again}</button></div> : <form onSubmit={submit}>
          <input name="website" tabIndex={-1} autoComplete="off" className="chat-honeypot" aria-hidden="true" />
          <textarea name="message" required minLength={3} maxLength={1500} rows={5} aria-label={t.message} placeholder={t.message} />
          <input name="contact" required minLength={5} maxLength={200} autoComplete="email" aria-label={t.contact} placeholder={t.contact} />
          <input name="name" maxLength={120} autoComplete="name" aria-label={t.name} placeholder={t.name} />
          <button className="button primary wide" disabled={status === "sending"}>{status === "sending" ? t.sending : t.send}<Send /></button>
          {status === "error" && <p className="chat-error" role="alert">{t.error}</p>}
        </form>}
      </div>
    </div>}
    <button className="chat-launcher" type="button" onClick={toggleOpen} aria-expanded={open} aria-label={t.open}>{open ? <X /> : <MessageCircle />}<span>{t.open}</span></button>
  </div>;
}
