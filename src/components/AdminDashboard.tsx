"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, MapPin, RefreshCw, Save, Search, ShieldCheck, ShoppingBag, UserRoundCheck, UserX } from "lucide-react";

type AdminUser = {
  id: string; email: string; role: string; status: string; firstName: string; lastName: string;
  company?: string; country?: string; city?: string; createdAt: string; lastLoginAt?: string;
  cartItems: number; orders: number; partnerDiscountPercent: number;
};
type UserDetail = {
  user: AdminUser & { phone?: string };
  cart: { items: Array<{ sku: string; name: string; quantity: number }>; updatedAt?: string } | null;
  orders: Array<{ orderNumber: string; status: string; createdAt: string; subtotal?: number }>;
  sessions?: Array<{ countryCode?: string; region?: string; city?: string; userAgent?: string; referrer?: string; lastSeenAt: string; createdAt: string }>;
  connectedAccounts?: Array<{ provider: string; providerEmail?: string; displayName?: string; createdAt: string }>;
};
type Product = { id: string; sku: string; slug: string; categoryId: string; names: Record<string, string>; image: string; retailPriceUsd: number | null; partnerPriceUsd: number | null; status: string };
type Activity = { userId: string; email: string; firstName: string; lastName: string; countryCode?: string; region?: string; city?: string; userAgent?: string; referrer?: string; lastSeenAt: string };
type Guest = {
  id: string; countryCode?: string; region?: string; city?: string; userAgent?: string; referrer?: string; landingPage?: string; lastPage?: string; createdAt: string; lastSeenAt: string;
  cart: { items: Array<{ sku?: string; name?: string; quantity?: number; image?: string }>; updatedAt: string } | null;
  messages: Array<{ name?: string; contact: string; message: string; page?: string; createdAt: string }>;
  orders: Array<{ orderNumber: string; customer?: { name?: string; email?: string; phone?: string }; createdAt: string }>;
  sampleRequests: Array<{ requestNumber?: string; customer?: { name?: string; email?: string; phone?: string }; createdAt?: string }>;
};
type Tab = "users" | "products" | "guests" | "activity";

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("ru", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const deviceName = (ua?: string) => !ua ? "Неизвестное устройство" : /iphone|ipad/i.test(ua) ? "iPhone / iPad" : /android/i.test(ua) ? "Android" : /macintosh|mac os/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "Браузер";
const roleName = (value: string) => value === "admin" ? "Администратор" : value === "partner" ? "Партнёр" : "Клиент";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setMessage("");
    const params = new URLSearchParams({ ...(query ? { q: query } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}) });
    const endpoint = tab === "users" ? `/api/admin/users?${params}` : tab === "products" ? `/api/admin/products?${new URLSearchParams({ ...(query ? { q: query } : {}) })}` : tab === "guests" ? "/api/admin/guests" : "/api/admin/activity";
    const response = await fetch(endpoint);
    if (response.status === 401 || response.status === 403) setNeedsLogin(true);
    else if (response.ok) {
      const payload = (await response.json()).data;
      if (tab === "users") setUsers(payload.items);
      if (tab === "products") setProducts(payload.items);
      if (tab === "activity") setActivity(payload.sessions);
      if (tab === "guests") setGuests(payload.items);
    } else setMessage("Не удалось загрузить данные.");
    setBusy(false);
  }, [query, role, status, tab]);

  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  async function openUser(id: string) { const response = await fetch(`/api/admin/users/${id}`); if (response.ok) setSelected((await response.json()).data); }
  async function changeStatus(id: string, nextStatus: string) {
    const response = await fetch(`/api/admin/users/${id}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    if (!response.ok) return setMessage("Не удалось изменить статус пользователя.");
    await load(); if (selected?.user.id === id) await openUser(id);
  }
  async function saveDiscount(id: string, partnerDiscountPercent: number) {
    const response = await fetch(`/api/admin/users/${id}/pricing`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ partnerDiscountPercent }) });
    setMessage(response.ok ? "Индивидуальная цена партнёра сохранена." : "Не удалось сохранить скидку.");
    if (response.ok) { await load(); await openUser(id); }
  }
  async function savePrice(id: string, retailPriceUsd: number | null, partnerPriceUsd: number | null) {
    const response = await fetch(`/api/admin/products/${id}/price`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ retailPriceUsd, partnerPriceUsd }) });
    setMessage(response.ok ? "Цены для клиентов и партнёров сохранены." : "Не удалось сохранить цены.");
    if (response.ok) await load();
  }

  if (needsLogin) return <AdminLogin />;
  return <div className="admin-shell">
    <header><div><span>NORA TRIMTEX</span><h1>Администратор</h1></div><button className="button outline" onClick={() => void load()}><RefreshCw size={16} />Обновить</button></header>
    <nav className="admin-tabs" aria-label="Разделы админки">
      <button className={tab === "users" ? "active" : ""} onClick={() => { setTab("users"); setQuery(""); }}>Клиенты</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setQuery(""); }}>Цены товаров</button>
      <button className={tab === "guests" ? "active" : ""} onClick={() => { setTab("guests"); setQuery(""); }}>Гости</button>
      <button className={tab === "activity" ? "active" : ""} onClick={() => { setTab("activity"); setQuery(""); }}>Входы</button>
    </nav>
    {message && <p className="admin-message">{message}</p>}
    {(tab === "users" || tab === "products") && <div className="admin-filters">
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "products" ? "Артикул или название" : "Имя, email, компания"} /></label>
      {tab === "users" && <><select value={role} onChange={(event) => setRole(event.target.value)}><option value="">Все типы</option><option value="retail">Розница</option><option value="partner">Дизайнеры / партнёры</option><option value="admin">Администраторы</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все статусы</option><option value="pending_approval">Ожидают решения</option><option value="active">Активные</option><option value="email_pending">Не подтвердили email</option><option value="rejected">Отклонённые</option><option value="disabled">Отключённые</option></select></>}
    </div>}
    {busy && <div className="admin-loading"><LoaderCircle className="spin" /> Загрузка…</div>}
    {!busy && tab === "users" && <div className="admin-layout"><div className="admin-list">{users.map((user) => <button key={user.id} className={selected?.user.id === user.id ? "active" : ""} onClick={() => void openUser(user.id)}><span><strong>{user.role === "admin" ? "Администратор" : `${user.firstName} ${user.lastName}`}</strong><small>{user.email}</small></span><span><b>{roleName(user.role)}</b><em data-status={user.status}>{user.status}</em></span><span><small>Корзина: {user.cartItems}</small><small>Заказы: {user.orders}</small></span></button>)}</div><UserDetailPanel key={selected?.user.id || "none"} detail={selected} onStatus={changeStatus} onDiscount={saveDiscount} /></div>}
    {!busy && tab === "products" && <div className="admin-products"><div className="admin-products-head"><span>Товар</span><span>Для клиентов</span><span>Для партнёров</span><span /></div>{products.map((product) => <ProductPriceRow key={`${product.id}-${product.retailPriceUsd ?? "request"}-${product.partnerPriceUsd ?? "request"}`} product={product} onSave={savePrice} />)}</div>}
    {!busy && tab === "guests" && <GuestList guests={guests} />}
    {!busy && tab === "activity" && <div className="admin-activity">{activity.map((item, index) => <article key={`${item.userId}-${item.lastSeenAt}-${index}`}><UserRoundCheck /><div><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small></div><div><span>{[item.city, item.region, item.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</span><small>{deviceName(item.userAgent)}</small></div><time>{formatDate(item.lastSeenAt)}</time></article>)}</div>}
  </div>;
}

function UserDetailPanel({ detail, onStatus, onDiscount }: { detail: UserDetail | null; onStatus: (id: string, status: string) => Promise<void>; onDiscount: (id: string, discount: number) => Promise<void> }) {
  const initialDiscount = detail?.user.partnerDiscountPercent || 0;
  const [discount, setDiscount] = useState(initialDiscount);
  if (!detail) return <aside className="admin-detail"><div className="admin-empty"><ShieldCheck /><p>Выберите клиента</p></div></aside>;
  const { user } = detail;
  return <aside className="admin-detail"><span>{roleName(user.role)}</span><h2>{user.role === "admin" ? "Администратор" : `${user.firstName} ${user.lastName}`}</h2><p>{user.email}<br />{user.phone}<br />{user.company}<br />{[user.city, user.country].filter(Boolean).join(", ")}</p><p><small>Регистрация: {formatDate(user.createdAt)}<br />Последний вход: {formatDate(user.lastLoginAt)}</small></p>
    {user.role === "partner" && <><div className="admin-actions"><button className="button primary" onClick={() => void onStatus(user.id, "active")}><Check size={16} />Одобрить</button><button className="button outline" onClick={() => void onStatus(user.id, "rejected")}><UserX size={16} />Отклонить</button></div><label className="admin-price-control"><span>Дополнительная скидка партнёра, %</span><div><input type="number" min="0" max="80" step="0.5" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /><button onClick={() => void onDiscount(user.id, discount)} aria-label="Сохранить скидку"><Save /></button></div><small>Применяется к базовой цене для партнёров после входа.</small></label></>}
    <h3>Корзина</h3>{detail.cart?.items?.length ? detail.cart.items.map((item, index) => <div className="admin-cart-line" key={`${item.sku}-${index}`}><span>{item.sku}<small>{item.name}</small></span><b>× {item.quantity}</b></div>) : <p>Корзина пуста</p>}
    <h3>История входов</h3>{detail.sessions?.length ? detail.sessions.slice(0, 8).map((session, index) => <div className="admin-session" key={`${session.createdAt}-${index}`}><strong>{[session.city, session.region, session.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</strong><span>{deviceName(session.userAgent)} · {formatDate(session.lastSeenAt)}</span>{session.referrer && <small>Источник: {session.referrer}</small>}</div>) : <p>Входов пока нет</p>}
    <h3>Подключённые аккаунты</h3>{detail.connectedAccounts?.length ? detail.connectedAccounts.map((account) => <p key={account.provider}>{account.provider}: {account.providerEmail || account.displayName || "подключён"}</p>) : <p>Социальные аккаунты не подключены. Они появятся здесь только после добровольного входа через соответствующий сервис.</p>}
    <h3>Заказы</h3>{detail.orders.length ? detail.orders.map((order) => <p key={order.orderNumber}>{order.orderNumber} · {order.status} · {formatDate(order.createdAt)}</p>) : <p>Заказов нет</p>}
  </aside>;
}

function ProductPriceRow({ product, onSave }: { product: Product; onSave: (id: string, retail: number | null, partner: number | null) => Promise<void> }) {
  const [retail, setRetail] = useState(product.retailPriceUsd?.toString() || "");
  const [partner, setPartner] = useState(product.partnerPriceUsd?.toString() || "");
  return <article><img src={product.image} alt="" /><div><strong>{product.sku}</strong><small>{product.names.ru || product.names.en || product.slug}</small><em>{product.categoryId}</em></div><label><input type="number" min="0" step="0.01" value={retail} placeholder="По запросу" onChange={(event) => setRetail(event.target.value)} /><b>USD</b></label><label><input type="number" min="0" step="0.01" value={partner} placeholder="По запросу" onChange={(event) => setPartner(event.target.value)} /><b>USD</b></label><button className="button primary" onClick={() => void onSave(product.id, retail === "" ? null : Number(retail), partner === "" ? null : Number(partner))}><Save size={16} />Сохранить</button></article>;
}

function GuestList({ guests }: { guests: Guest[] }) {
  if (!guests.length) return <div className="admin-empty admin-guests-empty"><UserRoundCheck /><p>Гости появятся после новых посещений сайта.</p></div>;
  return <div className="admin-guests">{guests.map((guest) => <article key={guest.id}>
    <header><div><strong>Гость {guest.id.slice(0, 8)}</strong><small>{deviceName(guest.userAgent)}</small></div><time>{formatDate(guest.lastSeenAt)}</time></header>
    <div className="admin-guest-meta"><span><MapPin />{[guest.city, guest.region, guest.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</span><span>Первый переход: {guest.referrer || "прямой"}</span><span>Первая страница: {guest.landingPage || "—"}</span><span>Последняя страница: {guest.lastPage || "—"}</span></div>
    <section><h3><ShoppingBag /> Корзина</h3>{guest.cart?.items?.length ? guest.cart.items.map((item, index) => <div className="admin-guest-cart" key={`${item.sku}-${index}`}>{item.image && <img src={item.image} alt="" />}<span><b>{item.sku || "Товар"}</b><small>{item.name}</small></span><strong>× {item.quantity || 1}</strong></div>) : <p>Корзина пуста</p>}</section>
    <section><h3>Оставленные данные</h3>{guest.messages.map((message, index) => <div className="admin-guest-contact" key={`${message.createdAt}-${index}`}><b>{message.name || "Без имени"}</b><a href={message.contact.includes("@") ? `mailto:${message.contact}` : `tel:${message.contact}`}>{message.contact}</a><p>{message.message}</p><small>{formatDate(message.createdAt)} · {message.page || "—"}</small></div>)}{guest.orders.map((order) => <p key={order.orderNumber}><b>Заказ {order.orderNumber}</b><br />{order.customer?.name} · {order.customer?.email} · {order.customer?.phone}</p>)}{guest.sampleRequests.map((request, index) => <p key={request.requestNumber || index}><b>Запрос образцов {request.requestNumber}</b><br />{request.customer?.name} · {request.customer?.email} · {request.customer?.phone}</p>)}{!guest.messages.length && !guest.orders.length && !guest.sampleRequests.length && <p>Контактные данные и формы не оставлял.</p>}</section>
  </article>)}</div>;
}

function AdminLogin() {
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) location.reload(); else setError("Неверные данные или нет доступа администратора.");
  }
  return <form className="admin-login" onSubmit={submit}><span>NORA TRIMTEX</span><h1>Администратор</h1><label>Email<input name="email" type="email" required defaultValue="bordo.studio1@gmail.com" autoComplete="username" /></label><label>Пароль<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p>{error}</p>}<button className="button primary">Войти</button></form>;
}
