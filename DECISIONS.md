# Quyết định

- Phong cách giao diện theo `CLAUDE.md` (sổ tay giấy kẻ ô). Mục 9 của `yeucauduan.md` (giao diện trung tính) bị thay thế.
- CSS thuần + CSS variables (tokens.css / base.css / components.css) thay cho Tailwind, vì CLAUDE.md ưu tiên CSS thuần. Có thể thêm Tailwind sau nếu map đúng token.
- Bản demo: combo là dữ liệu mẫu trong `src/data/combos.ts`, chưa có Supabase. Hình combo là SVG mẫu trong `public/combos/`.
- QR trong demo trỏ tới địa chỉ LAN của máy chạy dev (điện thoại phải cùng Wi-Fi). QR chính thức chỉ tạo sau khi có tên miền cuối.
