-- Cửa hàng: sản phẩm, khách hàng, đơn hàng, yêu thích.
-- Tồn kho trừ khi đặt, hoàn khi hủy — làm trong database (khóa dòng) để hai người
-- mua cùng lúc không bao giờ khiến kho bị âm.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  price integer not null check (price >= 0),
  icon text not null default '🎁' check (char_length(icon) <= 8),
  color text not null default 'blue'
    check (color in ('blue', 'yellow', 'pink', 'green', 'purple', 'orange')),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  stock integer not null default 5 check (stock >= 0),
  hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists products_sort_idx on products (sort_order, created_at);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^0[0-9]{9}$'),
  name text not null check (char_length(name) between 1 and 60),
  email text not null check (char_length(email) between 5 and 120),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references customers (id) on delete set null,
  -- Chụp lại thông tin lúc đặt
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  note text check (note is null or char_length(note) <= 300),
  total integer not null check (total >= 0),
  status text not null default 'placed' check (status in ('placed', 'done', 'cancelled')),
  cancelled_by text check (cancelled_by is null or cancelled_by in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_orders_customer_idx on shop_orders (customer_id, created_at desc);
create index if not exists shop_orders_status_idx on shop_orders (status, created_at desc);

create table if not exists shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name text not null,
  price integer not null check (price >= 0),
  qty integer not null check (qty > 0)
);
create index if not exists shop_order_items_order_idx on shop_order_items (order_id);

create table if not exists favorites (
  customer_id uuid not null references customers (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

-- Chỉ server (service role) truy cập.
alter table products enable row level security;
alter table customers enable row level security;
alter table shop_orders enable row level security;
alter table shop_order_items enable row level security;
alter table favorites enable row level security;

-- Đặt hàng: kiểm tra + trừ kho + tạo đơn trong MỘT giao dịch.
-- p_items: [{"product_id": "...", "qty": 2}, ...]
create or replace function place_order(p_customer uuid, p_items jsonb, p_note text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  c customers%rowtype;
  line record;
  p products%rowtype;
  v_total integer := 0;
  v_order uuid;
  v_code text;
begin
  select * into c from customers where id = p_customer;
  if not found then raise exception 'NO_CUSTOMER'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  v_code := 'DH' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into shop_orders (code, customer_id, customer_name, customer_phone, customer_email, note, total)
  values (v_code, c.id, c.name, c.phone, c.email, nullif(left(coalesce(p_note, ''), 300), ''), 0)
  returning id into v_order;

  -- Gộp dòng trùng, sắp theo id để tránh khóa chéo giữa hai đơn.
  for line in
    select (x->>'product_id')::uuid as product_id, sum((x->>'qty')::int)::int as qty
    from jsonb_array_elements(p_items) x
    group by 1
    order by 1
  loop
    if line.qty < 1 or line.qty > 99 then raise exception 'BAD_QTY'; end if;

    select * into p from products where id = line.product_id for update;
    if not found or p.hidden then
      raise exception 'UNAVAILABLE|%', coalesce(p.name, '');
    end if;
    if p.stock < line.qty then
      raise exception 'OUT_OF_STOCK|%|%', p.name, p.stock;
    end if;

    update products set stock = stock - line.qty where id = p.id;
    insert into shop_order_items (order_id, product_id, name, price, qty)
    values (v_order, p.id, p.name, p.price, line.qty);
    v_total := v_total + p.price * line.qty;
  end loop;

  update shop_orders set total = v_total where id = v_order;
  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total);
end;
$$;

-- Hủy đơn đang "placed" và hoàn kho. p_customer = null nghĩa là admin hủy.
create or replace function cancel_order(p_order uuid, p_customer uuid, p_by text)
returns text
language plpgsql
set search_path = public
as $$
declare
  o shop_orders%rowtype;
begin
  select * into o from shop_orders where id = p_order for update;
  if not found then return 'NOT_FOUND'; end if;
  if p_customer is not null and o.customer_id is distinct from p_customer then
    return 'NOT_FOUND';
  end if;
  if o.status <> 'placed' then return 'NOT_CANCELLABLE'; end if;

  update products pr
     set stock = pr.stock + i.qty
    from (
      select product_id, sum(qty)::int as qty
      from shop_order_items
      where order_id = o.id and product_id is not null
      group by product_id
    ) i
   where pr.id = i.product_id;

  update shop_orders
     set status = 'cancelled', cancelled_by = p_by, updated_at = now()
   where id = o.id;
  return 'OK';
end;
$$;

-- Tăng/giảm tồn kho trực tiếp (admin). Không cho âm.
create or replace function adjust_stock(p_product uuid, p_delta integer)
returns integer
language sql
set search_path = public
as $$
  update products set stock = greatest(0, stock + p_delta)
  where id = p_product
  returning stock;
$$;

revoke all on function place_order(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function cancel_order(uuid, uuid, text) from public, anon, authenticated;
revoke all on function adjust_stock(uuid, integer) from public, anon, authenticated;

-- 9 sản phẩm mẫu, mỗi món 5 cái (chỉ thêm khi bảng còn trống).
insert into products (name, description, price, icon, color, stock, sort_order)
select * from (values
  ('Keo nối mi', 'Khô nhanh, ít kích ứng, giữ mi lâu.', 90000, '🧴', 'blue', 5, 1),
  ('Serum dưỡng mi', 'Dưỡng mi tự nhiên, giúp mi chắc khỏe.', 120000, '💧', 'green', 5, 2),
  ('Chổi chải mi', 'Chải mi mỗi ngày cho mi luôn vào nếp.', 30000, '🪮', 'pink', 5, 3),
  ('Nước tẩy trang mắt', 'Dịu nhẹ, không dầu, an toàn cho mi nối.', 110000, '🫧', 'yellow', 5, 4),
  ('Sữa rửa mặt dịu nhẹ', 'Làm sạch da mà không gây khô căng.', 95000, '🚿', 'blue', 5, 5),
  ('Kem dưỡng ẩm', 'Cấp ẩm mềm da, thấm nhanh không bết dính.', 180000, '🌸', 'purple', 5, 6),
  ('Mặt nạ cấp nước', 'Hộp 5 miếng, da căng mịn sau 15 phút.', 150000, '🎭', 'green', 5, 7),
  ('Kem chống nắng', 'Nhẹ mặt, không để lại vệt trắng.', 160000, '☀️', 'orange', 5, 8),
  ('Gương trang điểm mini', 'Nhỏ gọn, bỏ túi xách, soi mi mọi lúc.', 55000, '🪞', 'yellow', 5, 9)
) as v(name, description, price, icon, color, stock, sort_order)
where not exists (select 1 from products);
