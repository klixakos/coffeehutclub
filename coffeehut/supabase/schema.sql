-- Coffee Hut · Hut Club · πλήρες σχήμα
create extension if not exists pgcrypto;

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cooldown_minutes int not null default 30,
  max_per_day int not null default 2,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null,
  phone text not null,
  pin_hash text not null,
  qr_token text not null unique,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, phone)
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null,
  username text not null,
  pin_hash text not null,
  role text not null default 'staff' check (role in ('staff','owner')),
  is_active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  unique (store_id, username)
);

-- Κάθε σφραγίδα είναι μία γραμμή. Δεν διαγράφεται ποτέ, μόνο ακυρώνεται.
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  customer_id uuid not null references customers(id),
  staff_id uuid not null references staff(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid
);
create index if not exists visits_customer_idx on visits (customer_id, created_at);

create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  customer_id uuid not null references customers(id),
  staff_id uuid not null references staff(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create index if not exists redemptions_customer_idx on redemptions (customer_id);

alter table stores enable row level security;
alter table customers enable row level security;
alter table staff enable row level security;
alter table visits enable row level security;
alter table redemptions enable row level security;

insert into stores (name) select 'Coffee Hut' where not exists (select 1 from stores);

create or replace function add_stamp(p_customer uuid, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c customers%rowtype; s stores%rowtype; total int; redeemed int; progress int;
        last_at timestamptz; today_cnt int; new_id uuid;
begin
  select * into c from customers where id = p_customer for update;
  if not found then return json_build_object('ok', false, 'code', 'not_found'); end if;
  if c.is_blocked then return json_build_object('ok', false, 'code', 'blocked'); end if;
  select * into s from stores where id = c.store_id;
  select count(*) into total from visits where customer_id = c.id and voided_at is null;
  select count(*) into redeemed from redemptions where customer_id = c.id and voided_at is null;
  progress := total - 10 * redeemed;
  if progress >= 10 then return json_build_object('ok', false, 'code', 'card_full'); end if;
  select max(created_at) into last_at from visits where customer_id = c.id and voided_at is null;
  if last_at is not null and last_at > now() - make_interval(mins => s.cooldown_minutes) then
    return json_build_object('ok', false, 'code', 'cooldown',
      'retry_at', last_at + make_interval(mins => s.cooldown_minutes));
  end if;
  select count(*) into today_cnt from visits
    where customer_id = c.id and voided_at is null
      and (created_at at time zone 'Europe/Athens')::date = (now() at time zone 'Europe/Athens')::date;
  if today_cnt >= s.max_per_day then return json_build_object('ok', false, 'code', 'daily_limit'); end if;
  insert into visits (store_id, customer_id, staff_id) values (c.store_id, c.id, p_staff) returning id into new_id;
  return json_build_object('ok', true, 'visit_id', new_id, 'progress', progress + 1);
end $$;

create or replace function redeem_card(p_customer uuid, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c customers%rowtype; total int; redeemed int;
begin
  select * into c from customers where id = p_customer for update;
  if not found then return json_build_object('ok', false, 'code', 'not_found'); end if;
  select count(*) into total from visits where customer_id = c.id and voided_at is null;
  select count(*) into redeemed from redemptions where customer_id = c.id and voided_at is null;
  if total - 10 * redeemed < 10 then return json_build_object('ok', false, 'code', 'not_ready'); end if;
  insert into redemptions (store_id, customer_id, staff_id) values (c.store_id, c.id, p_staff);
  return json_build_object('ok', true);
end $$;

create or replace function void_visit(p_visit uuid, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update visits set voided_at = now(), voided_by = p_staff
   where id = p_visit and staff_id = p_staff and voided_at is null
     and created_at > now() - interval '2 minutes';
  get diagnostics n = row_count;
  return json_build_object('ok', n > 0);
end $$;

revoke all on function add_stamp(uuid, uuid) from public, anon, authenticated;
revoke all on function redeem_card(uuid, uuid) from public, anon, authenticated;
revoke all on function void_visit(uuid, uuid) from public, anon, authenticated;
