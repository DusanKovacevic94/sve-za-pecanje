export const conditionLabels: Record<string, string> = {
  new: "Novo",
  like_new: "Kao novo",
  used_excellent: "Polovno - odlično",
  used_good: "Polovno - dobro",
  used_fair: "Polovno - korektno",
  for_parts_or_repair: "Za delove/popravku"
};

export const conditionOptions = Object.entries(conditionLabels).map(([value, label]) => ({ value, label }));

export function formatPrice(amount: string | number, currency: string) {
  const numeric = Number(amount);
  const value = new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(numeric);
  return currency === "EUR" ? `${value} €` : `${value} RSD`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

export function formatMonthYear(date?: string | null) {
  if (!date) return "Nije navedeno";
  return new Intl.DateTimeFormat("sr-RS", {
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function formatRelativeDate(date: string) {
  const then = new Date(date).getTime();
  const now = Date.now();
  const diffDays = Math.round((then - now) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("sr-RS", { numeric: "auto" });
  if (Math.abs(diffDays) < 1) return "danas";
  if (Math.abs(diffDays) < 31) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(Math.round(diffMonths / 12), "year");
}
