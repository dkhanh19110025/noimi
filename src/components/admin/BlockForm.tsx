"use client";

import { useState } from "react";
import { SESSIONS } from "@/data/booking";

const TYPES = [
  { id: "day", label: "🚫 Cả ngày" },
  ...SESSIONS.map((s) => ({ id: s.id, label: `${s.icon} ${s.label}` })),
  { id: "range", label: "⏱ Khung giờ" },
];

function timeOptions(from: number, to: number) {
  const out: { v: number; label: string }[] = [];
  for (let m = from; m <= to; m += 30) {
    out.push({ v: m, label: `${Math.floor((m % 1440) / 60)}:${String(m % 60).padStart(2, "0")}` });
  }
  return out;
}

export default function BlockForm({
  action,
  minDay,
}: {
  action: (formData: FormData) => void | Promise<void>;
  minDay: string;
}) {
  const [type, setType] = useState("day");

  return (
    <form action={action} className="card block-form">
      <h2>➕ Thêm lịch nghỉ</h2>

      <label className="block-form__field">
        <span>Ngày nghỉ</span>
        <input className="form-input" type="date" name="day" min={minDay} required />
      </label>

      <fieldset className="block-form__types">
        <legend>Nghỉ</legend>
        {TYPES.map((t) => (
          <label key={t.id} className="chip-radio">
            <input
              type="radio"
              name="type"
              value={t.id}
              checked={type === t.id}
              onChange={() => setType(t.id)}
            />
            <span>{t.label}</span>
          </label>
        ))}
      </fieldset>

      {type === "range" && (
        <div className="block-form__range">
          <label className="block-form__field">
            <span>Từ</span>
            <select className="form-input" name="from" defaultValue={540}>
              {timeOptions(420, 1410).map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block-form__field">
            <span>Đến</span>
            <select className="form-input" name="to" defaultValue={660}>
              {timeOptions(450, 1440).map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="block-form__field">
        <span>Lý do (chỉ mình bạn thấy)</span>
        <input className="form-input" type="text" name="reason" maxLength={200} />
      </label>

      <button type="submit" className="btn btn--blue interactive">⛔ Chặn lịch</button>
    </form>
  );
}
