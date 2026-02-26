"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        })
        .catch(() => {});
    });
  }, []);
  return null;
}
