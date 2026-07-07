import {
  Anchor,
  Backpack,
  Boxes,
  Fish,
  FishSymbol,
  Gauge,
  Layers3,
  Shirt,
  type LucideIcon
} from "lucide-react";

const iconMap: { match: string[]; Icon: LucideIcon }[] = [
  { match: ["stap", "štap"], Icon: Gauge },
  { match: ["masin", "mašin", "reel"], Icon: Anchor },
  { match: ["varalic", "mamc"], Icon: FishSymbol },
  { match: ["najlon", "strun", "silk"], Icon: Layers3 },
  { match: ["odec", "obu", "wear"], Icon: Shirt },
  { match: ["torb", "kutij", "pribor"], Icon: Backpack },
  { match: ["oprem", "ostalo"], Icon: Boxes }
];

export function CategoryIcon({ slug, name, size = 22 }: { slug: string; name: string; size?: number }) {
  const haystack = `${slug} ${name}`.toLowerCase();
  const match = iconMap.find((item) => item.match.some((term) => haystack.includes(term)));
  const Icon = match?.Icon ?? Fish;
  return <Icon size={size} aria-hidden />;
}
