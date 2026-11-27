import assert from "node:assert/strict";
import { sniffImage, uploadedImageName } from "../src/lib/image-file.ts";

const bytes = (...v) => new Uint8Array(v);
const text = (s) => new TextEncoder().encode(s);

assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext, "jpg");
assert.equal(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext, "png");
assert.equal(sniffImage(text("RIFF0000WEBPVP8 "))?.ext, "webp");
assert.equal(sniffImage(text("RIFF0000WAVEfmt ")), null);
assert.equal(sniffImage(text('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
assert.equal(sniffImage(bytes()), null);
const prefix = "https://x.supabase.co/storage/v1/object/public/product-images/";
const file = "ccb3a3ca-ca61-4459-b356-5059f8f6c546.png";
assert.equal(uploadedImageName(prefix + file, prefix), file);
assert.equal(uploadedImageName(prefix + file + "?v=2", prefix), file);
assert.equal(uploadedImageName("https://example.com/" + file, prefix), null);
assert.equal(uploadedImageName(prefix + "../other/" + file, prefix), null);
assert.equal(uploadedImageName(null, prefix), null);
console.log("image-file: OK");
