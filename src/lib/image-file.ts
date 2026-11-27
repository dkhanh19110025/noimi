// Vercel chỉ nhận request tối đa 4,5 MB nên ảnh giới hạn 4 MB (xem bodySizeLimit trong next.config.mjs).
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Tên file nếu link trỏ tới ảnh do trang admin tải lên (nằm dưới `prefix`), ngược lại null. */
export function uploadedImageName(url: string | null, prefix: string): string | null {
  if (!url?.startsWith(prefix)) return null;
  const name = url.slice(prefix.length).split(/[?#]/)[0];
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name) ? name : null;
}

/** Nhận dạng ảnh theo vài byte đầu, không tin tên file hay MIME do trình duyệt gửi. */
export function sniffImage(b: Uint8Array): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  const has = (at: number, sig: number[]) => sig.every((v, i) => b[at + i] === v);
  if (has(0, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (has(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
  // "RIFF" …… "WEBP"
  if (has(0, [0x52, 0x49, 0x46, 0x46]) && has(8, [0x57, 0x45, 0x42, 0x50])) return { ext: "webp", mime: "image/webp" };
  return null;
}
