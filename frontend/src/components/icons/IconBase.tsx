import type {
  ComponentType,
  ReactNode,
  SVGProps,
} from "react";

export type IconProps = Omit<
  SVGProps<SVGSVGElement>,
  "width" | "height" | "strokeWidth"
> & {
  size?: number;
};

export type IconComponent = ComponentType<IconProps>;

export function IconBase({
  children,
  name,
  size = 24,
  fill = "none",
  role,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: IconProps & { children: ReactNode; name: string }) {
  const labelled = Boolean(ariaLabel || ariaLabelledBy);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      data-icon={name}
      role={role ?? (labelled ? "img" : undefined)}
      aria-hidden={ariaHidden ?? (labelled ? undefined : true)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...props}
    >
      {children}
    </svg>
  );
}

