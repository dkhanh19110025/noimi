-- Bucket công khai chứa ảnh sản phẩm. Chỉ server (service role) được ghi; ai cũng xem được qua link công khai.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
