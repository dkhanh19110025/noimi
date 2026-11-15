"use client";

import { useState, useCallback, useEffect } from "react";
import { combos, formatDuration, formatPrice, type Combo } from "@/data/combos";
import {
  isHoliday,
  toDateStr,
  dayName,
  SESSIONS,
  sessionOf,
  MAX_DAYS_AHEAD,
  MIN_HOURS_AHEAD,
} from "@/data/booking";
import { shop } from "@/data/shop";
import Turnstile from "@/components/Turnstile";

/* ── types ── */
type BookingData = {
  combo: Combo | null;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  note: string;
};

const INITIAL: BookingData = {
  combo: null,
  date: "",
  time: "",
  name: "",
  phone: "",
  email: "",
  note: "",
};

/* ══════════════════════════════════════════════════════════════════ */
export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [serverError, setServerError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [slotsError, setSlotsError] = useState("");
  const [notice, setNotice] = useState("");

  /* ── tải giờ trống từ server mỗi khi vào bước 3 ── */
  const comboId = data.combo?.id;
  useEffect(() => {
    if (step !== 3 || !comboId || !data.date) return;
    const ctrl = new AbortController();
    setSlotsStatus("loading");
    setSlotsError("");
    fetch(`/api/availability?date=${data.date}&combo_id=${comboId}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? "Không tải được giờ trống.");
        setSlots(json.slots as string[]);
        setSlotsStatus("ok");
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setSlotsError(e.message || "Không tải được giờ trống.");
        setSlotsStatus("error");
      });
    return () => ctrl.abort();
  }, [step, comboId, data.date]);

  /* ── helpers ── */
  const goNext = () => {
    setNotice("");
    setStep((s) => Math.min(s + 1, 4));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const onTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  /* ── Zalo deep link ── */

  /* ── STEP 1 — chọn combo ── */
  function StepCombo() {
    return (
      <>
        <div className="step-header">
          <span className="badge-tilt">Đặt lịch nối mi</span>
          <span className="pill pill--blue">Bước 1/4</span>
        </div>

        <h1 style={{ marginTop: 24 }}>Chọn combo</h1>
        <p className="subtitle">— mi xinh trong vài phút</p>
        <p className="muted" style={{ marginTop: 12 }}>
          Chọn kiểu <span className="hl">bạn thích</span> — xem giá — xem thời
          gian.
        </p>

        <ul className="combo-grid" style={{ listStyle: "none", padding: 0 }}>
          {combos.map((c) => (
            <li
              key={c.id}
              className={`card combo-card interactive ${
                data.combo?.id === c.id ? "combo-card--selected" : ""
              }`}
              onClick={() => {
                setData((d) => ({ ...d, combo: c, time: "" }));
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setData((d) => ({ ...d, combo: c, time: "" }));
                }
              }}
            >
              <div
                className="combo-card__img"
                style={{ background: `var(--${c.color})` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt={`Hình mẫu ${c.name}`}
                  width={400}
                  height={300}
                />
              </div>
              <div className="combo-card__body">
                <h2 className="combo-card__name">{c.name}</h2>
                <p className="combo-card__desc">{c.description}</p>
                <div className="combo-card__meta">
                  <span className="pill pill--yellow">
                    💰 {formatPrice(c.price)}
                  </span>
                  <span className="pill pill--green">
                    ⏱ {formatDuration(c.durationMinutes)}
                  </span>
                </div>
              </div>
              {data.combo?.id === c.id && (
                <div className="combo-card__check">
                  <span>✓ Đã chọn</span>
                  <button
                    type="button"
                    className="btn interactive combo-card__next"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    Tiếp → Chọn ngày
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {!data.combo && (
          <p className="muted" style={{ marginTop: 20 }}>
            👆 Chạm vào một combo để chọn — nút Tiếp sẽ hiện ngay trên combo đó.
          </p>
        )}
      </>
    );
  }

  /* ── STEP 2 — chọn ngày ── */
  function StepDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tạo lịch MAX_DAYS_AHEAD ngày kể từ hôm nay
    const days: Date[] = [];
    for (let i = 0; i < MAX_DAYS_AHEAD; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    return (
      <>
        <div className="step-header">
          <span className="badge-tilt">Đặt lịch nối mi</span>
          <span className="pill pill--blue">Bước 2/4</span>
        </div>

        <h1 style={{ marginTop: 24 }}>Chọn ngày</h1>
        <p className="subtitle">
          — {data.combo?.name} · {formatPrice(data.combo?.price ?? 0)}
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          Đặt trước tối đa{" "}
          <span className="hl">{MAX_DAYS_AHEAD} ngày</span>. Ngày nghỉ
          hoặc đã qua — không chọn được.
        </p>

        <div className="date-grid">
          {days.map((d) => {
            const ds = toDateStr(d);
            const isPast = d < today;
            const holiday = isHoliday(ds);
            const disabled = isPast || holiday;
            const selected = data.date === ds;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            return (
              <button
                key={ds}
                className={[
                  "date-cell",
                  "interactive",
                  selected ? "date-cell--selected" : "",
                  disabled ? "date-cell--disabled" : "",
                  isWeekend ? "date-cell--weekend" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={disabled}
                onClick={() =>
                  setData((prev) => ({ ...prev, date: ds, time: "" }))
                }
                title={
                  holiday
                    ? "Ngày nghỉ lễ"
                    : isPast
                    ? "Đã qua"
                    : `${dayName(d)} ${d.getDate()}/${d.getMonth() + 1}`
                }
              >
                <span className="date-cell__day">{dayName(d)}</span>
                <span className="date-cell__num">{d.getDate()}</span>
                <span className="date-cell__month">
                  Th{d.getMonth() + 1}
                </span>
                {holiday && <span className="date-cell__badge">🏖️</span>}
              </button>
            );
          })}
        </div>

        <div className="step-actions step-actions--sticky">
          <button className="btn btn--white interactive" onClick={goBack}>
            ← Quay lại
          </button>
          <button
            className="btn interactive"
            disabled={!data.date}
            onClick={goNext}
          >
            Tiếp → Chọn giờ
          </button>
        </div>
      </>
    );
  }

  /* ── STEP 3 — chọn giờ ── */
  function StepTime() {
    // Nhóm giờ trống theo buổi
    const groups = SESSIONS.map((ses) => ({
      ses,
      times: slots.filter((t) => sessionOf(t)?.id === ses.id),
    })).filter((g) => g.times.length > 0);

    return (
      <>
        <div className="step-header">
          <span className="badge-tilt">Đặt lịch nối mi</span>
          <span className="pill pill--blue">Bước 3/4</span>
        </div>

        <h1 style={{ marginTop: 24 }}>Chọn giờ</h1>
        <p className="subtitle">
          — {data.combo?.name} · Ngày{" "}
          {data.date.split("-").reverse().join("/")}
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          Nhận lịch 3 buổi:{" "}
          {SESSIONS.map((x, i) => (
            <span key={x.id}>
              {i > 0 && " · "}
              {x.label.replace("Buổi ", "")} <span className="hl">{x.range}</span>
            </span>
          ))}
          . Đặt trước ít nhất {MIN_HOURS_AHEAD} tiếng · Chỉ hiện giờ còn trống.
        </p>

        {notice && (
          <div className="callout callout--error" style={{ marginTop: 16 }}>
            ⚠️ {notice}
          </div>
        )}

        {slotsStatus === "loading" || slotsStatus === "idle" ? (
          <p className="muted" style={{ marginTop: 24 }}>⏳ Đang tải giờ trống…</p>
        ) : slotsStatus === "error" ? (
          <div className="callout callout--error" style={{ marginTop: 24 }}>
            ⚠️ {slotsError}
          </div>
        ) : slots.length === 0 ? (
          <div className="callout" style={{ marginTop: 24 }}>
            😔 Ngày này đã hết giờ trống. Vui lòng chọn ngày khác.
          </div>
        ) : (
          <>
            {groups.map(({ ses, times }) => (
              <div key={ses.id}>
                <h2 style={{ marginTop: 28, fontSize: "1.3rem" }}>
                  {ses.icon} {ses.label}{" "}
                  <span className="muted" style={{ fontSize: "1rem" }}>({ses.range})</span>
                </h2>
                <div className="time-grid">
                  {times.map((s) => (
                    <button
                      key={s}
                      className={`time-cell interactive ${
                        data.time === s ? "time-cell--selected" : ""
                      }`}
                      onClick={() => setData((prev) => ({ ...prev, time: s }))}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="step-actions step-actions--sticky">
          <button className="btn btn--white interactive" onClick={goBack}>
            ← Quay lại
          </button>
          <button
            className="btn interactive"
            disabled={!data.time}
            onClick={goNext}
          >
            Tiếp → Nhập thông tin
          </button>
        </div>
      </>
    );
  }

  /* ── STEP 4 — thông tin khách + Turnstile ── */
  function StepInfo() {
    const validate = (): boolean => {
      const e: Record<string, string> = {};
      if (!data.name.trim()) e.name = "Vui lòng nhập tên.";
      if (!data.phone.trim()) {
        e.phone = "Vui lòng nhập số điện thoại.";
      } else if (!/^(0|\+?84)\d{9}$/.test(data.phone.replace(/[\s.\-]/g, ""))) {
        e.phone = "Số điện thoại không hợp lệ (VD: 0901234567).";
      }
      if (
        data.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
      ) {
        e.email = "Email không hợp lệ.";
      }
      if (!turnstileToken) {
        e.turnstile = "Vui lòng hoàn thành xác minh bảo mật.";
      }
      setErrors(e);
      return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
      if (!validate()) return;

      setSubmitting(true);
      setServerError("");

      try {
        const res = await fetch("/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comboId: data.combo?.id,
            comboName: data.combo?.name,
            date: data.date,
            time: data.time,
            name: data.name.trim(),
            phone: data.phone.trim(),
            email: data.email.trim(),
            note: data.note.trim(),
            turnstileToken,
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          if (json.code === "SLOT_TAKEN") {
            // Giờ vừa bị người khác đặt: quay lại chọn giờ, tải lại danh sách
            setNotice(json.error);
            setData((d) => ({ ...d, time: "" }));
            setTurnstileToken("");
            setStep(3);
          } else {
            setServerError(json.error ?? "Có lỗi xảy ra.");
          }
          setSubmitting(false);
          return;
        }

        setBookingId(json.bookingId ?? "");
        setSubmitted(true);
      } catch {
        setServerError("Không kết nối được server. Vui lòng thử lại.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <>
        <div className="step-header">
          <span className="badge-tilt">Đặt lịch nối mi</span>
          <span className="pill pill--blue">Bước 4/4</span>
        </div>

        <h1 style={{ marginTop: 24 }}>Thông tin của bạn</h1>
        <p className="subtitle">
          — {data.combo?.name} · {data.date.split("-").reverse().join("/")}{" "}
          lúc {data.time}
        </p>

        <div className="booking-form">
          {/* Tên */}
          <div className="form-group">
            <div className="float-field">
              <input
                id="f-name"
                className={`form-input ${errors.name ? "form-input--error" : ""}`}
                type="text"
                placeholder=" "
                autoComplete="name"
                value={data.name}
                onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
              />
              <label htmlFor="f-name">
                Tên của bạn <span className="form-required">*</span>
              </label>
            </div>
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Số điện thoại */}
          <div className="form-group">
            <div className="float-field">
              <input
                id="f-phone"
                className={`form-input ${errors.phone ? "form-input--error" : ""}`}
                type="tel"
                placeholder=" "
                autoComplete="tel"
                value={data.phone}
                onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
              />
              <label htmlFor="f-phone">
                Số điện thoại <span className="form-required">*</span>
              </label>
            </div>
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <div className="float-field">
              <input
                id="f-email"
                className={`form-input ${errors.email ? "form-input--error" : ""}`}
                type="email"
                placeholder=" "
                autoComplete="email"
                value={data.email}
                onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
              />
              <label htmlFor="f-email">Email (không bắt buộc)</label>
            </div>
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {/* Ghi chú */}
          <div className="form-group">
            <div className="float-field">
              <textarea
                id="f-note"
                className="form-input form-textarea"
                rows={3}
                placeholder=" "
                value={data.note}
                onChange={(e) => setData((d) => ({ ...d, note: e.target.value }))}
              />
              <label htmlFor="f-note">Ghi chú (không bắt buộc)</label>
            </div>
          </div>

          {/* Turnstile */}
          <div>
            <Turnstile
              onToken={onTurnstileToken}
              onExpire={onTurnstileExpire}
            />
            {errors.turnstile && (
              <span className="form-error">{errors.turnstile}</span>
            )}
          </div>
        </div>

        {/* Tóm tắt */}
        <div className="booking-summary card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 12 }}>
            📋 Tóm tắt đặt lịch
          </h2>
          <div className="summary-row">
            <span>Combo:</span>
            <strong>{data.combo?.name}</strong>
          </div>
          <div className="summary-row">
            <span>Giá:</span>
            <strong>{formatPrice(data.combo?.price ?? 0)}</strong>
          </div>
          <div className="summary-row">
            <span>Thời lượng:</span>
            <strong>
              {formatDuration(data.combo?.durationMinutes ?? 0)}
            </strong>
          </div>
          <div className="summary-row">
            <span>Ngày:</span>
            <strong>{data.date.split("-").reverse().join("/")}</strong>
          </div>
          <div className="summary-row">
            <span>Giờ:</span>
            <strong>{data.time}</strong>
          </div>
        </div>

        {serverError && (
          <div className="callout callout--error" style={{ marginTop: 16 }}>
            ⚠️ {serverError}
          </div>
        )}

        <div className="step-actions">
          <button
            className="btn btn--white interactive"
            onClick={goBack}
            disabled={submitting}
          >
            ← Quay lại
          </button>
          <button
            className="btn interactive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "⏳ Đang gửi…" : "✅ Xác nhận đặt lịch"}
          </button>
        </div>
      </>
    );
  }

  /* ── TRANG XÁC NHẬN THÀNH CÔNG ── */
  if (submitted) {

    return (
      <main className="container section">
        <div className="confirm-done">
          <div className="confirm-done__icon">🎉</div>
          <h1>Đặt lịch thành công!</h1>
          <p className="subtitle">Cảm ơn {data.name}!</p>

          {/* Tóm tắt lịch */}
          <div className="booking-summary card" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 12 }}>
              📋 Chi tiết lịch hẹn
            </h2>
            <div className="summary-row">
              <span>Mã đặt lịch:</span>
              <strong className="hl">{bookingId}</strong>
            </div>
            <div className="summary-row">
              <span>Combo:</span>
              <strong>{data.combo?.name}</strong>
            </div>
            <div className="summary-row">
              <span>Giá:</span>
              <strong>{formatPrice(data.combo?.price ?? 0)}</strong>
            </div>
            <div className="summary-row">
              <span>Thời lượng:</span>
              <strong>
                {formatDuration(data.combo?.durationMinutes ?? 0)}
              </strong>
            </div>
            <div className="summary-row">
              <span>Ngày:</span>
              <strong>
                {data.date.split("-").reverse().join("/")}
              </strong>
            </div>
            <div className="summary-row">
              <span>Giờ:</span>
              <strong>{data.time}</strong>
            </div>
            <div className="summary-row">
              <span>Khách:</span>
              <strong>{data.name}</strong>
            </div>
            <div className="summary-row">
              <span>SĐT:</span>
              <strong>{data.phone}</strong>
            </div>
          </div>

          {/* Địa chỉ + Google Maps */}
          <div className="card confirm-address" style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8 }}>
              📍 Địa chỉ tiệm
            </h2>
            <p style={{ fontSize: "1.05rem" }}>{shop.address}</p>
            <a
              href={shop.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--blue interactive"
              style={{ marginTop: 12 }}
            >
              🗺️ Xem trên Google Maps
            </a>
          </div>

          {/* Nút nhắn Zalo */}
          <div className="confirm-actions" style={{ marginTop: 20 }}>
            <a
              href={`tel:${shop.phone}`}
              className="btn btn--white interactive"
            >
              📞 Gọi điện
            </a>
          </div>

          {/* Email notice */}
          {data.email && (
            <p className="muted" style={{ marginTop: 20 }}>
              📧 Email xác nhận đã được gửi đến{" "}
              <strong>{data.email}</strong> kèm link hủy / đổi lịch.
            </p>
          )}

          {/* Hủy / đổi lịch: hiện chưa tự làm trên web, hướng khách nhắn Zalo kèm mã lịch */}
          <section className="change-box" aria-label="Hủy hoặc đổi lịch">
            <h2>🔁 Cần hủy hoặc đổi lịch?</h2>
            <p>
              Nhắn Zalo cho tiệm kèm mã lịch <strong className="change-box__code">{bookingId}</strong>{" "}
              — tiệm sẽ xử lý giúp bạn.
            </p>
            <div className="change-box__actions">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-zalo"))}
                className="btn btn--white interactive"
              >
                ❌ Hủy lịch
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-zalo"))}
                className="btn btn--blue interactive"
              >
                📅 Đổi lịch
              </button>
            </div>
          </section>

          <p className="muted" style={{ marginTop: 16 }}>
            Chúng mình sẽ liên hệ xác nhận qua SĐT của bạn. 💕
          </p>

          <button
            className="btn interactive"
            style={{ marginTop: 24 }}
            onClick={() => {
              setData(INITIAL);
              setStep(1);
              setSubmitted(false);
              setBookingId("");
              setErrors({});
              setServerError("");
              setTurnstileToken("");
            }}
          >
            🔄 Đặt lịch mới
          </button>
        </div>
      </main>
    );
  }

  /* ── RENDER ── */
  return (
    <main className="container section">
      {/* Progress bar */}
      <div className="progress-bar">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`progress-step ${
              s === step
                ? "progress-step--active"
                : s < step
                ? "progress-step--done"
                : ""
            }`}
          >
            <span className="progress-step__num">
              {s < step ? "✓" : s}
            </span>
            <span className="progress-step__label">
              {s === 1
                ? "Combo"
                : s === 2
                ? "Ngày"
                : s === 3
                ? "Giờ"
                : "Thông tin"}
            </span>
          </div>
        ))}
      </div>

      {/* Gọi như hàm (không dùng <Step />) để React không tạo lại ô nhập mỗi lần gõ */}
      {step === 1 && StepCombo()}
      {step === 2 && StepDate()}
      {step === 3 && StepTime()}
      {step === 4 && StepInfo()}
    </main>
  );
}
