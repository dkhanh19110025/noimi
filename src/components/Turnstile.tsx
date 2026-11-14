"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Cloudflare Turnstile widget.
 * Renders the invisible/managed challenge and calls `onToken` when verified.
 *
 * Requires NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.
 * In dev, set it to Cloudflare's always-pass test key:
 *   1x00000000000000000000AA
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

type Props = {
  onToken: (token: string) => void;
  onExpire?: () => void;
};

export default function Turnstile({ onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const rendered = useRef(false);

  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
    "1x00000000000000000000AA"; // test key - always passes

  const mount = useCallback(() => {
    if (!containerRef.current || rendered.current) return;
    if (!window.turnstile) return;

    rendered.current = true;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => onExpire?.(),
      theme: "light",
      size: "normal",
    });
  }, [siteKey, onToken, onExpire]);

  useEffect(() => {
    // If script already loaded
    if (window.turnstile) {
      mount();
      return;
    }

    // Load script
    const existing = document.querySelector(
      'script[src*="turnstile"]'
    );
    if (!existing) {
      window.onTurnstileLoad = mount;
      const s = document.createElement("script");
      s.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      s.async = true;
      document.head.appendChild(s);
    } else {
      // Script exists but hasn't loaded yet — poll briefly
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          mount();
        }
      }, 200);
      return () => clearInterval(t);
    }
  }, [mount]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
        rendered.current = false;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ marginTop: 8 }} />;
}
