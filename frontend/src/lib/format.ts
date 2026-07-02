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

