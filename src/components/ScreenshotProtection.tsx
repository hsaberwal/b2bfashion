"use client";

import { useEffect } from "react";

/** Blocks right-click (context menu) on elements with class .screenshot-protected to reduce casual screenshots/copy of pricing. */
export function ScreenshotProtection() {
  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target?.closest?.(".screenshot-protected")) {
        e.preventDefault();
      }
    }
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);
  return null;
}
