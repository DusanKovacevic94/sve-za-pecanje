export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "sold" | "warn" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    accent: "bg-reed-100 text-ink",
    sold: "bg-slate-800 text-white",
    warn: "bg-amber-100 text-amber-800"
  };
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
