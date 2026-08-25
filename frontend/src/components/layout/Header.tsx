import Link from "next/link";

import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  AccountIcon,
  AddCircleIcon,
  FavoriteIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { HeaderNavLink } from "@/components/layout/HeaderNavLink";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UnreadMessagesLink } from "@/components/layout/UnreadMessagesLink";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/95 shadow-[0_4px_18px_rgba(23,63,55,0.05)] backdrop-blur">
      <div className="h-0.5 bg-reed-500" aria-hidden="true" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          aria-label="Sve Za Pecanje — početna"
          className="focus-ring shrink-0 rounded-lg"
        >
          <BrandLogo alt="" className="h-9 w-auto sm:h-10 md:h-9 xl:h-10" priority />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <HeaderNavLink href="/oglasi">Oglasi</HeaderNavLink>
          <HeaderNavLink href="/prodavnice">Prodavnice</HeaderNavLink>
          <HeaderNavLink href="/kategorije">Kategorije</HeaderNavLink>
          <HeaderNavLink href="/saveti-za-bezbednost">Bezbednost</HeaderNavLink>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <UnreadMessagesLink />
              <Button href="/nalog" variant="secondary" className="px-3">
                <AccountIcon size={18} /> Moj nalog
              </Button>
              <LogoutButton />
            </>
          ) : (
            <Button href="/prijava" variant="secondary" className="px-3">
              Prijava
            </Button>
          )}
          <Button href="/postavi-oglas" className="px-3">
            <AddCircleIcon size={18} /> <span className="hidden sm:inline">Postavi oglas</span>
          </Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        <HeaderNavLink href="/oglasi" mobile>Oglasi</HeaderNavLink>
        <HeaderNavLink href="/prodavnice" mobile>Prodavnice</HeaderNavLink>
        <HeaderNavLink href="/kategorije" mobile>Kategorije</HeaderNavLink>
        <HeaderNavLink href="/saveti-za-bezbednost" mobile>Bezbednost</HeaderNavLink>
        <Link className="focus-ring rounded-xl bg-river-50 px-3 py-2 text-sm font-semibold text-ink hover:bg-river-100" href="/nalog/omiljeni">
          <FavoriteIcon size={14} className="inline" /> Omiljeni
        </Link>
        {user ? (
          <>
            <NotificationBell compact />
            <UnreadMessagesLink compact />
          </>
        ) : null}
      </div>
    </header>
  );
}
