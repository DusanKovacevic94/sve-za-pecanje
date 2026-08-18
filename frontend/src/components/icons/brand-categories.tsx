import { IconBase, type IconProps } from "./IconBase";

export function BrandMarkIcon(props: IconProps) {
  return (
    <IconBase name="brand-mark" {...props}>
      <path d="M3 12c2.5-3.4 5.4-5.1 8.8-5.1 3.1 0 5.7 1.2 7.7 3.5" />
      <path d="M3 12c2.5 3.4 5.4 5.1 8.8 5.1 3.1 0 5.7-1.2 7.7-3.5" />
      <path d="m19.5 10.4 2.5-2.2v7.6l-2.5-2.2" />
      <circle cx="7.2" cy="10.9" r=".65" fill="currentColor" stroke="none" />
      <path d="M12.2 8.1c-1.2 1.2-1.8 2.5-1.8 3.9s.6 2.7 1.8 3.9" />
      <path d="M5.1 14.2c-.5 2.6.5 4.5 2.8 5.6 1.4.7 2.7.1 2.7-1.1 0-.8-.6-1.3-1.4-1.1" />
    </IconBase>
  );
}

export function RodCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-rod" {...props}>
      <path d="m2.8 20.8 5.5-5.5" />
      <path d="m4 18 2.4 2.4" />
      <path d="M8.3 15.3C12 10.6 15.8 6.8 20.8 3.5" />
      <path d="m8.8 14.7 1.5 1.7" />
      <circle cx="11.2" cy="17.8" r="1.9" />
      <path d="m12.6 16.6 1.2 1.1" />
      <path d="m14.8 8.2.9.8M18 5.3l.7.9" />
    </IconBase>
  );
}

export function ReelCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-reel" {...props}>
      <g transform="rotate(-15 12 12)">
        <path d="M11.8 8 9.7 4.4h6" />
        <path d="M3.2 9h4.4l1.5 1.5v4L7.6 16H3.2" />
        <path d="M3.2 8v9M6.1 9v7" />
        <circle cx="12.8" cy="12.5" r="4.5" />
        <circle cx="12.8" cy="12.5" r="1.2" />
        <path d="M8.8 10.3C10 8.2 12.1 7 14.4 7c3.3 0 6 2.6 6 5.9 0 1.3-.4 2.5-1.1 3.5" />
        <path d="m16 9.3 2.5-2.5" />
        <circle cx="20" cy="5.4" r="1.2" />
      </g>
    </IconBase>
  );
}

export function LureCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-lure" {...props}>
      <path d="M3.2 10.8c2.3-2.4 5.1-3.6 8.2-3.6 3.2 0 5.7 1.2 7.6 3.6-1.9 2.4-4.4 3.6-7.6 3.6-3.1 0-5.9-1.2-8.2-3.6Z" />
      <path d="m19 10.8 2.5-2v4z" />
      <circle cx="7.1" cy="9.8" r=".55" fill="currentColor" stroke="none" />
      <path d="M10.5 14.4v2.2c0 1.4 1 2.2 2.1 1.8.8-.3 1.1-1.2.7-1.9" />
    </IconBase>
  );
}

export function LineTackleCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-line-tackle" {...props}>
      <path d="M5 6.3h10.2v9.4H5z" />
      <path d="M3.4 8.2H5v5.6H3.4M15.2 8.2h1.6v5.6h-1.6" />
      <path d="M7.2 9h5.9M7.2 12h5.9M7.2 15h5.9" />
      <path d="M16.8 11c3.1.4 4.2 2.1 3.4 5-.4 1.4-1.5 2.5-2.7 2.2-.9-.2-1.3-1-.9-1.8" />
    </IconBase>
  );
}

export function ElectronicsCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-electronics" {...props}>
      <rect x="3.5" y="4.5" width="17" height="13" rx="2" />
      <path d="M7 20h10M12 17.5V20M7 13.4c1.3-2.2 3-3.3 5-3.3s3.7 1.1 5 3.3" />
      <path d="M9 13.4c.8-1.1 1.8-1.7 3-1.7s2.2.6 3 1.7" />
      <path d="m15.1 7.4 1.2-.7v1.4z" />
    </IconBase>
  );
}

export function BoatCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-boat" {...props}>
      <path d="M3 12.5h18l-2.6 4.1H6.1z" />
      <path d="M8 12.5V8.2h5.2l2.4 4.3" />
      <path d="M3.5 19c1.3-.8 2.6-.8 3.9 0s2.6.8 3.9 0 2.6-.8 3.9 0 2.6.8 3.9 0" />
    </IconBase>
  );
}

export function TackleStorageCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-tackle-storage" {...props}>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M8 8V6.5C8 5.7 8.7 5 9.5 5h5c.8 0 1.5.7 1.5 1.5V8M3 12h18M12 12v7" />
      <path d="M10.5 11.2h3v2h-3z" />
    </IconBase>
  );
}

export function ClothingCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-clothing" {...props}>
      <path d="M7 3.5v4l1.5 3v9.7h3.4V15h.2v5.2h3.4v-9.7l1.5-3v-4" />
      <path d="M7 6h3l2 2 2-2h3M8.5 10.5h7M10 3.5v3M14 3.5v3" />
    </IconBase>
  );
}

export function KitCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-kit" {...props}>
      <path d="m5 20 3-16M10 20l3-16" />
      <circle cx="15.7" cy="13.1" r="3.1" />
      <path d="M15.7 10V7.2M18.8 13.1h2M3.5 15.5l13 2.5" />
      <path d="M8.5 12.4 12 13" />
    </IconBase>
  );
}

export function OtherCategoryIcon(props: IconProps) {
  return (
    <IconBase name="category-other" {...props}>
      <path d="M4 6.5c5.8 0 9.4 2.4 10.8 7.1.7 2.4-.2 4.4-1.8 4.7-1.2.2-2.1-.7-1.8-1.8" />
      <circle cx="17" cy="7" r=".75" fill="currentColor" stroke="none" />
      <circle cx="20" cy="7" r=".75" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r=".75" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
