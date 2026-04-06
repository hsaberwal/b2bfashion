"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Only show on mobile/tablet devices
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Check if already installed as PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("install_dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(isApple);

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // On iOS, show the manual instruction banner after a delay
    if (isApple) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("install_dismissed", String(Date.now()));
  }

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-je-black text-white safe-area-bottom animate-in">
      <div className="max-w-lg mx-auto flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-lg font-bold">
          C
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Add Claudia to your home screen</p>
          {isIos ? (
            <p className="text-xs text-white/60 mt-1">
              Tap the share button
              <svg className="inline w-4 h-4 mx-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              then &quot;Add to Home Screen&quot;
            </p>
          ) : (
            <p className="text-xs text-white/60 mt-1">Quick access from your home screen</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isIos && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-white text-je-black text-xs uppercase tracking-wider font-semibold rounded transition-colors hover:bg-je-offwhite"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-2 text-white/40 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
