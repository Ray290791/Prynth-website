-- Carts Table (for items in the cart)
create table if not exists carts (
  id serial primary key,
  user_id text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carts_user_id_idx on carts (user_id);

-- Orders Table
create table if not exists orders (
  id serial primary key,
  user_id text not null,
  status text not null default 'pending',
  total numeric not null default 0.00,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on orders (user_id);

-- Tickets Table (for custom orders or support tickets)
create table if not exists tickets (
  id serial primary key,
  user_id text not null,
  title text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists tickets_user_id_idx on tickets (user_id);
