-- Mật khẩu admin do chủ tiệm tự đổi (lưu dạng băm, không lưu mật khẩu thật).
-- Chỉ có tối đa một dòng. Chưa có dòng nào thì dùng ADMIN_PASSWORD trong biến môi trường.
-- session_version tăng mỗi lần đổi mật khẩu để đăng xuất các máy khác.
-- Quên mật khẩu: xóa dòng này trong Supabase, mật khẩu lại về ADMIN_PASSWORD.
create table if not exists admin_credentials (
  id smallint primary key default 1 check (id = 1),
  password_hash text not null,
  session_version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table admin_credentials enable row level security;
