"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SESSIONS } from "@/data/booking";
import { combos } from "@/data/combos";
import { isShopPath, shop } from "@/data/shop";
import { QUICK_QUESTIONS, reply, type BotReply } from "@/lib/chat-bot";

type Message = BotReply & { from: "bot" | "user" };

const GREETING: Message = {
  from: "bot",
  text: "Chào bạn 👋 Bạn muốn tìm combo rẻ, hỏi cách đặt lịch hay địa chỉ tiệm?",
};

/** Khung chat tư vấn theo từ khóa, hiện ở mọi trang khách. */
export default function ChatBot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Trên điện thoại không tự bật bàn phím, để khách thấy lời chào và câu hỏi gợi ý trước
    (matchMedia("(pointer: fine)").matches ? inputRef : dialogRef).current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Bàn phím iOS che trang mà không đổi 100dvh: ép khung chat nằm trong phần còn nhìn thấy
  useEffect(() => {
    const view = window.visualViewport;
    const box = dialogRef.current;
    if (!open || !view || !box) return;
    const fit = () => {
      box.style.setProperty("--vv-height", `${view.height}px`);
      box.style.setProperty("--vv-bottom", `${Math.max(0, window.innerHeight - view.height - view.offsetTop)}px`);
    };
    fit();
    view.addEventListener("resize", fit);
    view.addEventListener("scroll", fit);
    return () => {
      view.removeEventListener("resize", fit);
      view.removeEventListener("scroll", fit);
    };
  }, [open]);

  // Cuộn tới đầu câu trả lời mới nhất
  useEffect(() => {
    const log = logRef.current;
    const last = log?.lastElementChild as HTMLElement | null | undefined;
    if (log && last) log.scrollTop = last.offsetTop - 8;
  }, [messages, open]);

  function close() {
    setOpen(false);
    // Nút mở chỉ xuất hiện lại sau khi khung đóng
    setTimeout(() => openerRef.current?.focus());
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setText("");
    setBusy(true);
    setMessages((m) => [...m, { from: "user", text: q }]);
    // Giữ ba chấm tối thiểu 0,9 giây cho giống người đang gõ
    await new Promise((done) => setTimeout(done, 900));
    const answer = reply(q, { services: combos, shop, sessions: SESSIONS });
    setMessages((m) => [...m, { from: "bot", ...answer }]);
    setBusy(false);
  }

  if (pathname.startsWith("/admin")) return null;

  if (!open) {
    return (
      <button ref={openerRef} type="button" className={`chat-float interactive${isShopPath(pathname) ? "" : " chat-float--low"}`} onClick={() => setOpen(true)}>
        <span aria-hidden="true">🤖</span> Tư vấn
      </button>
    );
  }

  return (
    <div ref={dialogRef} className="chat" role="dialog" aria-labelledby="chat-title" tabIndex={-1}>
      <div className="chat__head">
        <h2 id="chat-title">🤖 Trợ lý của tiệm</h2>
        <button type="button" className="chat__close interactive" onClick={close} aria-label="Đóng khung chat">
          ✕
        </button>
      </div>

      <div className="chat__log" ref={logRef} role="log">
        {messages.map((m, i) => (
          <div key={i} className={`chat__msg chat__msg--${m.from}`}>
            <p>{m.text}</p>
            {m.links && (
              <div className="chat__links">
                {m.links.map((l) =>
                  l.href === "zalo" ? (
                    <button
                      key={l.href}
                      type="button"
                      className="chat__chip interactive"
                      onClick={() => {
                        setOpen(false);
                        window.dispatchEvent(new Event("open-zalo"));
                      }}
                    >
                      {l.label}
                    </button>
                  ) : l.href.startsWith("http") ? (
                    <a key={l.href} className="chat__chip interactive" href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.href} className="chat__chip interactive" href={l.href} onClick={() => setOpen(false)}>
                      {l.label}
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="chat__msg chat__typing" role="img" aria-label="Trợ lý đang soạn tin nhắn">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="chat__quick">
        {QUICK_QUESTIONS.map((q) => (
          <button key={q} type="button" className="chat__chip interactive" disabled={busy} onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      <form
        className="chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <input
          ref={inputRef}
          className="form-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập câu hỏi…"
          aria-label="Câu hỏi của bạn"
          maxLength={200}
          enterKeyHint="send"
        />
        <button type="submit" className="btn btn--blue interactive" disabled={busy}>
          Gửi
        </button>
      </form>
    </div>
  );
}
