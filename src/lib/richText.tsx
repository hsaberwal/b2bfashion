import React from "react";

/**
 * Tiny markdown subset for editable site content.
 * Supported per block (blocks separated by blank lines):
 *   - `## Heading`               → <h2>
 *   - lines starting with `* `/`- ` → <ul>
 *   - lines matching `\d+. `     → <ol>
 *   - anything else              → <p> with newlines preserved
 */
export function renderRichText(body: string): React.ReactNode {
  if (!body) return null;
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="font-serif text-2xl md:text-3xl text-je-black mt-10 mb-4"
        >
          {trimmed.slice(3).trim()}
        </h2>
      );
    }

    const lines = trimmed.split("\n");

    if (lines.every((l) => /^[*-]\s+/.test(l.trim()))) {
      return (
        <ul
          key={i}
          className="list-disc pl-6 space-y-2 my-4 text-je-charcoal leading-relaxed"
        >
          {lines.map((l, j) => (
            <li key={j}>{l.trim().replace(/^[*-]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    if (lines.length > 1 && lines.every((l) => /^\d+\.\s+/.test(l.trim()))) {
      return (
        <ol
          key={i}
          className="list-decimal pl-6 space-y-2 my-4 text-je-charcoal leading-relaxed"
        >
          {lines.map((l, j) => (
            <li key={j}>{l.trim().replace(/^\d+\.\s+/, "")}</li>
          ))}
        </ol>
      );
    }

    return (
      <p
        key={i}
        className="my-4 text-je-charcoal leading-relaxed whitespace-pre-line"
      >
        {trimmed}
      </p>
    );
  });
}
