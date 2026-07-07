import Link from "next/link";
import { Fish, Mail, MapPin, ShieldCheck } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.9fr_0.9fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-black">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-river-600">
              <Fish size={21} />
            </span>
            <span>Sve Za Pecanje</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">Specijalizovani oglasi za ribolovce u Srbiji.</p>
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-river-100">Platforma</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="/oglasi" className="hover:text-white">Oglasi</Link>
            <Link href="/kategorije" className="hover:text-white">Kategorije</Link>
            <Link href="/postavi-oglas" className="hover:text-white">Postavi oglas</Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-river-100">Podrška</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="/kontakt" className="hover:text-white">Kontakt</Link>
            <Link href="/saveti-za-bezbednost" className="hover:text-white">Bezbedna kupovina</Link>
            <Link href="/o-nama" className="hover:text-white">O nama</Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-river-100">Kontakt</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><Mail size={16} /> kontakt@svezapecanje.rs</span>
            <span className="inline-flex items-center gap-2"><MapPin size={16} /> Srbija</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} /> Moderisani oglasi</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Sve Za Pecanje. Sva prava zadržana.</p>
          <div className="flex gap-4">
            <Link href="/uslovi-koriscenja" className="hover:text-white">Uslovi korišćenja</Link>
            <Link href="/privatnost" className="hover:text-white">Privatnost</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
