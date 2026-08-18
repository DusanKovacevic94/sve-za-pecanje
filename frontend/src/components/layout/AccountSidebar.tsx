"use client";

import {
  BellIcon,
  DashboardIcon,
  FavoriteIcon,
  MessageIcon,
  RatingIcon,
  SearchIcon,
  SettingsIcon,
  StoreIcon,
  TrustShieldIcon,
  UsersIcon,
} from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

const accountLinks = [
  { href: "/nalog", label: "Pregled", Icon: DashboardIcon },
  { href: "/nalog/oglasi", label: "Moji oglasi", Icon: StoreIcon },
  { href: "/nalog/prodavnica", label: "Prodavnica", Icon: StoreIcon },
  { href: "/nalog/poruke", label: "Poruke", Icon: MessageIcon },
  { href: "/nalog/obavestenja", label: "Obaveštenja", Icon: BellIcon },
  { href: "/nalog/omiljeni", label: "Omiljeni", Icon: FavoriteIcon },
  { href: "/nalog/pratim", label: "Pratim", Icon: UsersIcon },
  { href: "/nalog/sacuvane-pretrage", label: "Sačuvane pretrage", Icon: SearchIcon },
  { href: "/nalog/ocene", label: "Ocene", Icon: RatingIcon },
  { href: "/nalog/profil", label: "Profil", Icon: SettingsIcon },
  { href: "/nalog/bezbednost", label: "Bezbednost", Icon: TrustShieldIcon },
];

export function AccountSidebar({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Moj nalog</p>
          <p className="mt-1 truncate font-black text-ink">{username}</p>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
          {accountLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "focus-ring inline-flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition lg:flex lg:w-full",
                  active
                    ? "bg-river-600 text-white"
                    : "text-slate-700 hover:bg-river-50 hover:text-river-800",
                ].join(" ")}
              >
                <Icon size={18} aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
