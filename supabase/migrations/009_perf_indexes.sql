-- Chỉ mục cho các truy vấn danh sách ở trang admin (tránh quét toàn bảng khi dữ liệu lớn).
create index if not exists product_reviews_created_idx on product_reviews (created_at desc);
create index if not exists feedback_notes_customer_idx on feedback_notes (customer_id, created_at desc);
create index if not exists products_visible_idx on products (sort_order, created_at) where hidden = false;
