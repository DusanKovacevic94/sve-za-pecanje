import type { SVGProps } from "react";

export function BrandWaterline({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        d="M-12 31c54-30 108-30 162 0s108 30 162 0 108-30 162 0 108 30 178 0"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M-12 67c54-30 108-30 162 0s108 30 162 0 108-30 162 0 108 30 178 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".45"
      />
    </svg>
  );
}
