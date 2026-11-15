-- Lịch nghỉ: chủ shop chặn cả ngày, một buổi hoặc một khung giờ.
-- start_min / end_min: phút tính từ 0h (giờ Việt Nam) của ngày `day`; cả ngày = 0 → 1440.
create table if not exists blocked_slots (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  start_min integer not null check (start_min >= 0 and start_min < 1440),
  end_min integer not null check (end_min > start_min and end_min <= 1440),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists blocked_slots_day_idx on blocked_slots (day);

-- Chỉ server (service role) truy cập, giống bảng bookings.
alter table blocked_slots enable row level security;
