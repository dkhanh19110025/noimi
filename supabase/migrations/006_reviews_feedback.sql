-- Đánh giá công khai (chủ shop duyệt rồi mới hiện) và góp ý riêng gửi về admin.
-- ip_hash: băm một chiều của IP, chỉ dùng để giới hạn số lần gửi, không lưu IP thật.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  stars smallint not null check (stars between 1 and 5),
  content text not null check (char_length(content) between 1 and 600),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_status_created_idx on reviews (status, created_at desc);
create index if not exists reviews_ip_idx on reviews (ip_hash, created_at);

create table if not exists feedback_notes (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(name) <= 60),
  phone text check (phone is null or char_length(phone) <= 20),
  content text not null check (char_length(content) between 1 and 1000),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_notes_created_idx on feedback_notes (created_at desc);
create index if not exists feedback_notes_ip_idx on feedback_notes (ip_hash, created_at);

-- Chỉ server (service role) truy cập, giống bảng bookings.
alter table reviews enable row level security;
alter table feedback_notes enable row level security;
