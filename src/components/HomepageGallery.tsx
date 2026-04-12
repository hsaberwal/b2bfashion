"use client";

import Image from "next/image";

export function HomepageGallery({ urls }: { urls: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
      {urls.map((src, i) => (
        <div
          key={i}
          className="relative overflow-hidden group"
          style={{
            aspectRatio: i % 3 === 0 ? "3/4" : "4/5",
            animationDelay: `${i * 100}ms`,
          }}
        >
          <Image
            src={src}
            alt={`Claudia.C wholesale fashion ${i + 1}`}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
            unoptimized={src.startsWith("http")}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const parent = el.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.className =
                  "absolute inset-0 flex items-center justify-center bg-je-cream text-je-muted text-xs";
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
