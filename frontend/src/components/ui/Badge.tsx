export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "sold" | "warn" }) {
  const tones = {
    neutral: "border-sand-200 bg-sand-50 text-ink-700",
    accent: "border-reed-200 bg-reed-50 text-reed-900",
    sold: "border-ink bg-ink text-white",
    warn: "border-amber-200 bg-amber-50 text-amber-900"
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
