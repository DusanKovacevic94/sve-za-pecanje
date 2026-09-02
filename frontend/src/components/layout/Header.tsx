import Link from "next/link";

import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  AccountIcon,
  AddCircleIcon,
  FavoriteIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { loginHref } from "@/lib/navigation";
import { Button } from "@/components/ui/Button";
import { HeaderNavLink } from "@/components/layout/HeaderNavLink";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UnreadMessagesLink } from "@/components/layout/UnreadMessagesLink";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/95 shadow-header backdrop-blur">
      <div className="h-0.5 bg-reed-500" aria-hidden="true" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4">
        <Link
          href="/"
          aria-label="Sve Za Pecanje — početna"
          className="focus-ring shrink-0 rounded-xl"
        >
          <BrandLogo alt="" className="h-9 w-auto max-w-32 sm:h-10 sm:max-w-none md:h-9 xl:h-10" priority />
        </Link>
        <nav aria-label="Glavna navigacija" className="hidden items-center gap-1 lg:flex">
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
              <Button href="/nalog" variant="secondary" className="px-3" aria-label="Moj nalog">
                <AccountIcon size={18} /> <span className="hidden sm:inline">Moj nalog</span>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <Button href="/prijava" variant="secondary" className="px-3">
              Prijava
            </Button>
          )}
          <Button
            href={user ? "/postavi-oglas" : loginHref("/postavi-oglas")}
            className="px-3"
            aria-label="Postavi oglas"
            title="Postavi oglas"
          >
            <AddCircleIcon size={18} /> <span className="hidden sm:inline">Postavi oglas</span>
          </Button>
        </div>
      </div>
      <nav
        aria-label="Mobilna navigacija"
        className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 lg:hidden"
      >
        <HeaderNavLink href="/oglasi" mobile>Oglasi</HeaderNavLink>
        <HeaderNavLink href="/prodavnice" mobile>Prodavnice</HeaderNavLink>
        <HeaderNavLink href="/kategorije" mobile>Kategorije</HeaderNavLink>
        <HeaderNavLink href="/saveti-za-bezbednost" mobile>Bezbednost</HeaderNavLink>
        <Link className="focus-ring shrink-0 rounded-xl bg-river-50 px-3 py-2 text-sm font-semibold text-ink hover:bg-river-100" href="/nalog/omiljeni">
          <FavoriteIcon size={14} className="inline" /> Omiljeni
        </Link>
        {user ? (
          <>
            <NotificationBell compact />
            <UnreadMessagesLink compact />
          </>
        ) : null}
      </nav>
    </header>
  );
}
