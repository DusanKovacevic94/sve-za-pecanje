import { Fish, Heart, PlusCircle, UserCircle } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { UnreadMessagesLink } from "@/components/layout/UnreadMessagesLink";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-river-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-md text-lg font-black text-river-700">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-river-600 text-white">
            <Fish size={22} aria-hidden />
          </span>
          <span>Sve Za Pecanje</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link className="focus-ring rounded-md px-3 py-2 text-sm font-semibold hover:bg-river-50" href="/oglasi">
            Oglasi
          </Link>
          <Link className="focus-ring rounded-md px-3 py-2 text-sm font-semibold hover:bg-river-50" href="/kategorije">
            Kategorije
          </Link>
          <Link className="focus-ring rounded-md px-3 py-2 text-sm font-semibold hover:bg-river-50" href="/saveti-za-bezbednost">
            Bezbednost
          </Link>
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
        <Link className="rounded-md bg-river-50 px-3 py-2 text-sm font-semibold" href="/oglasi">
          Oglasi
        </Link>
        <Link className="rounded-md bg-river-50 px-3 py-2 text-sm font-semibold" href="/kategorije">
          Kategorije
        </Link>
        <Link className="rounded-md bg-river-50 px-3 py-2 text-sm font-semibold" href="/saveti-za-bezbednost">
          Bezbednost
        </Link>
        <Link className="rounded-md bg-river-50 px-3 py-2 text-sm font-semibold" href="/nalog/omiljeni">
          <Heart size={15} className="inline" /> Omiljeni
        </Link>
        {user ? <UnreadMessagesLink compact /> : null}
      </div>
    </header>
  );
}
