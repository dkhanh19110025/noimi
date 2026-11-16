-- Đổi mật khẩu khách (từ admin) tăng session_version → các máy đang đăng nhập bị đăng xuất.
alter table customers add column if not exists session_version integer not null default 0;
create index if not exists customers_created_idx on customers (created_at desc);
