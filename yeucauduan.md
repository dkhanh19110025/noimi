# Dự án: Web đặt lịch nối mi (quét QR → đặt lịch)

> Tài liệu này dùng cho Claude Code. Đọc hết trước khi viết code.
> **Phong cách giao diện (màu, font, hình ảnh): CHƯA CHỐT, chủ tiệm sẽ đề xuất sau.** Xem mục 9.
> Giao diện hiển thị cho người dùng viết **tiếng Việt**. Tên bảng, cột, biến, hàm trong code dùng **tiếng Anh**.
> Nếu gặp quyết định không có trong tài liệu này thì chọn phương án đơn giản nhất, ghi lại trong `DECISIONS.md`, không tự thêm tính năng ngoài danh sách.

---

## 1. Tổng quan

Tiệm nối mi nhỏ, có **một chủ tiệm là admin duy nhất**. Khách quét một mã QR dán ở tiệm, mở ra trang web, chọn combo, ngày, giờ rồi để lại tên và số điện thoại. Hệ thống lưu lịch và gửi mail báo cho admin. Admin xem và quản lý lịch bằng điện thoại.

Mục tiêu: đơn giản, chạy ổn trên điện thoại, không bao giờ để hai khách trùng một khung giờ.

### Ngoài phạm vi bản đầu (KHÔNG làm)
- Mail hoặc Zalo nhắc hẹn tự động, không cron job.
- Đặt cọc, thanh toán online.
- Thống kê doanh thu, báo cáo.
- Nhiều thợ làm cùng lúc (mặc định 1 thợ, tức một khung giờ chỉ có một lịch).
- Tài khoản khách, đăng ký, đăng nhập cho khách.
- Thông báo Telegram hoặc Zalo.

---

## 2. Công nghệ

| Phần | Công nghệ |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Giao diện | Tailwind CSS |
| Database | Supabase (Postgres) |
| Lưu ảnh combo | Supabase Storage (bucket public chỉ đọc) |
| Gửi mail | Resend (SDK `resend`) |
| Chống spam | Cloudflare Turnstile |
| Kiểm tra dữ liệu | `zod` |
| Phiên admin | `jose` (JWT ký, cookie httpOnly) |
| Tạo QR | `qrcode` (script chạy riêng) |
| Test | `vitest` |
| Deploy | Vercel |

Quy tắc kiến trúc:
- **Mọi truy cập database đi qua server** (Route Handlers / Server Actions) bằng Supabase **service role key**. Trình duyệt không bao giờ gọi Supabase trực tiếp.
- Bật **Row Level Security (RLS)** trên mọi bảng và **không tạo policy nào cho `anon`/`authenticated`**. Như vậy dù lộ anon key, không ai đọc được dữ liệu khách.
- Service role key và mọi secret chỉ nằm ở biến môi trường phía server, không đưa vào code client, không có tiền tố `NEXT_PUBLIC_`.

---

## 3. Múi giờ và định dạng

- Múi giờ cố định: **Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè)**.
- Database lưu mọi thời điểm dạng `timestamptz` (UTC). Giao diện luôn hiển thị theo giờ Việt Nam. Ngày/giờ hiển thị: `dd/MM/yyyy`, `HH:mm`. Tiền: `150.000đ`.
- Số điện thoại: chuẩn hóa về dạng `0XXXXXXXXX` (10 số). Chấp nhận khách nhập `+84...` hoặc `84...` rồi quy đổi. Không hợp lệ thì báo lỗi bằng tiếng Việt.
- Email: kiểm tra định dạng, không bắt buộc.

---

## 4. Cấu trúc dữ liệu (Postgres)

Đặt trong `supabase/migrations/001_init.sql`.

```sql
create extension if not exists btree_gist;

-- Combo dịch vụ
create table combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0),              -- VND
  duration_minutes integer not null check (duration_minutes > 0),
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Lịch hẹn
create table bookings (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos(id),
  combo_name text not null,                               -- chụp lại lúc đặt
  price integer not null,                                 -- chụp lại lúc đặt
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  note text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,                           -- starts_at + duration
  busy_until timestamptz not null,                        -- ends_at + buffer (khoảng nghỉ)
  status text not null default 'confirmed'
    check (status in ('confirmed','arrived','cancelled','no_show')),
  source text not null default 'web'
    check (source in ('web','zalo','phone','walk_in')),
  manage_token text not null unique,                      -- chuỗi ngẫu nhiên ≥ 32 ký tự, dùng cho link hủy/đổi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (busy_until >= ends_at),
  -- Chống trùng giờ ngay trong DB: hai lịch đang hiệu lực không được chồng nhau
  constraint bookings_no_overlap
    exclude using gist (tstzrange(starts_at, busy_until, '[)') with &&)
    where (status in ('confirmed','arrived'))
);
create index bookings_starts_at_idx on bookings (starts_at);
create index bookings_phone_idx on bookings (customer_phone);

-- Giờ mở cửa theo thứ trong tuần (0 = Chủ nhật ... 6 = Thứ 7)
create table working_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '19:00',
  check (close_time > open_time)
);

-- Chặn giờ hoặc ngày nghỉ (nghỉ cả ngày = khoảng 00:00–24:00 của ngày đó)
create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Cài đặt chung (dạng key/value)
create table settings (
  key text primary key,
  value jsonb not null
);

-- Đếm số lần nhập sai mật khẩu admin
create table admin_login_attempts (
  id bigserial primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);

alter table combos enable row level security;
alter table bookings enable row level security;
alter table working_hours enable row level security;
alter table time_blocks enable row level security;
alter table settings enable row level security;
alter table admin_login_attempts enable row level security;
-- Không tạo policy nào.
```

Hàm tạo lịch dùng chung (`create_booking`, viết bằng plpgsql, chạy trong **một transaction**):
1. Kiểm tra khung giờ không chồng với `time_blocks`.
2. Insert vào `bookings`. Nếu vi phạm `bookings_no_overlap` thì trả lỗi `SLOT_TAKEN` để API báo "Giờ này vừa có người đặt, vui lòng chọn giờ khác".
3. Trả về lịch vừa tạo.

Cả đặt từ web lẫn admin tạo hộ đều gọi hàm này.

### Seed mặc định (`supabase/seed.sql`)
- `working_hours`: cả 7 ngày (gồm Thứ 7 và Chủ nhật) mở `09:00`–`19:00`.
- `settings` (có thể sửa trong trang admin):

| key | mặc định | ý nghĩa |
|---|---|---|
| `slot_step_minutes` | `30` | Khoảng cách giữa các giờ bắt đầu hiển thị |
| `buffer_minutes` | `0` | Khoảng nghỉ giữa hai khách |
| `min_lead_hours` | `2` | Khách phải đặt trước ít nhất bao nhiêu giờ |
| `max_advance_days` | `30` | Khách chỉ đặt trước tối đa bao nhiêu ngày |
| `cancel_before_hours` | `2` | Khách chỉ hủy/đổi được nếu còn ít nhất bấy nhiêu giờ |
| `max_pending_per_phone` | `2` | Số lịch sắp tới tối đa của một số điện thoại |
| `shop_name` | `"Tên tiệm"` | |
| `shop_address` | `"Địa chỉ tiệm"` | |
| `maps_url` | `""` | Link Google Maps |
| `zalo_phone` | `""` | SĐT Zalo của tiệm |
| `admin_email` | `""` | Email nhận thông báo (có thể thay bằng biến môi trường) |

- 3 combo mẫu (giá và thời lượng giả, chủ tiệm sẽ sửa trong trang admin).

---

## 5. Quy tắc nghiệp vụ

### 5.1. Tính giờ trống (hàm thuần, có unit test)
Đặt trong `src/lib/availability.ts`. Đầu vào: ngày, combo, danh sách lịch đang hiệu lực, `time_blocks`, `working_hours`, `settings`, thời điểm hiện tại. Đầu ra: danh sách giờ bắt đầu hợp lệ.

Một giờ bắt đầu `S` của ngày `D` hợp lệ khi **tất cả** điều kiện sau đúng:
1. Thứ của `D` có `is_open = true`.
2. `S` nằm trong `[open_time, close_time]` và kết thúc dịch vụ `S + duration` **không vượt quá** `close_time`.
3. `S` là bội số của `slot_step_minutes` tính từ `open_time`.
4. `S >= now + min_lead_hours` và `D <= hôm nay + max_advance_days` (áp dụng cho khách đặt qua web; **admin tạo hộ khách thì bỏ qua điều kiện này**).
5. Khoảng `[S, S + duration + buffer)` không chồng với lịch nào có trạng thái `confirmed` hoặc `arrived`.
6. Khoảng đó không chồng với `time_blocks` nào.

Lịch có trạng thái `cancelled` và `no_show` **không** chiếm giờ.

### 5.2. Đặt lịch (khách)
- Kiểm tra bằng `zod` ở server: combo tồn tại và đang bật, tên (1–100 ký tự), SĐT hợp lệ, email hợp lệ nếu có, ghi chú tối đa 500 ký tự.
- **Tính lại điều kiện 5.1 ở server ngay lúc đặt**, không tin giờ gửi lên từ trình duyệt.
- Xác minh token Cloudflare Turnstile ở server.
- Giới hạn: một SĐT không có quá `max_pending_per_phone` lịch `confirmed` ở tương lai.
- Gọi `create_booking`. Lịch từ web có `source = 'web'`, `status = 'confirmed'` (không cần admin duyệt).
- Sinh `manage_token` bằng bộ sinh số ngẫu nhiên an toàn (ví dụ `crypto.randomBytes(24).toString('base64url')`).
- Sau khi lưu: gửi mail (mục 7). **Gửi mail lỗi thì không được làm hỏng việc đặt lịch**, chỉ ghi log.

### 5.3. Hủy / đổi lịch (khách, qua link trong mail)
- Link dạng `/lich/{manage_token}`, không cần đăng nhập. Trang chỉ hiện thông tin của đúng lịch đó.
- Hủy: được phép nếu còn ít nhất `cancel_before_hours` trước giờ hẹn, đặt `status = 'cancelled'`. Quá hạn thì hiện thông báo và nút nhắn Zalo cho tiệm.
- Đổi: chọn giờ mới (cùng combo) theo đúng quy tắc 5.1, cập nhật `starts_at/ends_at/busy_until`. Cùng điều kiện thời hạn như hủy.
- Hủy hoặc đổi xong thì gửi mail báo admin.

### 5.4. Admin tự đặt lịch hộ khách
- Dùng khi khách gọi điện, nhắn Zalo hoặc đến trực tiếp.
- Nhập: tên, SĐT, combo, ngày giờ, nguồn (`zalo` / `phone` / `walk_in`), ghi chú.
- **Bỏ qua** giới hạn đặt trước tối thiểu/tối đa, giới hạn số lịch mỗi SĐT và Turnstile. Admin được đặt cả khung giờ ngoài giờ mở cửa sau khi xác nhận cảnh báo.
- **Vẫn bắt buộc không trùng giờ** (cùng hàm `create_booking`). Trùng thì báo rõ lịch đang chiếm giờ đó.
- Không gửi mail báo admin (vì chính admin tạo). Gửi mail xác nhận cho khách nếu có email.
- Bấm vào ô giờ trống trên lịch cũng mở form này với giờ đã điền sẵn.

### 5.5. Quản lý trạng thái
Trạng thái: `confirmed` (đã xác nhận) → `arrived` (đã đến) / `cancelled` (hủy) / `no_show` (không đến). Admin đổi được tự do giữa các trạng thái. Đổi sang `confirmed` hoặc `arrived` phải kiểm tra lại trùng giờ (có thể bị DB từ chối).

### 5.6. Combo
- Thêm, sửa tên/mô tả/giá/thời lượng/ảnh, bật hoặc tắt.
- **Không xóa cứng** combo đã có lịch, chỉ tắt (`is_active = false`).
- Sửa giá hoặc thời lượng không ảnh hưởng lịch cũ (lịch đã chụp lại `combo_name`, `price`, và `ends_at`).
- Tải ảnh: giới hạn 2MB, chỉ nhận jpg/png/webp, nén hoặc đổi kích thước về chiều rộng tối đa 1200px nếu có thể.

---

## 6. Trang và API

### 6.1. Trang cho khách
| Đường dẫn | Chức năng |
|---|---|
| `/` | Chuyển hướng sang `/dat-lich` |
| `/dat-lich` | Trang đặt lịch (mã QR trỏ về đây). Gồm 4 bước: chọn combo → chọn ngày → chọn giờ → nhập thông tin |
| `/dat-lich/xac-nhan/{manage_token}` | Xác nhận: tóm tắt lịch, địa chỉ, link Google Maps, nút nhắn Zalo cho tiệm, link quản lý lịch |
| `/lich/{manage_token}` | Xem, hủy hoặc đổi lịch |

Chi tiết trang đặt lịch:
- Bước chọn ngày hiển thị lịch tháng. Ngày nghỉ, ngày đã qua và ngày không còn giờ trống bị **khóa** (lấy từ `/api/availability/days`).
- Bước chọn giờ chỉ hiện giờ còn trống của ngày đã chọn. Nếu hết giờ thì báo và gợi ý chọn ngày khác.
- Nút Zalo: `https://zalo.me/{zalo_phone}`.
- Đã đặt thành công thì không cho bấm gửi lại (tránh đặt đúp khi bấm hai lần).
- Lỗi `SLOT_TAKEN`: quay lại bước chọn giờ, tải lại danh sách giờ, hiện thông báo thân thiện.

### 6.2. Trang cho admin (một mật khẩu)
| Đường dẫn | Chức năng |
|---|---|
| `/admin/login` | Nhập mật khẩu |
| `/admin` | Lịch theo **ngày** (mặc định hôm nay), chuyển ngày trước/sau, nút "+ Thêm lịch" |
| `/admin/tuan` | Lịch theo **tuần** |
| `/admin/lich/{id}` | Chi tiết một lịch: đổi trạng thái, hủy, sửa ghi chú, bấm SĐT để gọi hoặc nhắn Zalo |
| `/admin/combo` | Danh sách và sửa combo |
| `/admin/cai-dat` | Giờ mở cửa theo thứ, chặn giờ / ngày nghỉ, các cài đặt chung ở mục 4 |

- Trên điện thoại, lịch ngày hiển thị dạng **danh sách theo giờ**, mỗi dòng gồm giờ, tên, combo, trạng thái và các giờ trống có thể bấm để tạo lịch nhanh.
- SĐT là liên kết: `tel:` để gọi, kèm nút `https://zalo.me/{sdt}`.
- Có thể thêm `manifest.webmanifest` để admin "Thêm vào màn hình chính" như một app.

### 6.3. API (Route Handlers)
Công khai (cần Turnstile ở chỗ có ghi chú):
- `GET /api/combos` → combo đang bật.
- `GET /api/availability/days?month=YYYY-MM&combo_id=` → danh sách ngày còn ít nhất một giờ trống.
- `GET /api/availability?date=YYYY-MM-DD&combo_id=` → danh sách giờ bắt đầu còn trống.
- `POST /api/bookings` (Turnstile) → tạo lịch, trả về `manage_token`.
- `GET /api/bookings/by-token/{token}` → xem lịch.
- `POST /api/bookings/by-token/{token}/cancel`
- `POST /api/bookings/by-token/{token}/reschedule`

Admin (bắt buộc cookie phiên hợp lệ, trả 401 nếu thiếu):
- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET /api/admin/bookings?from=&to=`
- `POST /api/admin/bookings` (tạo hộ khách)
- `PATCH /api/admin/bookings/{id}` (đổi trạng thái, sửa ghi chú)
- `GET|POST|PATCH /api/admin/combos`, `POST /api/admin/combos/{id}/image`
- `GET|PUT /api/admin/working-hours`
- `GET|POST|DELETE /api/admin/time-blocks`
- `GET|PUT /api/admin/settings`

Mọi API trả lỗi dạng `{ "error": { "code": "...", "message": "tiếng Việt" } }`. Không trả thông tin của khách khác ra API công khai.

---

## 7. Mail (Resend)

Đặt trong `src/lib/email.ts`, nội dung HTML đơn giản và đọc tốt trên điện thoại.

| Khi nào | Gửi cho | Nội dung chính |
|---|---|---|
| Khách đặt lịch qua web | Admin (`ADMIN_EMAIL`) | Tên, SĐT, email, combo, giờ, ghi chú, link tới `/admin` đúng ngày đó. Tiêu đề: `Lịch mới: {tên} – {combo} – {dd/MM HH:mm}` |
| Khách đặt lịch có nhập email | Khách | Tóm tắt lịch, địa chỉ, link Google Maps, link hủy/đổi lịch |
| Khách hủy hoặc đổi lịch | Admin | Lịch cũ và lịch mới (nếu đổi) |
| Admin tạo lịch hộ, khách có email | Khách | Giống mail xác nhận |

Ghi chú triển khai:
- Resend gói miễn phí chỉ gửi tới email của chính chủ tài khoản nếu chưa xác minh tên miền. Muốn gửi tới email khách bất kỳ phải gắn tên miền riêng của tiệm trong Resend. Trong lúc phát triển có thể chỉ test mail cho admin.
- Hàm gửi mail phải `try/catch`, lỗi chỉ ghi log, không làm hỏng luồng đặt lịch.
- Không đưa thông tin nhạy cảm ngoài những gì cần thiết vào mail cho khách.

---

## 8. Bảo mật

### 8.1. Đăng nhập admin (một mật khẩu)
- Mật khẩu lấy từ biến môi trường `ADMIN_PASSWORD`. **Không bao giờ viết cứng mật khẩu trong code hay commit lên Git.**
- So sánh bằng hàm so sánh thời gian cố định (`crypto.timingSafeEqual`).
- Đúng mật khẩu thì tạo JWT (thư viện `jose`, khóa `ADMIN_SESSION_SECRET`, hạn 30 ngày) đặt trong cookie `httpOnly`, `secure`, `sameSite=lax`.
- `middleware.ts` chặn mọi đường dẫn `/admin/*` (trừ `/admin/login`) và `/api/admin/*` nếu không có cookie hợp lệ.
- Giới hạn nhập sai: quá 5 lần trong 15 phút từ cùng một IP thì từ chối tạm (dùng bảng `admin_login_attempts`). Thông báo lỗi không tiết lộ đã gần đúng hay chưa.
- Thêm header `X-Robots-Tag: noindex` và `robots.txt` chặn `/admin`.

### 8.2. Khác
- Các route công khai không bao giờ trả danh sách lịch hay thông tin cá nhân của người khác.
- `manage_token` đủ dài, ngẫu nhiên, không đoán được. Trang `/lich/{token}` sai token trả 404.
- Turnstile bắt buộc ở `POST /api/bookings`.
- Kiểm tra và làm sạch mọi đầu vào bằng `zod`. Không dùng chuỗi ghép để tạo câu SQL.
- Không ghi SĐT/email vào log.

---

## 9. Giao diện

- **Mobile-first**: thiết kế cho màn hình điện thoại trước, máy tính chỉ cần co giãn hợp lý. Áp dụng cho cả trang khách và trang admin.
- Nút và ô bấm cao tối thiểu **44px**. Ô nhập chữ có `font-size >= 16px` để iOS không tự phóng to.
- Trang khách đặt lịch dạng từng bước, mỗi bước ngắn, có nút quay lại.
- Hỗ trợ trạng thái đang tải, lỗi và trống cho mọi danh sách.
- **Phong cách thị giác chưa chốt.** Tạm thời dùng giao diện trung tính (nền sáng, một màu nhấn, font hệ thống). Gom toàn bộ màu, font, bo góc, khoảng cách vào **biến CSS / Tailwind theme tập trung** (ví dụ `src/styles/theme.css`) để sau này đổi phong cách chỉ cần sửa một chỗ. Không rải mã màu trực tiếp trong component.
- Chừa chỗ cho logo, ảnh combo, tên tiệm lấy từ `settings` và `combos`.

---

## 10. Mã QR

- **Một mã QR duy nhất cho cả tiệm**, trỏ tới `https://{SITE_URL}/dat-lich` (có thể thêm `?src=qr` để phân biệt nguồn). Không cần mã theo bàn.
- Dùng QR **tĩnh** (nội dung là URL trực tiếp), không dùng dịch vụ QR "động" của bên thứ ba vì có thể hết hạn hoặc thu phí.
- Viết script `scripts/generate-qr.mjs` dùng thư viện `qrcode`:
  - Đọc `SITE_URL` từ biến môi trường.
  - Xuất `qr/dat-lich.png` (1024×1024) và `qr/dat-lich.svg` (để in sắc nét).
  - Mức sửa lỗi `M` hoặc `Q`, vùng trống viền quanh tối thiểu 4 ô, nền trắng, mã đen.
  - Chạy bằng `npm run qr`.
- Hướng dẫn in (ghi trong README): kích thước tối thiểu khoảng **4×4 cm**, in rõ nét, nên ép plastic hoặc dán chống trầy.
- **Chỉ tạo QR chính thức sau khi có tên miền cuối cùng**, vì QR đã in thì không đổi được link.
- Kiểm tra thủ công: quét bằng iPhone, Android và trong ứng dụng Zalo, đều phải mở đúng trang `/dat-lich`.

---

## 11. Biến môi trường (`.env.example`)

```
# Công khai
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# Chỉ server
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TURNSTILE_SECRET_KEY=
RESEND_API_KEY=
MAIL_FROM="Tên tiệm <no-reply@example.com>"
ADMIN_EMAIL=
ADMIN_PASSWORD=            # đặt mật khẩu dài, không phải tên hay địa danh
ADMIN_SESSION_SECRET=      # chuỗi ngẫu nhiên >= 32 ký tự
```

Không commit file `.env`. Có `.env.example` không chứa giá trị thật.

---

## 12. Cấu trúc thư mục gợi ý

```
src/
  app/
    dat-lich/                 # trang khách
    lich/[token]/
    admin/                    # trang admin
    api/                      # route handlers
  lib/
    availability.ts           # tính giờ trống (thuần, có test)
    bookings.ts
    email.ts
    auth.ts                   # phiên admin
    phone.ts                  # chuẩn hóa SĐT
    supabase-server.ts
    time.ts                   # xử lý múi giờ Asia/Ho_Chi_Minh
  components/
  styles/theme.css
middleware.ts
supabase/
  migrations/001_init.sql
  seed.sql
scripts/generate-qr.mjs
DECISIONS.md
README.md
```

---

## 13. Thứ tự thực hiện

1. Khởi tạo project, Tailwind, cấu trúc thư mục, `.env.example`.
2. Migration SQL + seed, kiểm tra ràng buộc chống trùng giờ hoạt động.
3. `availability.ts` + unit test (xem mục 14).
4. API công khai: combo, giờ trống, tạo lịch (`create_booking`).
5. Trang khách `/dat-lich` và trang xác nhận, kèm Turnstile.
6. Gửi mail cho admin và cho khách (Resend).
7. Đăng nhập admin + `middleware.ts`.
8. Trang admin: lịch ngày/tuần, chi tiết, đổi trạng thái, hủy.
9. Admin tạo lịch hộ khách.
10. Admin: quản lý combo (kèm tải ảnh), giờ mở cửa, chặn giờ/ngày nghỉ, cài đặt.
11. Trang `/lich/{token}` (hủy/đổi) + mail báo admin.
12. Tối ưu giao diện điện thoại, thêm manifest cho admin.
13. Script tạo QR, README (cách cài, chạy, deploy, in QR).
14. Deploy Vercel, gắn tên miền, test thực tế bằng điện thoại.

---

## 14. Kiểm thử và tiêu chí nghiệm thu

### Unit test (`vitest`) cho `availability.ts`
- Ngày nghỉ không có giờ nào.
- Combo dài không được kết thúc sau giờ đóng cửa.
- Lịch đã có chiếm đúng khoảng `[starts_at, busy_until)`.
- `time_blocks` loại bỏ đúng giờ.
- `cancelled` và `no_show` không chiếm giờ.
- Giờ đã qua, và giờ chưa đủ `min_lead_hours` bị loại (khách), nhưng admin thì không.
- Quá `max_advance_days` bị loại.
- Chuyển đổi múi giờ đúng (giờ Việt Nam so với UTC).

### Kiểm thử đồng thời
- Gửi hai yêu cầu đặt cùng một khung giờ cùng lúc: chỉ một thành công, cái còn lại nhận `SLOT_TAKEN`.

### Tiêu chí nghiệm thu
- [ ] Quét QR bằng iPhone, Android và Zalo đều mở đúng `/dat-lich`.
- [ ] Khách đặt được lịch từ đầu đến cuối trên điện thoại, chỉ hiện giờ còn trống.
- [ ] Không thể đặt trùng giờ, kể cả khi hai người bấm cùng lúc.
- [ ] Admin nhận mail mỗi khi có lịch web mới; khách có email nhận mail xác nhận kèm link hủy/đổi.
- [ ] Chưa đăng nhập thì không vào được `/admin/*` và `/api/admin/*`.
- [ ] Admin tạo lịch hộ khách thì giờ đó biến mất khỏi trang khách ngay.
- [ ] Chặn giờ / ngày nghỉ có hiệu lực ngay trên trang khách.
- [ ] Sửa combo (giá, thời lượng, bật/tắt) không làm sai lịch cũ.
- [ ] Không lộ SĐT/tên khách ra API công khai.
- [ ] Trang khách và admin dùng thoải mái trên màn hình điện thoại.
- [ ] Mật khẩu và khóa bí mật không có trong mã nguồn.

---

## 15. Thông tin chủ tiệm cần cung cấp (dùng giá trị mặc định ở mục 4 cho tới khi có)

- Tên tiệm, địa chỉ, link Google Maps, SĐT Zalo.
- Giờ mở cửa thật từng ngày trong tuần, và ngày nghỉ cố định (nếu có).
- Danh sách combo thật: tên, mô tả, giá, thời lượng, ảnh mẫu.
- Khoảng nghỉ giữa hai khách (hiện mặc định 0 phút) và khoảng cách giữa các giờ (hiện 30 phút).
- Email nhận thông báo.
- Tên miền và phong cách giao diện (màu, font, logo).
