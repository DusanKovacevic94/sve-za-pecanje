import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
  children: ReactNode;
};

const variants = {
  primary: "bg-river-700 text-white hover:bg-river-800",
  secondary: "bg-white text-ink border border-river-100 hover:border-river-400",
  ghost: "text-ink hover:bg-river-50",
  danger: "bg-red-600 text-white hover:bg-red-700"
};

export function Button({ href, variant = "primary", className = "", isLoading = false, children, disabled, ...props }: ButtonProps) {
  const classes = `focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null}
      {children}
    </button>
  );
}
