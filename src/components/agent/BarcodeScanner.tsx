"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

/**
 * Live camera barcode scanner (1D retail barcodes + QR) using @zxing/browser.
 * Decodes on-device and emits each code via `onCode`. Includes a manual
 * "type the code" fallback for damaged labels / no camera. Client-only —
 * import via `dynamic(..., { ssr: false })`.
 */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastCode = useRef<string>("");
  const lastTime = useRef<number>(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    return () => controlsRef.current?.stop();
  }, []);

  async function start() {
    setError("");
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (!result) return;
        const text = result.getText().trim();
        const now = Date.now();
        // Ignore the same code re-decoding within 1.5s (continuous video frames).
        if (text === lastCode.current && now - lastTime.current < 1500) return;
        lastCode.current = text;
        lastTime.current = now;
        onCode(text);
      });
      controlsRef.current = controls;
      setScanning(true);
    } catch {
      setError("Couldn't start the camera. Allow camera access, or type the code below.");
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  function submitManual() {
    const code = manual.trim();
    if (!code) return;
    onCode(code);
    setManual("");
  }

  return (
    <div>
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-md">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button type="button" onClick={start} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium">
              Start camera
            </button>
          </div>
        )}
        {scanning && (
          <button type="button" onClick={stop} className="absolute top-2 right-2 px-2.5 py-1 bg-black/60 text-white rounded text-xs">
            Stop
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2 max-w-md">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitManual(); } }}
          placeholder="…or type a barcode / SKU"
          className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm"
        />
        <button type="button" onClick={submitManual} className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Add</button>
      </div>
    </div>
  );
}
