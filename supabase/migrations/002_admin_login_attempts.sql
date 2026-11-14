-- Đếm số lần nhập sai mật khẩu admin (chống đoán mật khẩu).
create table if not exists admin_login_attempts (
  id bigserial primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_time_idx
  on admin_login_attempts (ip, attempted_at desc);
alter table admin_login_attempts enable row level security;
