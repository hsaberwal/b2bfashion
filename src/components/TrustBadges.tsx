type Variant = "footer" | "checkout";

const ITEMS = [
  {
    label: "Secure checkout via Stripe",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    label: "256-bit SSL encryption",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    label: "UK wholesale supplier",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
      </svg>
    ),
  },
  {
    label: "GDPR compliant",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

export function TrustBadges({ variant = "footer" }: { variant?: Variant }) {
  const wrapperClass =
    variant === "footer"
      ? "flex flex-wrap items-center gap-x-6 gap-y-3 text-white/60 text-xs"
      : "flex flex-wrap items-center gap-x-5 gap-y-3 text-je-muted text-xs";

  return (
    <div className={wrapperClass} aria-label="Trust and security">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
