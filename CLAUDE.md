# CLAUDE.md — Style Guide: "Sketchnote / Giấy kẻ ô vẽ tay"

> File này CHỈ quy định **phong cách, bố cục, màu sắc, typography, component**.
> Nó không gắn với chủ đề nào. Nội dung (chữ, số liệu, hình) lấy từ yêu cầu của người dùng.
> Claude Code phải tuân thủ file này khi tạo hoặc sửa bất kỳ UI nào trong dự án.

---

## 1. Tinh thần thiết kế

Cảm giác tổng thể: **một trang sổ tay học bài viết tay trên giấy kẻ ô**, được dán thêm các nhãn sticker pastel.

- Thân thiện, gần gũi, vui mắt, nhưng **cấu trúc chặt chẽ** (lưới cân đối, phân cấp rõ).
- Thông tin khô khan được "làm mềm" bằng màu pastel và nét viền đậm kiểu vẽ tay.
- Từ khóa: `hand-drawn` · `notebook paper` · `sticker` · `pastel highlighter` · `offset shadow`.

Ba điều làm nên phong cách này (không được bỏ):

1. **Nền giấy kẻ ô** màu kem.
2. **Viền mực đậm + bóng đổ lệch cứng** (không blur) cho mọi khối.
3. **Font chữ viết tay bo tròn** + màu pastel nhất quán.

---

## 2. Tech stack mặc định

- HTML + CSS thuần + ít JS (trang tĩnh), hoặc Vite/Astro/React nếu cần nhiều trang.
- Dùng **CSS variables** cho toàn bộ design tokens. Không hard-code màu rải rác.
- Không dùng framework UI có sẵn (Bootstrap, MUI, Ant...). Tailwind chỉ dùng nếu cấu hình theme đúng theo token bên dưới.
- Nền, lưới, viền, bóng: làm bằng CSS/SVG, không dùng ảnh bitmap.
- Mobile-first. Phải đẹp ở **375px, 768px, 1280px**.

---

## 3. Bảng màu

Đặt vào `:root`. Mọi màu trong code phải lấy từ các biến này.

```css
:root {
  /* Giấy */
  --paper: #fbf7ea; /* nền trang, kem nhạt */
  --paper-grid: rgba(120, 100, 60, 0.1); /* nét lưới ô ly */
  --card: #fffdf5; /* nền card, sáng hơn giấy một chút */
  --white: #ffffff;

  /* Mực */
  --ink: #1f1b16; /* chữ chính + viền + bóng đổ */
  --ink-soft: #5b5446; /* chữ phụ */
  --ink-faint: #8f8878; /* caption, footer, đường kẻ đứt */

  /* Pastel (nền cho khối/chip) */
  --blue: #cfe2fb;
  --yellow: #fdeeb0;
  --pink: #fbd3dc;
  --green: #d8f0d2;
  --purple: #e3d9f7;
  --orange: #fde0c4;

  /* Nhấn */
  --accent: #c0453a; /* đỏ gạch: phụ đề/điểm nhấn cảm xúc */
}
```

### Vai trò màu (trung tính, áp dụng cho mọi chủ đề)

Mỗi màu pastel gắn với **một vai trò**, dùng nhất quán trong toàn site. Chọn gán vai trò theo nội dung của dự án, rồi **giữ cố định**.

| Biến       | Vai trò gợi ý                | Ví dụ dùng                        |
| ---------- | ---------------------------- | --------------------------------- |
| `--blue`   | Chính / khởi đầu / thông tin | Mục chính, bước đầu, tag chính    |
| `--yellow` | Phụ / trung gian / mẹo       | Bước giữa, mẹo, highlight         |
| `--pink`   | Cảnh báo / lỗi / lưu ý       | Callout cần chú ý, lỗi thường gặp |
| `--green`  | Thành công / kết quả / đích  | Kết quả, hoàn thành, kết luận     |
| `--purple` | Ghi chú phụ / tùy chọn       | Mở rộng, nâng cao                 |
| `--orange` | Nhấn nhẹ / nổi bật phụ       | Số liệu, điểm đáng chú ý          |
| `--accent` | Câu nhấn cảm xúc             | Chỉ **một** phụ đề/câu mỗi khối   |

Quy tắc dùng màu:

- Tối đa **3 màu pastel** trong cùng một khối nhìn.
- Tối đa **một** chỗ dùng `--accent` trong một vùng nhìn (thường là phụ đề dưới tiêu đề).
- Không dùng đen thuần `#000`, không dùng trắng thuần làm nền trang.
- Không truyền thông tin chỉ bằng màu: luôn kèm chữ hoặc icon.

---

## 4. Typography

**Font (Google Fonts, hỗ trợ tiếng Việt đầy đủ):**

- Body: **Patrick Hand**
- Display (tiêu đề lớn, nhãn): **Itim**
- Code: **JetBrains Mono**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Itim&family=JetBrains+Mono:wght@400;600&display=swap"
  rel="stylesheet"
/>
```

```css
:root {
  --font-body: "Patrick Hand", "Itim", "Comic Sans MS", cursive, sans-serif;
  --font-display: "Itim", "Patrick Hand", cursive, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

**Thang chữ:**

| Vai trò          | Size                           | Style                                          |
| ---------------- | ------------------------------ | ---------------------------------------------- |
| Hero title       | `clamp(2.6rem, 6vw, 4.5rem)`   | Display, đậm, `line-height: 1.05`, màu `--ink` |
| Section title    | `clamp(1.8rem, 3.5vw, 2.6rem)` | Display, `--ink`                               |
| Phụ đề nhấn      | `clamp(1.3rem, 2.5vw, 1.8rem)` | `--accent`, **luôn bắt đầu bằng "— "**         |
| Body             | `1.15rem`                      | `line-height: 1.6`, `--ink`                    |
| Mô tả phụ        | `1rem`                         | `--ink-soft`                                   |
| Caption / footer | `.9rem`                        | `--ink-faint`                                  |

Quy tắc chữ:

- Thuật ngữ / tên khối: **đậm**; phần giải thích đi kèm: nhỏ hơn, `--ink-soft`, ngăn bằng " — ".
- Nhãn trong sơ đồ hoặc chip: **2–4 từ**.
- Mỗi tiêu đề có thể kèm một **câu hook ngắn ba vế song song** ở dòng mô tả.
- Không dùng chữ IN HOA toàn bộ, trừ badge thương hiệu nhỏ.

---

## 5. Hình khối: viền, bo góc, bóng

```css
:root {
  --border: 2px solid var(--ink);
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 22px;
  --radius-pill: 999px;

  --shadow: 3px 3px 0 var(--ink); /* bóng đổ lệch cứng, KHÔNG blur */
  --shadow-sm: 2px 2px 0 var(--ink);
  --shadow-hover: 5px 5px 0 var(--ink);
}
```

Luật bất biến:

1. **Viền 2px màu `--ink`** cho mọi khối nổi (card, chip, nút, badge, hàng pastel).
2. **Bóng đổ lệch xuống-phải, màu `--ink`, blur = 0.**
3. Bo góc: card lớn `--radius-lg`, hàng/khối `--radius-md`, tag `--radius-sm`, chip tròn `--radius-pill`.
4. Một vài phần tử **xoay nhẹ** (±1–3°) làm điểm nhấn, không xoay hết.

---

## 6. Nền giấy kẻ ô

```css
body {
  margin: 0;
  background-color: var(--paper);
  background-image:
    linear-gradient(var(--paper-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--paper-grid) 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1.15rem;
  line-height: 1.6;
}
```

- Lưới 24px, nét rất mờ, không được lấn át chữ.
- Nội dung nằm trong **card lớn bo góc** hoặc trực tiếp trên giấy; luôn chừa nhiều khoảng trắng.

---

## 7. Bố cục

### 7.1 Khung trang

- Container: `max-width: 1120px; margin-inline: auto; padding-inline: clamp(16px, 4vw, 48px)`.
- Khoảng cách giữa section: `clamp(48px, 8vw, 96px)`.
- Padding trong card lớn: `clamp(24px, 5vw, 64px)`.

### 7.2 Hero (2 cột)

```
┌──────────────────────────────────────────────────────────┐
│ [badge nghiêng]  (chip trạng thái)                        │
│                                                          │
│  Tiêu đề rất lớn          ┌─────────────────────────┐    │
│  nhiều dòng               │  CARD SƠ ĐỒ             │    │
│  — phụ đề đỏ gạch         │  [hàng pastel xanh]     │    │
│  [tag] [tag] [tag]        │  [hàng pastel vàng]     │    │
│  Câu mô tả / hook         │  [hàng pastel hồng]     │    │
│                           └─────────────────────────┘    │
│                            [chip]→[chip]→[chip]→[chip]   │
│                                                          │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  footer một dòng  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈     │
└──────────────────────────────────────────────────────────┘
```

- Desktop: lưới `grid-template-columns: 1.1fr 1fr; gap: clamp(24px, 5vw, 64px); align-items: center`.
- Mobile (< 768px): 1 cột, thứ tự: badge → tiêu đề → phụ đề → tag → mô tả → card sơ đồ → flow chain.
- Hướng đọc (chữ Z): badge → tiêu đề → tag → diagram.
- Hero cao tối thiểu `min-height: 70vh`, nội dung căn giữa theo chiều dọc, có nhiều khoảng thở trên dưới.

### 7.3 Section nội dung thường

- Tiêu đề section (Display) + một dòng mô tả `--ink-soft`.
- Bên dưới: **lưới card** `repeat(auto-fit, minmax(260px, 1fr))`, `gap: 24px`, hoặc **danh sách hàng pastel** xếp dọc.
- Có thể xen kẽ hàng ngang (chữ trái – hình/sơ đồ phải) rồi đảo lại.

### 7.4 Điều hướng

- Thanh đơn giản, nền `--paper`, viền dưới `--border`.
- Mục menu dạng chữ Display; mục đang chọn có **gạch highlighter** hoặc pill pastel.
- Mobile: menu thu gọn thành nút, mở ra là card bo góc với bóng đổ lệch.

### 7.5 Footer

Một dòng chữ nhỏ `--ink-faint`, căn giữa, **hai bên là đường kẻ đứt** (xem component 8.8).

---

## 8. Component

### 8.1 Badge nghiêng (sticker thương hiệu)

```css
.badge-tilt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--white);
  border: var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  transform: rotate(-2deg);
  font-family: var(--font-display);
  text-transform: uppercase;
}
```

### 8.2 Pill / Chip

```css
.pill {
  display: inline-block;
  padding: 6px 16px;
  border: var(--border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-display);
  background: var(--yellow);
}
.pill--blue {
  background: var(--blue);
}
.pill--yellow {
  background: var(--yellow);
}
.pill--pink {
  background: var(--pink);
}
.pill--green {
  background: var(--green);
}
.pill--purple {
  background: var(--purple);
}
```

Tag kiểu vuông (`.tag`): giống pill nhưng `border-radius: var(--radius-sm)` và `padding: 8px 18px`, cỡ chữ lớn hơn.

### 8.3 Card lớn

```css
.card {
  background: var(--card);
  border: var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: clamp(16px, 3vw, 28px);
}
```

### 8.4 Hàng pastel (stack row)

Xếp dọc trong card, mỗi hàng: **icon + tên đậm + " — mô tả ngắn"**, nền pastel, viền đậm, bo `--radius-md`, `gap: 10px` giữa các hàng.

### 8.5 Flow chain (chuỗi bước nối mũi tên)

- Các chip nhỏ nối bằng mũi tên tay vẽ (SVG nét `2px`, `stroke-linecap: round`, hơi cong).
- Desktop: ngang. Mobile: cho phép xuống dòng hoặc đổi sang dọc; **không** co chữ nhỏ hơn `.9rem`.

### 8.6 Nút (button)

Giống pill: nền pastel hoặc `--white`, viền đậm, bóng đổ lệch. Nút chính dùng `--yellow` hoặc `--blue`.

### 8.7 Code block

Nền `#fff8e1`, viền `--border`, bo `--radius-md`, bóng đổ lệch, font mono, nút copy góc trên phải. Highlight cú pháp dùng bảng màu ấm/pastel; **không** dùng theme tối neon.

### 8.8 Footer dòng kẻ đứt

```css
.footer-line {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--ink-faint);
  font-size: 0.9rem;
  text-align: center;
}
.footer-line::before,
.footer-line::after {
  content: "";
  flex: 1;
  border-top: 2px dashed var(--ink-faint);
}
```

### 8.9 Callout / ghi chú

Hộp pastel, viền đậm, bóng đổ lệch, có thể xoay ±1°, có thể thêm "băng keo" (hình chữ nhật mờ xoay ở góc trên). Màu theo vai trò (hồng = lưu ý, vàng = mẹo, xanh = thông tin).

### 8.10 Highlighter (nhấn từ khóa trong đoạn văn)

```css
.hl {
  background: linear-gradient(transparent 55%, var(--yellow) 55%);
  padding: 0 2px;
}
```

---

## 9. Chi tiết "vẽ tay"

1. Bóng đổ **luôn lệch và cứng**.
2. Viền **luôn đậm 2px màu mực**, không xám mờ.
3. Xoay nhẹ chọn lọc (badge, callout, một vài chip).
4. Bo góc hơi lệch nhau (vd. `14px 18px 12px 16px`) có thể dùng tiết chế để gợi nét tay.
5. Icon: **emoji** hoặc SVG nét tay đơn giản. Tránh bộ icon phẳng quá "corporate".
6. Tương tác (hover/active) như nhấc/ấn nhãn dán:

```css
.interactive {
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}
.interactive:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-hover);
}
.interactive:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}
```

---

## 10. Giọng điệu giao diện

- Thân thiện, như người học cùng người học. Câu ngắn, có nhịp.
- Nhãn, nút, tiêu đề: cô đọng, 2–4 từ khi có thể.
- Có thể thêm yếu tố **hành trình/tiến độ** (chip "Bài 3/10", "Chương 2") nếu nội dung phù hợp.
- Tránh văn marketing sáo rỗng.

---

## 11. Accessibility & hiệu năng

- Tương phản chữ/nền tối thiểu **WCAG AA**. `--ink-faint` chỉ dùng cho nội dung phụ, cỡ ≥ 14px.
- Focus rõ ràng: `outline: 3px solid var(--ink); outline-offset: 3px`.
- Tôn trọng `prefers-reduced-motion`: tắt transition và hiệu ứng xoay động.
- Thẻ ngữ nghĩa (`header/nav/main/section/footer`), đúng một `h1` mỗi trang.
- Ảnh có `alt`; SVG có `<title>` hoặc `aria-label`.
- Font: `font-display: swap`, chỉ tải weight cần dùng.

---

## 12. Cấu trúc thư mục gợi ý

```
/
├── CLAUDE.md
├── index.html
├── css/
│   ├── tokens.css       # biến màu, font, viền, bóng (mục 3–5)
│   ├── base.css         # reset, nền giấy, typography
│   └── components.css   # badge, pill, card, row, flow, code, callout...
├── js/
│   └── main.js
└── assets/              # svg mũi tên, icon
```

---

## 13. Quy trình cho Claude Code

1. Đọc hết file này trước khi viết code.
2. Tạo `tokens.css` + `base.css` trước.
3. Dựng **một trang demo component** (`/styleguide.html`) liệt kê: badge, pill, tag, card, hàng pastel, flow chain, nút, code block, callout, footer. Kiểm tra phong cách ở đây trước.
4. Sau đó dựng các trang thật theo nội dung người dùng cung cấp, **chỉ dùng token và component đã có**.
5. Cần component mới: thêm vào `components.css`, tuân theo mục 5 và 9.
6. Trước khi kết thúc: kiểm tra 375 / 768 / 1280px, tương phản, điều hướng bàn phím.

## 14. Điều KHÔNG được làm

- Không bóng đổ mờ (blur), gradient rực, glassmorphism, neon.
- Không nền tối mặc định. Nếu cần dark mode: "giấy tối" ấm (`#1e1b16`, lưới mờ sáng), giữ nguyên viền + bóng kiểu sticker.
- Không dùng font sans-serif hệ thống làm font chính.
- Không dùng thư viện UI có sẵn phá phong cách.
- Không đổi vai trò của màu giữa các trang.
- Không nhồi quá nhiều điểm nhấn: tối đa 1 câu `--accent` và 3 màu pastel mỗi vùng nhìn.
