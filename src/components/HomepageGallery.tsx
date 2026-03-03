"use client";

import Image from "next/image";

export function HomepageGallery({ urls }: { urls: string[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
      {urls.map((src, i) => (
        <div
          key={i}
          className="aspect-square relative rounded overflow-hidden bg-je-cream border border-je-border"
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            unoptimized={src.startsWith("http")}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const parent = el.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.className = "absolute inset-0 flex items-center justify-center text-je-muted text-xs p-2";
                fallback.textContent = `Image ${i + 1}`;
                parent.appendChild(fallback);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}
