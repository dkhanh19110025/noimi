/** Chỉ cho chuyển hướng về đường dẫn nội bộ (chống open redirect). */
export function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/ho-so";
  return raw;
}
