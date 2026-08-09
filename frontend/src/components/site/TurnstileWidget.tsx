// Cloudflare Turnstile widget. Loads the script once per page and renders one
// widget into a ref, handing the resulting token up to the form.
//
// The token is only meaningful because the backend posts it to Cloudflare's
// siteverify — this component is the user-facing half of a check that happens
// server-side.

import { useEffect, useRef } from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Resolves once the Turnstile script has loaded, injecting it if needed. */
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Turnstile")),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** Called with a fresh token, or null when it expires or errors. */
  onToken: (token: string | null) => void;
  onError?: (message: string) => void;
}

export default function TurnstileWidget({
  siteKey,
  onToken,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Refs, not deps: re-rendering the widget on every parent render would reset
  // the challenge and drop a token the user already earned.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  // No dep array: keep the refs current after every render, without making the
  // render itself impure.
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            onErrorRef.current?.("Captcha failed to load. Please refresh.");
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        onErrorRef.current?.("Captcha failed to load. Please refresh.");
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  // data-cursor-native: the custom cursor hides while this subtree is
  // hovered — the OS cursor is the only one that works inside the iframe.
  return <div ref={containerRef} data-cursor-native />;
}
