import Image from "next/image";

const assets = {
  default: { src: "/brand/logo.svg", width: 490, height: 96 },
  inverse: { src: "/brand/logo-inverse.svg", width: 490, height: 96 },
  monochrome: { src: "/brand/logo-monochrome.svg", width: 490, height: 96 },
  mark: { src: "/brand/mark.svg", width: 80, height: 88 },
} as const;

export type BrandLogoVariant = keyof typeof assets;

export function BrandLogo({
  variant = "default",
  alt = "Sve Za Pecanje",
  className,
  priority = false,
}: {
  variant?: BrandLogoVariant;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const asset = assets[variant];

  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={alt}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
