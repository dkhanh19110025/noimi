-- Đánh giá sản phẩm: chỉ khách đã nhận hàng, mỗi món trong một đơn đánh giá một lần.
-- Thay thế bảng reviews (đánh giá công khai cũ).

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  order_id uuid not null references shop_orders (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 60),
  stars smallint not null check (stars between 1 and 5),
  content text not null default '' check (char_length(content) <= 600),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists product_reviews_product_idx
  on product_reviews (product_id, created_at desc) where hidden = false;

alter table product_reviews enable row level security;

create or replace view product_ratings with (security_invoker = true) as
  select product_id, round(avg(stars)::numeric, 1)::float8 as avg_stars, count(*)::int as review_count
  from product_reviews
  where hidden = false
  group by product_id;

-- Góp ý riêng: gắn với tài khoản khách (nếu có).
alter table feedback_notes add column if not exists customer_id uuid references customers (id) on delete set null;

drop table if exists reviews;
