import { Fish, Heart, PlusCircle, UserCircle } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { HeaderNavLink } from "@/components/layout/HeaderNavLink";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { UnreadMessagesLink } from "@/components/layout/UnreadMessagesLink";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-river-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-lg text-lg font-black text-river-800">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-river-700 text-white shadow-soft">
            <Fish size={22} aria-hidden />
          </span>
          <span className="leading-tight">
            Sve Za Pecanje
            <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">svezapecanje.rs</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <HeaderNavLink href="/oglasi">Oglasi</HeaderNavLink>
          <HeaderNavLink href="/kategorije">Kategorije</HeaderNavLink>
          <HeaderNavLink href="/saveti-za-bezbednost">Bezbednost</HeaderNavLink>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <UnreadMessagesLink />
              <Button href="/nalog" variant="secondary" className="px-3">
                <UserCircle size={18} /> Moj nalog
              </Button>
              <LogoutButton />
            </>
          ) : (
            <Button href="/prijava" variant="secondary" className="px-3">
              Prijava
            </Button>
          )}
          <Button href="/postavi-oglas" className="px-3">
            <PlusCircle size={18} /> <span className="hidden sm:inline">Postavi oglas</span>
          </Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        <HeaderNavLink href="/oglasi" mobile>Oglasi</HeaderNavLink>
        <HeaderNavLink href="/kategorije" mobile>Kategorije</HeaderNavLink>
        <HeaderNavLink href="/saveti-za-bezbednost" mobile>Bezbednost</HeaderNavLink>
        <Link className="focus-ring rounded-md bg-river-50 px-3 py-2 text-sm font-semibold text-ink hover:bg-river-100" href="/nalog/omiljeni">
          <Heart size={15} className="inline" /> Omiljeni
        </Link>
        {user ? <UnreadMessagesLink compact /> : null}
      </div>
    </header>
  );
}
