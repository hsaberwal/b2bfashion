"use client";

import { useState } from "react";
import Link from "next/link";

type RowResult = {
  row: number;
  sku: string;
  status: "created" | "updated" | "skipped" | "error";
  message?: string;
};

type ImportResponse = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: RowResult[];
  error?: string;
};

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [phase, setPhase] = useState<"select" | "preview" | "done">("select");
  const [error, setError] = useState("");

  async function handleUpload(dryRun: boolean) {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/admin/products/bulk-import?dryRun=${dryRun}`, {
        method: "POST",
        body: fd,
      });
      const data: ImportResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult(data);
      setPhase(dryRun ? "preview" : "done");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setPhase("select");
    setError("");
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/products"
            className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
          >
            &larr; Back to Garments
          </Link>
        </div>
        <h1 className="font-serif text-3xl text-je-black mb-2">Bulk Import Garments</h1>
        <p className="text-je-muted text-sm mb-8">
          Upload a stock sheet (.xlsx) from your existing system. Products are created or updated by SKU.
        </p>

        {/* Step 1: Select file */}
        {phase === "select" && (
          <div className="border border-je-border rounded-lg p-6 bg-je-offwhite">
            <h2 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-4">
              1. Select File
            </h2>
            <p className="text-xs text-je-muted mb-4">
              Expected columns: Brand Code, Brand, Category, SPC, Description, Colour,
              Size Scale, Pieces Per Pack, Season, FabComp, Wholesale price, Packs In Stock.
            </p>

            <label className="flex items-center gap-4 p-5 border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-pointer hover:border-je-black transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-je-black">
                  {file ? file.name : "Choose Excel file (.xlsx)"}
                </p>
                <p className="text-xs text-je-muted">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click to browse"}
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError("");
                }}
                className="hidden"
              />
            </label>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleUpload(true)}
                disabled={!file || loading}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Validating..." : "Preview (Dry Run)"}
              </button>
              {file && (
                <button
                  type="button"
                  onClick={reset}
                  className="btn-outline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {phase === "preview" && result && (
          <div className="space-y-4">
            <div className="border border-je-border rounded-lg p-6 bg-je-offwhite">
              <h2 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-4">
                2. Preview — {result.totalRows} rows processed
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Will create" value={result.created} color="text-green-700" />
                <Stat label="Will update" value={result.updated} color="text-blue-700" />
                <Stat label="Skipped" value={result.skipped} color="text-je-muted" />
                <Stat label="Errors" value={result.errors} color="text-red-700" />
              </div>

              <ResultsTable results={result.results} />

              <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-je-border">
                <button
                  type="button"
                  onClick={() => handleUpload(false)}
                  disabled={loading || result.errors === result.totalRows}
                  className="btn-primary disabled:opacity-40"
                >
                  {loading ? "Importing..." : "Confirm Import"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
              {result.errors > 0 && result.created + result.updated > 0 && (
                <p className="mt-3 text-xs text-amber-700">
                  Note: Rows with errors will be skipped during import. Only valid rows will be imported.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {phase === "done" && result && (
          <div className="space-y-4">
            <div className="border border-green-200 rounded-lg p-6 bg-green-50">
              <h2 className="text-sm font-semibold text-green-900 uppercase tracking-wider mb-4">
                Import Complete
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Created" value={result.created} color="text-green-700" />
                <Stat label="Updated" value={result.updated} color="text-blue-700" />
                <Stat label="Skipped" value={result.skipped} color="text-je-muted" />
                <Stat label="Errors" value={result.errors} color="text-red-700" />
              </div>

              <ResultsTable results={result.results} />

              <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-green-200">
                <Link href="/admin/products" className="btn-primary">
                  View Garments
                </Link>
                <button type="button" onClick={reset} className="btn-outline">
                  Import Another File
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-je-muted">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function ResultsTable({ results }: { results: RowResult[] }) {
  const [showAll, setShowAll] = useState(false);
  const errors = results.filter((r) => r.status === "error");
  const shown = showAll ? results : errors.length > 0 ? errors : results.slice(0, 20);

  if (results.length === 0) {
    return <p className="text-sm text-je-muted">No rows to show.</p>;
  }

  return (
    <div className="mt-4">
      {!showAll && errors.length > 0 && (
        <p className="text-xs text-amber-700 mb-2">Showing {errors.length} error row(s). Click below to see all.</p>
      )}
      <div className="max-h-96 overflow-auto border border-je-border rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-je-offwhite sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-je-muted">Row</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-je-muted">SKU</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-je-muted">Status</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-je-muted">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-je-border">
            {shown.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2 text-xs text-je-muted">{r.row}</td>
                <td className="px-3 py-2 text-xs font-mono text-je-black">{r.sku}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      r.status === "created" ? "bg-green-100 text-green-800" :
                      r.status === "updated" ? "bg-blue-100 text-blue-800" :
                      r.status === "skipped" ? "bg-gray-100 text-gray-600" :
                      "bg-red-100 text-red-800"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-je-muted">{r.message ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && results.length > shown.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-je-muted hover:text-je-black underline"
        >
          Show all {results.length} rows
        </button>
      )}
    </div>
  );
}
