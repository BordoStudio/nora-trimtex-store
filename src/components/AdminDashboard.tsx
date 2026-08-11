"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, PackageSearch, RefreshCw, Save, Search, ShieldCheck, UserRoundCheck, UserX } from "lucide-react";

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
type Product = { id: string; sku: string; slug: string; categoryId: string; names: Record<string, string>; priceUsd: number | null; status: string };
type Activity = { userId: string; email: string; firstName: string; lastName: string; countryCode?: string; region?: string; city?: string; userAgent?: string; referrer?: string; lastSeenAt: string };
type Tab = "users" | "products" | "activity";

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("ru", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const deviceName = (ua?: string) => !ua ? "Неизвестное устройство" : /iphone|ipad/i.test(ua) ? "iPhone / iPad" : /android/i.test(ua) ? "Android" : /macintosh|mac os/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "Браузер";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setMessage("");
    const params = new URLSearchParams({ ...(query ? { q: query } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}) });
    const endpoint = tab === "users" ? `/api/admin/users?${params}` : tab === "products" ? `/api/admin/products?${new URLSearchParams({ ...(query ? { q: query } : {}) })}` : "/api/admin/activity";
    const response = await fetch(endpoint);
    if (response.status === 401 || response.status === 403) setNeedsLogin(true);
    else if (response.ok) {
      const payload = (await response.json()).data;
      if (tab === "users") setUsers(payload.items);
      if (tab === "products") setProducts(payload.items);
      if (tab === "activity") setActivity(payload.sessions);
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
  async function savePrice(id: string, priceUsd: number | null) {
    const response = await fetch(`/api/admin/products/${id}/price`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ priceUsd }) });
    setMessage(response.ok ? "Цена товара сохранена." : "Не удалось сохранить цену.");
    if (response.ok) await load();
  }

  if (needsLogin) return <AdminLogin />;
  return <div className="admin-shell">
    <header><div><span>NORA TRIMTEX</span><h1>Управление магазином</h1></div><button className="button outline" onClick={() => void load()}><RefreshCw size={16} />Обновить</button></header>
    <nav className="admin-tabs" aria-label="Разделы админки">
      <button className={tab === "users" ? "active" : ""} onClick={() => { setTab("users"); setQuery(""); }}>Клиенты</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setQuery(""); }}>Цены товаров</button>
      <button className={tab === "activity" ? "active" : ""} onClick={() => { setTab("activity"); setQuery(""); }}>Входы</button>
    </nav>
    {message && <p className="admin-message">{message}</p>}
    {tab !== "activity" && <div className="admin-filters">
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "products" ? "Артикул или название" : "Имя, email, компания"} /></label>
      {tab === "users" && <><select value={role} onChange={(event) => setRole(event.target.value)}><option value="">Все типы</option><option value="retail">Розница</option><option value="partner">Дизайнеры / партнёры</option><option value="admin">Администраторы</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все статусы</option><option value="pending_approval">Ожидают решения</option><option value="active">Активные</option><option value="email_pending">Не подтвердили email</option><option value="rejected">Отклонённые</option><option value="disabled">Отключённые</option></select></>}
    </div>}
    {busy && <div className="admin-loading"><LoaderCircle className="spin" /> Загрузка…</div>}
    {!busy && tab === "users" && <div className="admin-layout"><div className="admin-list">{users.map((user) => <button key={user.id} className={selected?.user.id === user.id ? "active" : ""} onClick={() => void openUser(user.id)}><span><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></span><span><b>{user.role}</b><em data-status={user.status}>{user.status}</em></span><span><small>Корзина: {user.cartItems}</small><small>Заказы: {user.orders}</small></span></button>)}</div><UserDetailPanel key={selected?.user.id || "none"} detail={selected} onStatus={changeStatus} onDiscount={saveDiscount} /></div>}
    {!busy && tab === "products" && <div className="admin-products">{products.map((product) => <ProductPriceRow key={`${product.id}-${product.priceUsd ?? "request"}`} product={product} onSave={savePrice} />)}</div>}
    {!busy && tab === "activity" && <div className="admin-activity">{activity.map((item, index) => <article key={`${item.userId}-${item.lastSeenAt}-${index}`}><UserRoundCheck /><div><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small></div><div><span>{[item.city, item.region, item.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</span><small>{deviceName(item.userAgent)}</small></div><time>{formatDate(item.lastSeenAt)}</time></article>)}</div>}
  </div>;
}

function UserDetailPanel({ detail, onStatus, onDiscount }: { detail: UserDetail | null; onStatus: (id: string, status: string) => Promise<void>; onDiscount: (id: string, discount: number) => Promise<void> }) {
  const initialDiscount = detail?.user.partnerDiscountPercent || 0;
  const [discount, setDiscount] = useState(initialDiscount);
  if (!detail) return <aside className="admin-detail"><div className="admin-empty"><ShieldCheck /><p>Выберите клиента</p></div></aside>;
  const { user } = detail;
  return <aside className="admin-detail"><span>{user.role}</span><h2>{user.firstName} {user.lastName}</h2><p>{user.email}<br />{user.phone}<br />{user.company}<br />{[user.city, user.country].filter(Boolean).join(", ")}</p><p><small>Регистрация: {formatDate(user.createdAt)}<br />Последний вход: {formatDate(user.lastLoginAt)}</small></p>
    {user.role === "partner" && <><div className="admin-actions"><button className="button primary" onClick={() => void onStatus(user.id, "active")}><Check size={16} />Одобрить</button><button className="button outline" onClick={() => void onStatus(user.id, "rejected")}><UserX size={16} />Отклонить</button></div><label className="admin-price-control"><span>Дополнительная скидка дизайнера, %</span><div><input type="number" min="0" max="80" step="0.5" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /><button onClick={() => void onDiscount(user.id, discount)} aria-label="Сохранить скидку"><Save /></button></div><small>Применяется к базовой оптовой цене товара после входа.</small></label></>}
    <h3>Корзина</h3>{detail.cart?.items?.length ? detail.cart.items.map((item, index) => <div className="admin-cart-line" key={`${item.sku}-${index}`}><span>{item.sku}<small>{item.name}</small></span><b>× {item.quantity}</b></div>) : <p>Корзина пуста</p>}
    <h3>История входов</h3>{detail.sessions?.length ? detail.sessions.slice(0, 8).map((session, index) => <div className="admin-session" key={`${session.createdAt}-${index}`}><strong>{[session.city, session.region, session.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</strong><span>{deviceName(session.userAgent)} · {formatDate(session.lastSeenAt)}</span>{session.referrer && <small>Источник: {session.referrer}</small>}</div>) : <p>Входов пока нет</p>}
    <h3>Подключённые аккаунты</h3>{detail.connectedAccounts?.length ? detail.connectedAccounts.map((account) => <p key={account.provider}>{account.provider}: {account.providerEmail || account.displayName || "подключён"}</p>) : <p>Социальные аккаунты не подключены. Они появятся здесь только после добровольного входа через соответствующий сервис.</p>}
    <h3>Заказы</h3>{detail.orders.length ? detail.orders.map((order) => <p key={order.orderNumber}>{order.orderNumber} · {order.status} · {formatDate(order.createdAt)}</p>) : <p>Заказов нет</p>}
  </aside>;
}

function ProductPriceRow({ product, onSave }: { product: Product; onSave: (id: string, price: number | null) => Promise<void> }) {
  const [value, setValue] = useState(product.priceUsd?.toString() || "");
  return <article><PackageSearch /><div><strong>{product.sku}</strong><small>{product.names.ru || product.names.en || product.slug}</small></div><span>{product.categoryId}</span><label><input type="number" min="0" step="0.01" value={value} placeholder="По запросу" onChange={(event) => setValue(event.target.value)} /><b>USD</b></label><button className="button primary" onClick={() => void onSave(product.id, value === "" ? null : Number(value))}><Save size={16} />Сохранить</button></article>;
}

function AdminLogin() {
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) location.reload(); else setError("Неверные данные или нет доступа администратора.");
  }
  return <form className="admin-login" onSubmit={submit}><span>NORA TRIMTEX ADMIN</span><h1>Вход в управление</h1><label>Email<input name="email" type="email" required defaultValue="bordo.studio1@gmail.com" autoComplete="username" /></label><label>Пароль<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p>{error}</p>}<button className="button primary">Войти</button></form>;
}
