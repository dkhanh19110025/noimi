-- Lịch hẹn + chống trùng giờ ngay trong database.
-- Chạy một lần trong Supabase → SQL Editor.

create extension if not exists btree_gist;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                    -- mã ngắn hiển thị cho khách
  combo_id text not null,
  combo_name text not null,                     -- chụp lại lúc đặt
  price integer not null check (price >= 0),    -- chụp lại lúc đặt (VND)
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  note text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'arrived', 'cancelled', 'no_show')),
  source text not null default 'web'
    check (source in ('web', 'zalo', 'phone', 'walk_in')),
  manage_token text not null unique,            -- dùng cho link hủy/đổi, ngẫu nhiên dài
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Hai lịch đang hiệu lực không được chồng giờ nhau.
  constraint bookings_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('confirmed', 'arrived'))
);

create index if not exists bookings_starts_at_idx on bookings (starts_at);
create index if not exists bookings_phone_idx on bookings (customer_phone);

-- Bật RLS và KHÔNG tạo policy: trình duyệt không đọc/ghi trực tiếp được.
-- Chỉ server (service role key) truy cập.
alter table bookings enable row level security;
