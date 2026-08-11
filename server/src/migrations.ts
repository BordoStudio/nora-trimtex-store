import type { Database } from "./db.js";

const migrations = [
  {
    version: "0001_initial",
    sql: `
      create extension if not exists pgcrypto;

      create table if not exists categories (
        id text primary key,
        slug text not null unique,
        names jsonb not null,
        sort_order integer not null default 0,
        active boolean not null default true
      );

      create table if not exists products (
        id text primary key,
        sku text not null unique,
        slug text not null unique,
        category_id text not null references categories(id),
        status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
        names jsonb not null,
        descriptions jsonb,
        primary_image_key text not null,
        media jsonb not null default '[]'::jsonb,
        variants jsonb not null default '[]'::jsonb,
        variant_count integer not null default 0 check (variant_count >= 0),
        tags text[] not null default '{}',
        featured boolean not null default false,
        is_new boolean not null default false,
        attributes jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists sample_requests (
        id uuid primary key default gen_random_uuid(),
        request_number text not null unique,
        locale text not null check (locale in ('en', 'de', 'uk', 'ru')),
        customer jsonb not null,
        items jsonb not null,
        notes text,
        status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'closed')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists products_catalog_idx
        on products (status, category_id, is_new desc, updated_at desc);
      create index if not exists products_featured_idx
        on products (status, featured, updated_at desc);
      create index if not exists products_tags_idx on products using gin (tags);
      create index if not exists categories_active_idx on categories (active, sort_order);
      create index if not exists sample_requests_status_idx
        on sample_requests (status, created_at desc);
      create index if not exists sample_requests_email_idx
        on sample_requests ((customer ->> 'email'), created_at desc);
    `,
  },
  {
    version: "0002_commerce",
    sql: `
      alter table products
        add column if not exists price_usd numeric(12,2)
        check (price_usd is null or price_usd >= 0);

      create table if not exists orders (
        id uuid primary key default gen_random_uuid(),
        order_number text not null unique,
        locale text not null check (locale in ('en', 'de', 'uk', 'ru')),
        customer jsonb not null,
        items jsonb not null,
        currency text not null default 'USD' check (currency = 'USD'),
        priced_subtotal_usd numeric(12,2) not null default 0 check (priced_subtotal_usd >= 0),
        status text not null default 'received' check (status in ('received', 'quoted', 'confirmed', 'paid', 'cancelled')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists orders_status_idx on orders (status, created_at desc);
      create index if not exists orders_email_idx on orders ((customer ->> 'email'), created_at desc);
    `,
  },
  {
    version: "0003_accounts",
    sql: `
      create table if not exists users (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        password_hash text not null,
        role text not null check (role in ('retail', 'partner', 'admin')),
        status text not null default 'email_pending' check (status in ('email_pending', 'pending_approval', 'active', 'rejected', 'disabled')),
        first_name text not null,
        last_name text not null,
        phone text,
        company text,
        country text,
        city text,
        locale text not null default 'en' check (locale in ('en', 'de', 'uk', 'ru')),
        email_verified_at timestamptz,
        approved_at timestamptz,
        approved_by uuid references users(id),
        last_login_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists auth_tokens (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        token_hash text not null unique,
        purpose text not null check (purpose in ('verify_email', 'password_reset')),
        expires_at timestamptz not null,
        used_at timestamptz,
        created_at timestamptz not null default now()
      );

      create table if not exists auth_sessions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        token_hash text not null unique,
        user_agent text,
        ip_hash text,
        expires_at timestamptz not null,
        last_seen_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      );

      create table if not exists carts (
        user_id uuid primary key references users(id) on delete cascade,
        items jsonb not null default '[]'::jsonb,
        locale text not null default 'en' check (locale in ('en', 'de', 'uk', 'ru')),
        country_code text,
        user_agent text,
        ip_hash text,
        updated_at timestamptz not null default now()
      );

      alter table orders add column if not exists user_id uuid references users(id) on delete set null;
      create index if not exists users_role_status_idx on users (role, status, created_at desc);
      create index if not exists auth_sessions_user_idx on auth_sessions (user_id, expires_at desc);
      create index if not exists auth_tokens_user_idx on auth_tokens (user_id, purpose, expires_at desc);
      create index if not exists orders_user_idx on orders (user_id, created_at desc);
    `,
  },
  {
    version: "0004_admin_pricing_and_audit",
    sql: `
      alter table users
        add column if not exists partner_discount_percent numeric(5,2) not null default 0
        check (partner_discount_percent >= 0 and partner_discount_percent <= 80);

      alter table auth_sessions add column if not exists country_code text;
      alter table auth_sessions add column if not exists region text;
      alter table auth_sessions add column if not exists city text;
      alter table auth_sessions add column if not exists referrer text;

      create table if not exists connected_accounts (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        provider text not null,
        provider_email text,
        display_name text,
        created_at timestamptz not null default now(),
        unique (user_id, provider)
      );

      create index if not exists connected_accounts_user_idx
        on connected_accounts (user_id, created_at desc);
      create index if not exists auth_sessions_recent_idx
        on auth_sessions (created_at desc);
    `,
  },
] as const;

export async function runMigrations(db: Database): Promise<void> {
  await db`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = await db<{ version: string }[]>`select version from schema_migrations`;
  const appliedVersions = new Set(applied.map((row) => row.version));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;
    await db.begin(async (transaction) => {
      await transaction.unsafe(migration.sql);
      await transaction`insert into schema_migrations (version) values (${migration.version})`;
    });
  }
}
