"use client";

import { MAX_IMAGE_BYTES } from "@/lib/image-file";

/** Ô chọn ảnh; chặn file quá lớn ngay ở trình duyệt vì server sẽ từ chối cả request. */
export default function ImageFileInput() {
  return (
    <input
      className="form-input"
      name="image_file"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) => {
        const input = e.currentTarget;
        const tooBig = (input.files?.[0]?.size ?? 0) > MAX_IMAGE_BYTES;
        input.setCustomValidity(tooBig ? "Ảnh lớn hơn 4 MB, vui lòng chọn ảnh nhỏ hơn." : "");
        input.reportValidity();
      }}
    />
  );
}
