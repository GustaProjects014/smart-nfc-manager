
create type public.app_role as enum ('admin','revendedor');
create type public.plate_status as enum ('disponivel','reservada','vendida','atribuida','defeituosa','perdida');
create type public.payment_status as enum ('pendente','parcial','pago');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "own or admin profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own or admin roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- first user becomes admin, the rest get nothing until admin assigns
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- settings
create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'NFC Control',
  low_stock_threshold int not null default 10,
  public_base_url text,
  updated_at timestamptz not null default now()
);
insert into public.settings(id) values (1);
grant select, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "read settings" on public.settings for select to authenticated using (true);
create policy "admin update settings" on public.settings for update to authenticated using (public.is_admin());

-- models
create table public.plate_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_cost numeric(12,2),
  default_price numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.plate_models(name) values ('Padrão');
grant select, insert, update on public.plate_models to authenticated;
grant all on public.plate_models to service_role;
alter table public.plate_models enable row level security;
create policy "read models" on public.plate_models for select to authenticated using (true);
create policy "admin insert models" on public.plate_models for insert to authenticated with check (public.is_admin());
create policy "admin update models" on public.plate_models for update to authenticated using (public.is_admin());

-- code counter
create table public.code_counter (id int primary key default 1 check (id=1), last_seq bigint not null default 0);
insert into public.code_counter(id, last_seq) values (1, 0);
grant all on public.code_counter to service_role;
alter table public.code_counter enable row level security;

create or replace function public.format_nfc_code(_seq bigint) returns text language sql immutable as $$
  select 'NFC ' || case when length(_seq::text) < 3 then lpad(_seq::text, 3, '0') else _seq::text end
$$;

-- stock entries
create table public.stock_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number bigint generated always as identity unique,
  quantity int not null check (quantity > 0 and quantity <= 5000),
  first_seq bigint not null,
  last_seq bigint not null,
  model_id uuid not null references public.plate_models(id),
  received_date date not null default current_date,
  supplier text,
  unit_cost numeric(12,2),
  total_cost numeric(14,2),
  notes text,
  stock_before int not null,
  stock_after int not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.stock_entries(received_date);
grant select on public.stock_entries to authenticated;
grant all on public.stock_entries to service_role;
alter table public.stock_entries enable row level security;
create policy "admin read entries" on public.stock_entries for select to authenticated using (public.is_admin());

-- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  reseller_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.customers(reseller_id);
grant select, insert, update on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "read customers" on public.customers for select to authenticated using (public.is_admin() or reseller_id = auth.uid() or created_by = auth.uid());
create policy "insert customers" on public.customers for insert to authenticated with check (public.is_admin() or (public.has_role(auth.uid(),'revendedor') and reseller_id = auth.uid()));
create policy "update customers" on public.customers for update to authenticated using (public.is_admin() or reseller_id = auth.uid());

-- sales
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number bigint generated always as identity unique,
  customer_id uuid not null references public.customers(id),
  sale_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  payment_method text,
  payment_status public.payment_status not null default 'pendente',
  reseller_id uuid,
  notes text,
  cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.sales(customer_id); create index on public.sales(reseller_id); create index on public.sales(sale_date);
grant select on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "read sales" on public.sales for select to authenticated using (public.is_admin() or reseller_id = auth.uid());

-- plates
create table public.plates (
  id uuid primary key default gen_random_uuid(),
  seq bigint not null unique,
  code text not null unique,
  slug text not null unique,
  model_id uuid not null references public.plate_models(id),
  entry_id uuid not null references public.stock_entries(id),
  status public.plate_status not null default 'disponivel',
  destination_url text,
  qr_active boolean not null default true,
  qr_updated_at timestamptz,
  customer_id uuid references public.customers(id),
  sale_id uuid references public.sales(id),
  reseller_id uuid,
  created_at timestamptz not null default now()
);
create index on public.plates(status); create index on public.plates(customer_id); create index on public.plates(reseller_id); create index on public.plates(model_id);
grant select on public.plates to authenticated;
grant all on public.plates to service_role;
alter table public.plates enable row level security;
create policy "read plates" on public.plates for select to authenticated using (public.is_admin() or reseller_id = auth.uid());

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  plate_id uuid not null references public.plates(id),
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2),
  created_at timestamptz not null default now()
);
create index on public.sale_items(sale_id); create index on public.sale_items(plate_id);
grant select on public.sale_items to authenticated;
grant all on public.sale_items to service_role;
alter table public.sale_items enable row level security;
create policy "read sale items" on public.sale_items for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and (public.is_admin() or s.reseller_id = auth.uid())));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  amount numeric(14,2) not null,
  method text,
  paid_at date not null default current_date,
  is_reversal boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.payments(sale_id); create index on public.payments(paid_at);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "read payments" on public.payments for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and (public.is_admin() or s.reseller_id = auth.uid())));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text,
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "admin read expenses" on public.expenses for select to authenticated using (public.is_admin());
create policy "admin insert expenses" on public.expenses for insert to authenticated with check (public.is_admin());

create table public.plate_movements (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid not null references public.plates(id),
  from_status public.plate_status,
  to_status public.plate_status not null,
  action text not null,
  reason text,
  reference_id uuid,
  actor uuid,
  created_at timestamptz not null default now()
);
create index on public.plate_movements(plate_id); create index on public.plate_movements(created_at);
grant select on public.plate_movements to authenticated;
grant all on public.plate_movements to service_role;
alter table public.plate_movements enable row level security;
create policy "read movements" on public.plate_movements for select to authenticated using (public.is_admin() or exists (select 1 from public.plates p where p.id = plate_id and p.reseller_id = auth.uid()));

create table public.qr_history (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid not null references public.plates(id),
  action text not null,
  old_url text,
  new_url text,
  actor uuid,
  created_at timestamptz not null default now()
);
create index on public.qr_history(plate_id);
grant select on public.qr_history to authenticated;
grant all on public.qr_history to service_role;
alter table public.qr_history enable row level security;
create policy "read qr history" on public.qr_history for select to authenticated using (public.is_admin() or exists (select 1 from public.plates p where p.id = plate_id and p.reseller_id = auth.uid()));

-- ============ RPCs ============
create or replace function public.next_nfc_seq() returns bigint language sql stable security definer set search_path = public as $$
  select last_seq + 1 from public.code_counter where id = 1
$$;

create or replace function public.create_stock_entry(_quantity int, _model_id uuid, _received_date date, _supplier text, _unit_cost numeric, _notes text)
returns public.stock_entries language plpgsql security definer set search_path = public as $$
declare v_first bigint; v_last bigint; v_before int; v_entry public.stock_entries;
begin
  if not public.is_admin() then raise exception 'Apenas administradores podem registrar entradas'; end if;
  if _quantity is null or _quantity < 1 or _quantity > 5000 then raise exception 'Quantidade inválida'; end if;
  if _unit_cost is not null and _unit_cost < 0 then raise exception 'Custo inválido'; end if;
  -- lock counter row: serializes concurrent entries
  select last_seq + 1 into v_first from public.code_counter where id = 1 for update;
  v_last := v_first + _quantity - 1;
  select count(*) into v_before from public.plates;
  insert into public.stock_entries(quantity, first_seq, last_seq, model_id, received_date, supplier, unit_cost, total_cost, notes, stock_before, stock_after, created_by)
  values (_quantity, v_first, v_last, _model_id, coalesce(_received_date, current_date), nullif(trim(_supplier),''), _unit_cost, case when _unit_cost is null then null else _unit_cost*_quantity end, nullif(trim(_notes),''), v_before, v_before + _quantity, auth.uid())
  returning * into v_entry;
  insert into public.plates(seq, code, slug, model_id, entry_id)
  select s, public.format_nfc_code(s), replace(public.format_nfc_code(s),' ','-'), _model_id, v_entry.id from generate_series(v_first, v_last) s;
  insert into public.plate_movements(plate_id, from_status, to_status, action, reason, reference_id, actor)
  select id, null, 'disponivel', 'entrada', 'Entrada #' || v_entry.entry_number, v_entry.id, auth.uid() from public.plates where entry_id = v_entry.id;
  update public.code_counter set last_seq = v_last where id = 1;
  return v_entry;
end $$;

-- generic status change (admin) / reserve (reseller own)
create or replace function public.change_plate_status(_plate_id uuid, _action text, _reason text, _reseller_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.plates; v_new public.plate_status; v_admin boolean := public.is_admin();
begin
  select * into p from public.plates where id = _plate_id for update;
  if not found then raise exception 'Plaquinha não encontrada'; end if;
  if not v_admin and not (p.reseller_id = auth.uid() and _action in ('reservar','cancelar_reserva')) then raise exception 'Sem permissão'; end if;
  if _action = 'reservar' then
    if p.status not in ('disponivel','atribuida') then raise exception 'Somente unidades disponíveis podem ser reservadas'; end if;
    v_new := 'reservada';
  elsif _action = 'cancelar_reserva' then
    if p.status <> 'reservada' then raise exception 'A unidade não está reservada'; end if;
    v_new := case when p.reseller_id is not null then 'atribuida' else 'disponivel' end;
  elsif _action = 'atribuir' then
    if p.status <> 'disponivel' then raise exception 'Somente unidades disponíveis podem ser atribuídas'; end if;
    if _reseller_id is null or not public.has_role(_reseller_id,'revendedor') then raise exception 'Revendedor inválido'; end if;
    v_new := 'atribuida';
    update public.plates set reseller_id = _reseller_id where id = p.id;
  elsif _action = 'devolver' then
    if p.status not in ('atribuida','reservada') then raise exception 'Devolução só para unidades atribuídas ou reservadas'; end if;
    if coalesce(trim(_reason),'') = '' then raise exception 'Informe o motivo'; end if;
    v_new := 'disponivel';
    update public.plates set reseller_id = null where id = p.id;
  elsif _action in ('baixa_defeito','baixa_perda') then
    if p.status = 'vendida' then raise exception 'Unidade vendida: cancele a venda antes'; end if;
    if p.status in ('defeituosa','perdida') then raise exception 'Unidade já baixada'; end if;
    if coalesce(trim(_reason),'') = '' then raise exception 'Informe o motivo'; end if;
    v_new := case when _action = 'baixa_defeito' then 'defeituosa' else 'perdida' end;
  elsif _action = 'reativar' then
    if p.status not in ('defeituosa','perdida') then raise exception 'Somente unidades baixadas podem ser reativadas'; end if;
    if coalesce(trim(_reason),'') = '' then raise exception 'Informe o motivo da correção'; end if;
    v_new := 'disponivel';
    update public.plates set reseller_id = null where id = p.id;
  else raise exception 'Ação inválida';
  end if;
  update public.plates set status = v_new where id = p.id;
  insert into public.plate_movements(plate_id, from_status, to_status, action, reason, actor) values (p.id, p.status, v_new, _action, nullif(trim(_reason),''), auth.uid());
end $$;

create or replace function public.create_sale(_customer_id uuid, _plate_ids uuid[], _unit_price numeric, _discount numeric, _payment_method text, _amount_paid numeric, _reseller_id uuid, _notes text, _sale_date date)
returns public.sales language plpgsql security definer set search_path = public as $$
declare v_admin boolean := public.is_admin(); v_reseller uuid; v_sale public.sales; v_count int; v_sub numeric; v_total numeric; v_status public.payment_status; p record; v_locked int;
begin
  if not v_admin and not public.has_role(auth.uid(),'revendedor') then raise exception 'Sem permissão'; end if;
  v_reseller := case when v_admin then _reseller_id else auth.uid() end;
  if _plate_ids is null or array_length(_plate_ids,1) is null then raise exception 'Selecione ao menos uma plaquinha'; end if;
  if _unit_price is null or _unit_price < 0 then raise exception 'Preço inválido'; end if;
  if not exists (select 1 from public.customers c where c.id = _customer_id and (v_admin or c.reseller_id = auth.uid() or c.created_by = auth.uid())) then raise exception 'Cliente inválido'; end if;
  v_count := (select count(distinct x) from unnest(_plate_ids) x);
  -- lock plates
  select count(*) into v_locked from (select id from public.plates where id = any(_plate_ids) for update) t;
  if v_locked <> v_count then raise exception 'Plaquinha não encontrada'; end if;
  if exists (select 1 from public.plates where id = any(_plate_ids) and not (
      (v_admin and status in ('disponivel','atribuida','reservada')) or
      (not v_admin and reseller_id = auth.uid() and status in ('atribuida','reservada')))) then
    raise exception 'Uma ou mais plaquinhas não estão disponíveis para venda';
  end if;
  v_sub := _unit_price * v_count;
  v_total := v_sub - coalesce(_discount,0);
  if coalesce(_discount,0) < 0 or v_total < 0 then raise exception 'Desconto inválido'; end if;
  if coalesce(_amount_paid,0) < 0 or coalesce(_amount_paid,0) > v_total then raise exception 'Valor pago inválido'; end if;
  v_status := case when coalesce(_amount_paid,0) = 0 and v_total > 0 then 'pendente' when coalesce(_amount_paid,0) < v_total then 'parcial' else 'pago' end;
  insert into public.sales(customer_id, sale_date, subtotal, discount, total, amount_paid, payment_method, payment_status, reseller_id, notes, created_by)
  values (_customer_id, coalesce(_sale_date,current_date), v_sub, coalesce(_discount,0), v_total, coalesce(_amount_paid,0), _payment_method, v_status, v_reseller, nullif(trim(_notes),''), auth.uid())
  returning * into v_sale;
  for p in select pl.*, e.unit_cost as ecost from public.plates pl join public.stock_entries e on e.id = pl.entry_id where pl.id = any(_plate_ids) loop
    insert into public.sale_items(sale_id, plate_id, unit_price, unit_cost) values (v_sale.id, p.id, _unit_price, p.ecost);
    update public.plates set status = 'vendida', customer_id = _customer_id, sale_id = v_sale.id, reseller_id = coalesce(p.reseller_id, v_reseller) where id = p.id;
    insert into public.plate_movements(plate_id, from_status, to_status, action, reason, reference_id, actor) values (p.id, p.status, 'vendida', 'venda', 'Venda #' || v_sale.sale_number, v_sale.id, auth.uid());
  end loop;
  if coalesce(_amount_paid,0) > 0 then
    insert into public.payments(sale_id, amount, method, paid_at, created_by) values (v_sale.id, _amount_paid, _payment_method, coalesce(_sale_date,current_date), auth.uid());
  end if;
  return v_sale;
end $$;

create or replace function public.add_payment(_sale_id uuid, _amount numeric, _method text, _paid_at date)
returns void language plpgsql security definer set search_path = public as $$
declare s public.sales; v_paid numeric;
begin
  select * into s from public.sales where id = _sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if not (public.is_admin() or s.reseller_id = auth.uid()) then raise exception 'Sem permissão'; end if;
  if s.cancelled then raise exception 'Venda cancelada'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Valor inválido'; end if;
  v_paid := s.amount_paid + _amount;
  if v_paid > s.total then raise exception 'Valor excede o saldo pendente'; end if;
  insert into public.payments(sale_id, amount, method, paid_at, created_by) values (s.id, _amount, _method, coalesce(_paid_at, current_date), auth.uid());
  update public.sales set amount_paid = v_paid, payment_status = case when v_paid >= total then 'pago' else 'parcial' end where id = s.id;
end $$;

create or replace function public.cancel_sale(_sale_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare s public.sales; p record;
begin
  if not public.is_admin() then raise exception 'Apenas administradores podem cancelar vendas'; end if;
  if coalesce(trim(_reason),'') = '' then raise exception 'Informe o motivo'; end if;
  select * into s from public.sales where id = _sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if s.cancelled then raise exception 'Venda já cancelada'; end if;
  for p in select pl.* from public.plates pl join public.sale_items si on si.plate_id = pl.id where si.sale_id = s.id for update of pl loop
    update public.plates set status = 'disponivel', customer_id = null, sale_id = null, reseller_id = null where id = p.id;
    insert into public.plate_movements(plate_id, from_status, to_status, action, reason, reference_id, actor) values (p.id, 'vendida', 'disponivel', 'cancelamento_venda', _reason, s.id, auth.uid());
  end loop;
  if s.amount_paid > 0 then
    insert into public.payments(sale_id, amount, method, is_reversal, created_by) values (s.id, -s.amount_paid, 'estorno', true, auth.uid());
  end if;
  update public.sales set cancelled = true, cancelled_at = now(), cancel_reason = _reason where id = s.id;
end $$;

create or replace function public.update_qr_destination(_plate_id uuid, _url text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.plates;
begin
  select * into p from public.plates where id = _plate_id for update;
  if not found then raise exception 'Plaquinha não encontrada'; end if;
  if not (public.is_admin() or p.reseller_id = auth.uid()) then raise exception 'Sem permissão'; end if;
  _url := trim(_url);
  if _url !~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]+)?(/[^\s]*)?$' or length(_url) > 2000 then raise exception 'Endereço inválido: use http:// ou https://'; end if;
  update public.plates set destination_url = _url, qr_updated_at = now() where id = p.id;
  insert into public.qr_history(plate_id, action, old_url, new_url, actor) values (p.id, 'destino', p.destination_url, _url, auth.uid());
end $$;

create or replace function public.set_qr_active(_plate_id uuid, _active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare p public.plates;
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  select * into p from public.plates where id = _plate_id for update;
  if not found then raise exception 'Plaquinha não encontrada'; end if;
  update public.plates set qr_active = _active, qr_updated_at = now() where id = p.id;
  insert into public.qr_history(plate_id, action, old_url, new_url, actor) values (p.id, case when _active then 'desbloqueio' else 'bloqueio' end, p.destination_url, p.destination_url, auth.uid());
end $$;

-- public resolver: returns only what's needed
create or replace function public.resolve_qr(_slug text)
returns table(found boolean, active boolean, destination text) language sql stable security definer set search_path = public as $$
  select true, qr_active, case when qr_active then destination_url else null end from public.plates where slug = upper(_slug)
$$;

create or replace function public.set_user_role(_user_id uuid, _role public.app_role) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  insert into public.user_roles(user_id, role) values (_user_id, _role) on conflict do nothing;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.resolve_qr(text) to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role), public.is_admin(), public.next_nfc_seq(), public.format_nfc_code(bigint),
  public.create_stock_entry(int, uuid, date, text, numeric, text), public.change_plate_status(uuid, text, text, uuid),
  public.create_sale(uuid, uuid[], numeric, numeric, text, numeric, uuid, text, date), public.add_payment(uuid, numeric, text, date),
  public.cancel_sale(uuid, text), public.update_qr_destination(uuid, text), public.set_qr_active(uuid, boolean), public.set_user_role(uuid, public.app_role) to authenticated;
