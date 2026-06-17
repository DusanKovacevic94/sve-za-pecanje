import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-river-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <p className="font-black text-river-700">Sve Za Pecanje</p>
          <p className="mt-2 text-sm text-slate-600">Specijalizovani oglasi za ribolovce u Srbiji.</p>
        </div>
        <Link href="/o-nama" className="text-sm font-semibold hover:text-river-700">
          O nama
        </Link>
        <Link href="/uslovi-koriscenja" className="text-sm font-semibold hover:text-river-700">
          Uslovi korišćenja
        </Link>
        <Link href="/privatnost" className="text-sm font-semibold hover:text-river-700">
          Privatnost
        </Link>
      </div>
    </footer>
  );
}

