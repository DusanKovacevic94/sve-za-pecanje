"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNavLink({ href, children, mobile = false }: { href: string; children: React.ReactNode; mobile?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  const classes = mobile
    ? `focus-ring rounded-md px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-river-700 text-white" : "bg-river-50 text-ink hover:bg-river-100"
      }`
    : `focus-ring rounded-md px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-river-50 text-river-800" : "hover:bg-river-50"
      }`;
  return (
    <Link href={href} className={classes} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
