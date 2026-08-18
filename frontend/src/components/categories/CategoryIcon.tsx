import {
  BoatCategoryIcon,
  ClothingCategoryIcon,
  ElectronicsCategoryIcon,
  KitCategoryIcon,
  LineTackleCategoryIcon,
  LureCategoryIcon,
  OtherCategoryIcon,
  ReelCategoryIcon,
  RodCategoryIcon,
  TackleStorageCategoryIcon,
  type IconComponent,
} from "@/components/icons";

const categoryIcons: Record<string, IconComponent> = {
  stapovi: RodCategoryIcon,
  masinice: ReelCategoryIcon,
  varalice: LureCategoryIcon,
  "najlon-struna-zavrsni-pribor": LineTackleCategoryIcon,
  elektronika: ElectronicsCategoryIcon,
  "camci-i-oprema": BoatCategoryIcon,
  "torbe-kutije-pribor": TackleStorageCategoryIcon,
  "odeca-i-obuca": ClothingCategoryIcon,
  kompleti: KitCategoryIcon,
  ostalo: OtherCategoryIcon,
};

export function CategoryIcon({
  slug,
  size = 24,
}: {
  slug: string;
  name: string;
  size?: number;
}) {
  const Icon = categoryIcons[slug] ?? OtherCategoryIcon;
  return <Icon size={size} />;
}
