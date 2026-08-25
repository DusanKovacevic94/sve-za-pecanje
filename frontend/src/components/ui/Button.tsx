import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { SpinnerIcon } from "@/components/icons";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  rel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
  children: ReactNode;
};

const variants = {
  primary: "bg-river-700 text-white shadow-button hover:-translate-y-px hover:bg-river-800",
  secondary: "border border-sand-300 bg-white text-ink hover:-translate-y-px hover:border-river-300 hover:bg-sand-50",
  ghost: "text-ink hover:bg-river-50 hover:text-river-800",
  danger: "bg-red-700 text-white hover:-translate-y-px hover:bg-red-800"
};

export function Button({ href, rel, variant = "primary", className = "", isLoading = false, children, disabled, ...props }: ButtonProps) {
  const classes = `focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition duration-150 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={props["aria-label"]}
        title={props.title}
        rel={rel}
      >
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? <SpinnerIcon className="motion-safe:animate-spin" size={16} /> : null}
      {children}
    </button>
  );
}
