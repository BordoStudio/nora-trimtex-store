"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { Check, CirclePlus, Eraser, ExternalLink, Eye, EyeOff, Link2, LoaderCircle, MapPin, PackagePlus, RefreshCw, Save, Search, ShieldCheck, ShoppingBag, Trash2, Upload, UserRoundCheck, UserX } from "lucide-react";

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
type ChinaCandidate = { familyId: string; url: string; sku: string; originalName: string; categoryId: string; previewImage: string; variantCount: number };
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
const roleName = (value: string) => value === "admin" ? "Администратор" : value === "partner" ? "Дизайнер" : "Клиент";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [productTool, setProductTool] = useState<"manual" | "china" | null>(null);
  const [productActionBusy, setProductActionBusy] = useState(false);
  const [chinaCandidates, setChinaCandidates] = useState<ChinaCandidate[] | null>(null);
  const [selectedChinaSkus, setSelectedChinaSkus] = useState<Record<string, boolean>>({});
  const [chinaProgress, setChinaProgress] = useState<{ done: number; total: number } | null>(null);
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
      if (tab === "products") {
        setProducts(payload.items);
        setPriceDrafts(Object.fromEntries(payload.items.map((product: Product) => [product.id, product.partnerPriceUsd?.toString() || ""])));
      }
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
    setSelected((current) => current?.user.id === id ? { ...current, user: { ...current.user, status: nextStatus } } : current);
    setMessage(nextStatus === "active" ? "Доступ дизайнера подтверждён. Пользователю отправлено письмо." : "Статус пользователя изменён.");
    await load(); if (selected?.user.id === id) await openUser(id);
  }
  async function deleteUser(id: string) {
    if (!window.confirm("Удалить пользователя и его активные сессии? История заказов останется сохранена.")) return;
    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Не удалось удалить пользователя.");
    setSelected(null); setUsers((items) => items.filter((user) => user.id !== id)); setMessage("Пользователь удалён.");
  }
  async function clearGuests() {
    if (!window.confirm("Очистить список гостей, их корзины и сообщения?")) return;
    const response = await fetch("/api/admin/guests", { method: "DELETE" });
    if (!response.ok) return setMessage("Не удалось очистить список гостей.");
    setGuests([]); setMessage("Список гостей очищен.");
  }
  async function savePrice(id: string, designerPriceUsd: number | null) {
    const clientPriceUsd = designerPriceUsd === null ? null : Number((designerPriceUsd * 2).toFixed(2));
    const response = await fetch(`/api/admin/products/${id}/price`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ retailPriceUsd: clientPriceUsd, partnerPriceUsd: designerPriceUsd }) });
    setMessage(response.ok ? "Цена дизайнера сохранена. Цена клиента рассчитана ×2." : "Не удалось сохранить цену.");
    if (response.ok) setProducts((items) => items.map((product) => product.id === id ? { ...product, retailPriceUsd: clientPriceUsd, partnerPriceUsd: designerPriceUsd } : product));
    return response.ok;
  }
  async function saveAllPrices() {
    const changed = products.filter((product) => (product.partnerPriceUsd?.toString() || "") !== (priceDrafts[product.id] ?? ""));
    if (!changed.length) return setMessage("Изменений цен нет.");
    setSavingPrices(true);
    const results = await Promise.all(changed.map((product) => {
      const value = priceDrafts[product.id] ?? "";
      const designerPrice = value === "" ? null : Number(value);
      const clientPrice = designerPrice === null ? null : Number((designerPrice * 2).toFixed(2));
      return fetch(`/api/admin/products/${product.id}/price`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ retailPriceUsd: clientPrice, partnerPriceUsd: designerPrice }) })
        .then((response) => ({ id: product.id, ok: response.ok, designerPrice, clientPrice }));
    }));
    const saved = results.filter((result) => result.ok);
    const savedById = new Map(saved.map((result) => [result.id, result]));
    setProducts((items) => items.map((product) => {
      const result = savedById.get(product.id);
      return result ? { ...product, retailPriceUsd: result.clientPrice, partnerPriceUsd: result.designerPrice } : product;
    }));
    setSavingPrices(false);
    setMessage(saved.length === changed.length ? `Сохранено цен: ${saved.length}.` : `Сохранено ${saved.length} из ${changed.length}. Проверьте отмеченные позиции.`);
  }
  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setProductActionBusy(true); setMessage("");
    const response = await fetch("/api/admin/products", { method: "POST", body: new FormData(form) });
    const payload = await response.json().catch(() => ({})) as { error?: string; data?: { sku?: string } };
    setProductActionBusy(false);
    if (!response.ok) return setMessage(payload.error || "Не удалось добавить товар.");
    form.reset(); setProductTool(null); setMessage(`Товар ${payload.data?.sku || ""} добавлен.`); await load();
  }
  async function importChinaProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setProductActionBusy(true); setMessage("Загружаем товар и изображения…");
    const response = await fetch("/api/admin/products/import-china", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const payload = await response.json().catch(() => ({})) as { error?: string; data?: { sku?: string } };
    setProductActionBusy(false);
    if (!response.ok) return setMessage(payload.error || "Не удалось импортировать товар.");
    form.reset(); setProductTool(null); setMessage(`Товар ${payload.data?.sku || ""} импортирован.`); await load();
  }
  async function syncChinaProducts() {
    setProductActionBusy(true); setChinaProgress(null); setMessage("Проверяем все страницы китайского каталога…");
    const response = await fetch("/api/admin/products/sync-china", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const payload = await response.json().catch(() => ({})) as { error?: string; data?: { scanned: number; totalPages: number; items: ChinaCandidate[] } };
    setProductActionBusy(false);
    if (!response.ok || !payload.data) return setMessage(payload.error || "Не удалось проверить каталог.");
    setProductTool(null);
    setChinaCandidates(payload.data.items);
    setSelectedChinaSkus(Object.fromEntries(payload.data.items.map((item) => [item.sku, true])));
    setMessage(payload.data.items.length ? `Найдено новых позиций: ${payload.data.items.length}. Проверьте список и снимите ненужные галочки.` : `Проверено ${payload.data.scanned} товаров на ${payload.data.totalPages} страницах. Новых позиций нет.`);
  }
  async function importSelectedChinaProducts(status: "draft" | "active") {
    const selected = (chinaCandidates || []).filter((item) => selectedChinaSkus[item.sku]);
    if (!selected.length) return setMessage("Отметьте хотя бы один товар для импорта.");
    setProductActionBusy(true); setChinaProgress({ done: 0, total: selected.length }); setMessage(`Переносим выбранные товары: 0 из ${selected.length}…`);
    const succeeded = new Set<string>();
    const failed: Array<{ sku: string; error: string }> = [];
    let cursor = 0;
    let completed = 0;
    const worker = async () => {
      while (cursor < selected.length) {
        const item = selected[cursor++];
        if (!item) continue;
        try {
          const response = await fetch("/api/admin/products/import-china", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: item.url, status }) });
          const payload = await response.json().catch(() => ({})) as { error?: string };
          if (!response.ok) throw new Error(payload.error || `Ошибка ${response.status}`);
          succeeded.add(item.sku);
        } catch (error) {
          failed.push({ sku: item.sku, error: error instanceof Error ? error.message : "Неизвестная ошибка" });
        } finally {
          completed += 1;
          setChinaProgress({ done: completed, total: selected.length });
          setMessage(`Переносим выбранные товары: ${completed} из ${selected.length}…`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, selected.length) }, () => worker()));
    setProductActionBusy(false); setChinaProgress(null);
    setChinaCandidates((items) => items?.filter((item) => !succeeded.has(item.sku)) || []);
    setSelectedChinaSkus((current) => Object.fromEntries(Object.entries(current).filter(([sku]) => !succeeded.has(sku))));
    if (succeeded.size) await load();
    setMessage(failed.length ? `Перенесено ${succeeded.size} из ${selected.length}. Не удалось: ${failed.map((item) => item.sku).join(", ")}.` : `Готово. Перенесено товаров: ${succeeded.size}.`);
  }

  if (needsLogin) return <AdminLogin />;
  return <div className="admin-shell">
    <header><div><span>NORA TRIMTEX</span><h1>Администратор</h1></div><button className="button outline" onClick={() => void load()}><RefreshCw size={16} />Обновить</button></header>
    <nav className="admin-tabs" aria-label="Разделы админки">
      <button className={tab === "users" ? "active" : ""} onClick={() => { setTab("users"); setQuery(""); }}>Клиенты</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setQuery(""); }}>Товары и цены</button>
      <button className={tab === "guests" ? "active" : ""} onClick={() => { setTab("guests"); setQuery(""); }}>Гости</button>
      <button className={tab === "activity" ? "active" : ""} onClick={() => { setTab("activity"); setQuery(""); }}>Входы</button>
    </nav>
    {message && <p className="admin-message">{message}</p>}
    {tab === "products" && <ProductManagement activeTool={productTool} busy={productActionBusy} candidates={chinaCandidates} selectedSkus={selectedChinaSkus} progress={chinaProgress} onTool={setProductTool} onCreate={createProduct} onImport={importChinaProduct} onScan={syncChinaProducts} onToggle={(sku, checked) => setSelectedChinaSkus((current) => ({ ...current, [sku]: checked }))} onToggleAll={(checked) => setSelectedChinaSkus(Object.fromEntries((chinaCandidates || []).map((item) => [item.sku, checked])))} onImportSelected={importSelectedChinaProducts} onCloseSelection={() => { setChinaCandidates(null); setSelectedChinaSkus({}); }} />}
    {(tab === "users" || tab === "products") && <div className="admin-filters">
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "products" ? "Артикул или название" : "Имя, email, компания"} /></label>
      {tab === "users" && <><select value={role} onChange={(event) => setRole(event.target.value)}><option value="">Все типы</option><option value="retail">Клиенты</option><option value="partner">Дизайнеры</option><option value="admin">Администраторы</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все статусы</option><option value="pending_approval">Ожидают решения</option><option value="active">Активные</option><option value="email_pending">Не подтвердили email</option><option value="rejected">Отклонённые</option><option value="disabled">Отключённые</option></select></>}
    </div>}
    {busy && <div className="admin-loading"><LoaderCircle className="spin" /> Загрузка…</div>}
    {!busy && tab === "users" && <div className="admin-layout"><div className="admin-list">{users.map((user) => <button key={user.id} className={selected?.user.id === user.id ? "active" : ""} onClick={() => void openUser(user.id)}><span><strong>{user.role === "admin" ? "Администратор" : `${user.firstName} ${user.lastName}`}</strong><small>{user.email}</small></span><span><b>{roleName(user.role)}</b><em data-status={user.status}>{user.status}</em></span><span><small>Корзина: {user.cartItems}</small><small>Заказы: {user.orders}</small></span></button>)}</div><UserDetailPanel key={selected?.user.id || "none"} detail={selected} onStatus={changeStatus} onDelete={deleteUser} /></div>}
    {!busy && tab === "products" && <><div className="admin-products-toolbar"><span>Изменено: {products.filter((product) => (product.partnerPriceUsd?.toString() || "") !== (priceDrafts[product.id] ?? "")).length}</span><button className="button primary" disabled={savingPrices} onClick={() => void saveAllPrices()}>{savingPrices ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{savingPrices ? "Сохраняем…" : "Сохранить все"}</button></div><div className="admin-products"><div className="admin-products-head"><span>Товар</span><span>Для клиентов (×2)</span><span>Для дизайнеров (×1)</span><span /></div>{products.map((product) => <ProductPriceRow key={product.id} product={product} designer={priceDrafts[product.id] ?? ""} onDesignerChange={(value) => setPriceDrafts((drafts) => ({ ...drafts, [product.id]: value }))} onSave={savePrice} saving={savingPrices} />)}</div></>}
    {!busy && tab === "guests" && <><div className="admin-section-actions"><button className="button danger" onClick={() => void clearGuests()}><Eraser size={16} />Очистить список гостей</button></div><GuestList guests={guests} /></>}
    {!busy && tab === "activity" && <div className="admin-activity">{activity.map((item, index) => <article key={`${item.userId}-${item.lastSeenAt}-${index}`}><UserRoundCheck /><div><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small></div><div><span>{[item.city, item.region, item.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</span><small>{deviceName(item.userAgent)}</small></div><time>{formatDate(item.lastSeenAt)}</time></article>)}</div>}
  </div>;
}

const productCategories = [
  ["tassels-large", "Большие кисти"], ["tassels-small", "Малые кисти"], ["tassel-trim", "Бахрома с кистями"],
  ["decorative-tapes", "Бордюры и тесьмы"], ["fringe", "Бахрома"], ["cord-fringe", "Шнуровая бахрома"],
  ["cords", "Шнуры и канты"], ["holdbacks", "Крючки и розетки"], ["home", "Декор для дома"], ["samples", "Образцы"],
] as const;

function ProductManagement({ activeTool, busy, candidates, selectedSkus, progress, onTool, onCreate, onImport, onScan, onToggle, onToggleAll, onImportSelected, onCloseSelection }: {
  activeTool: "manual" | "china" | null;
  busy: boolean;
  candidates: ChinaCandidate[] | null;
  selectedSkus: Record<string, boolean>;
  progress: { done: number; total: number } | null;
  onTool: (tool: "manual" | "china" | null) => void;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onImport: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onScan: () => Promise<void>;
  onToggle: (sku: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onImportSelected: (status: "draft" | "active") => Promise<void>;
  onCloseSelection: () => void;
}) {
  const [selectionStatus, setSelectionStatus] = useState<"draft" | "active">("active");
  const selectedCount = candidates?.filter((item) => selectedSkus[item.sku]).length || 0;
  return <section className="admin-product-tools">
    <div className="admin-product-tool-actions">
      <button className={activeTool === "manual" ? "button primary" : "button outline"} onClick={() => onTool(activeTool === "manual" ? null : "manual")}><CirclePlus size={17} />Добавить вручную</button>
      <button className={activeTool === "china" ? "button primary" : "button outline"} onClick={() => onTool(activeTool === "china" ? null : "china")}><Link2 size={17} />Импорт по ссылке</button>
      <button className="button outline" disabled={busy} onClick={() => void onScan()}>{busy && !progress ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}Проверить китайский сайт</button>
    </div>
    {activeTool === "manual" && <form className="admin-product-form" onSubmit={(event) => void onCreate(event)}>
      <div className="admin-form-heading"><PackagePlus /><div><h2>Новый товар</h2><p>Артикул, категория и русское название обязательны. Остальные языки можно заполнить позже.</p></div></div>
      <div className="admin-form-grid">
        <label>Артикул<input name="sku" required maxLength={80} autoComplete="off" /></label>
        <label>Категория<select name="categoryId" required defaultValue=""><option value="" disabled>Выберите категорию</option>{productCategories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Название RU<input name="nameRu" required /></label>
        <label>Название UA<input name="nameUk" /></label>
        <label>Название DE<input name="nameDe" /></label>
        <label>Название EN<input name="nameEn" /></label>
        <label>Цена для дизайнеров, USD<input name="partnerPriceUsd" type="number" min="0" max="1000000" step="0.01" /></label>
        <label>Публикация<select name="status" defaultValue="active"><option value="active">Сразу на сайте</option><option value="draft">Черновик</option></select></label>
        <label className="admin-form-wide">Описание<textarea name="description" rows={3} /></label>
        <label className="admin-form-wide admin-file-field">Изображения<input name="images" type="file" accept="image/*" multiple required /><small>Первое изображение станет главным. До 24 файлов, каждый до 12 МБ.</small></label>
        <label className="admin-checkbox"><input name="isNew" type="checkbox" defaultChecked />Показывать метку «Новинка»</label>
      </div>
      <button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}{busy ? "Загружаем…" : "Добавить товар"}</button>
    </form>}
    {activeTool === "china" && <form className="admin-product-form admin-product-import-form" onSubmit={(event) => void onImport(event)}>
      <div className="admin-form-heading"><Link2 /><div><h2>Импорт товара по ссылке</h2><p>Сайт сам войдёт в китайский каталог, скачает все варианты изображений и создаст карточку.</p></div></div>
      <label className="admin-form-wide">Ссылка на товар<input name="url" type="url" required placeholder="http://www.chinatrimming.cn/commodities/show-20101.html" /></label>
      <label>Публикация<select name="status" defaultValue="active"><option value="active">Сразу на сайте</option><option value="draft">Черновик</option></select></label>
      <button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}{busy ? "Импортируем…" : "Импортировать"}</button>
    </form>}
    {candidates !== null && <div className="admin-china-selection">
      <header><div><span>НОВЫЕ ПОЗИЦИИ</span><h2>{candidates.length ? `${candidates.length} найдено · ${selectedCount} выбрано` : "Новых товаров нет"}</h2><p>Все новые позиции отмечены. Снимите галочки с товаров, которые переносить не нужно.</p></div><button type="button" className="button outline" disabled={busy} onClick={onCloseSelection}>Закрыть</button></header>
      {!!candidates.length && <>
        <div className="admin-china-selection-bar">
          <label className="admin-checkbox"><input type="checkbox" checked={selectedCount === candidates.length} onChange={(event) => onToggleAll(event.target.checked)} />Выбрать все</label>
          <label>Публикация<select value={selectionStatus} onChange={(event) => setSelectionStatus(event.target.value as "draft" | "active")} disabled={busy}><option value="active">Сразу на сайте</option><option value="draft">Черновики</option></select></label>
          <button className="button primary" disabled={busy || !selectedCount} onClick={() => void onImportSelected(selectionStatus)}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}{progress ? `Переносим ${progress.done}/${progress.total}` : `Перенести выбранные (${selectedCount})`}</button>
        </div>
        <div className="admin-china-grid">{candidates.map((item) => <label key={item.sku} className={selectedSkus[item.sku] ? "selected" : ""}>
          <input type="checkbox" checked={Boolean(selectedSkus[item.sku])} disabled={busy} onChange={(event) => onToggle(item.sku, event.target.checked)} />
          {item.previewImage ? <img src={`/api/admin/products/china-preview?url=${encodeURIComponent(item.previewImage)}`} alt="" /> : <span className="admin-china-image-empty">Нет фото</span>}
          <span><strong>{item.sku}</strong><small>{item.originalName || "Без названия"}</small><em>{item.categoryId} · {item.variantCount} фото</em></span>
          <a href={item.url} target="_blank" rel="noreferrer" title="Открыть на китайском сайте" onClick={(event) => event.stopPropagation()}><ExternalLink size={16} /></a>
        </label>)}</div>
      </>}
    </div>}
  </section>;
}

function UserDetailPanel({ detail, onStatus, onDelete }: { detail: UserDetail | null; onStatus: (id: string, status: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  if (!detail) return <aside className="admin-detail"><div className="admin-empty"><ShieldCheck /><p>Выберите клиента</p></div></aside>;
  const { user } = detail;
  return <aside className="admin-detail"><span>{roleName(user.role)}</span><h2>{user.role === "admin" ? "Администратор" : `${user.firstName} ${user.lastName}`}</h2><p>{user.email}<br />{user.phone}<br />{user.company}<br />{[user.city, user.country].filter(Boolean).join(", ")}</p><p><small>Регистрация: {formatDate(user.createdAt)}<br />Последний вход: {formatDate(user.lastLoginAt)}</small></p>
    {user.role === "partner" && user.status === "pending_approval" && <div className="admin-actions"><button className="button primary" onClick={() => void onStatus(user.id, "active")}><Check size={16} />Одобрить как дизайнера</button><button className="button outline" onClick={() => void onStatus(user.id, "rejected")}><UserX size={16} />Отклонить</button></div>}
    {user.role === "partner" && user.status === "active" && <p className="admin-approved"><Check size={16} />Доступ к ценам для дизайнеров активен</p>}
    {user.role !== "admin" && <button className="button danger admin-delete-user" onClick={() => void onDelete(user.id)}><Trash2 size={16} />Удалить пользователя</button>}
    <h3>Корзина</h3>{detail.cart?.items?.length ? detail.cart.items.map((item, index) => <div className="admin-cart-line" key={`${item.sku}-${index}`}><span>{item.sku}<small>{item.name}</small></span><b>× {item.quantity}</b></div>) : <p>Корзина пуста</p>}
    <h3>История входов</h3>{detail.sessions?.length ? detail.sessions.slice(0, 8).map((session, index) => <div className="admin-session" key={`${session.createdAt}-${index}`}><strong>{[session.city, session.region, session.countryCode].filter(Boolean).join(", ") || "Локация не определена"}</strong><span>{deviceName(session.userAgent)} · {formatDate(session.lastSeenAt)}</span>{session.referrer && <small>Источник: {session.referrer}</small>}</div>) : <p>Входов пока нет</p>}
    <h3>Подключённые аккаунты</h3>{detail.connectedAccounts?.length ? detail.connectedAccounts.map((account) => <p key={account.provider}>{account.provider}: {account.providerEmail || account.displayName || "подключён"}</p>) : <p>Социальные аккаунты не подключены. Они появятся здесь только после добровольного входа через соответствующий сервис.</p>}
    <h3>Заказы</h3>{detail.orders.length ? detail.orders.map((order) => <p key={order.orderNumber}>{order.orderNumber} · {order.status} · {formatDate(order.createdAt)}</p>) : <p>Заказов нет</p>}
  </aside>;
}

function ProductPriceRow({ product, designer, onDesignerChange, onSave, saving }: { product: Product; designer: string; onDesignerChange: (value: string) => void; onSave: (id: string, designer: number | null) => Promise<boolean>; saving: boolean }) {
  const numericDesignerPrice = designer === "" ? null : Number(designer);
  const clientPrice = numericDesignerPrice === null || !Number.isFinite(numericDesignerPrice) ? "" : (numericDesignerPrice * 2).toFixed(2);
  const changed = (product.partnerPriceUsd?.toString() || "") !== designer;
  return <article className={changed ? "is-price-dirty" : ""}><img src={product.image} alt="" /><div><strong>{product.sku}</strong><small>{product.names.ru || product.names.en || product.slug}</small><em>{product.categoryId}</em></div><label><input type="number" value={clientPrice} placeholder="—" readOnly aria-label={`Цена для клиента ${product.sku}`} /><b>USD</b></label><label><input type="number" min="0" step="0.01" value={designer} placeholder="Добавить цену" onChange={(event) => onDesignerChange(event.target.value)} aria-label={`Цена для дизайнера ${product.sku}`} /><b>USD</b></label><button className="button primary" disabled={saving || !changed || (designer !== "" && !Number.isFinite(numericDesignerPrice))} onClick={() => void onSave(product.id, numericDesignerPrice)}><Save size={16} />Сохранить</button></article>;
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
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) location.reload(); else setError("Неверные данные или нет доступа администратора.");
  }
  return <form className="admin-login" onSubmit={submit}><span>NORA TRIMTEX</span><h1>Администратор</h1><label>Email<input name="email" type="email" required defaultValue="bordostudio.tex@gmail.com" autoComplete="username" /></label><label>Пароль<span className="password-input"><input name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" /><button type="button" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} aria-pressed={showPassword} title={showPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>{error && <p>{error}</p>}<button className="button primary">Войти</button></form>;
}
