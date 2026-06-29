import { Heart, MessageSquare, Search, Settings, SquarePlus, type LucideIcon } from "lucide-react";

export const metadata = { title: "Moj nalog | Sve Za Pecanje" };

export default function AccountPage() {
  const items: { Icon: LucideIcon; title: string; href: string; copy: string }[] = [
    { Icon: SquarePlus, title: "Moji oglasi", href: "/nalog/oglasi", copy: "Aktivni, na čekanju i prodati oglasi." },
    { Icon: MessageSquare, title: "Poruke", href: "/nalog/poruke", copy: "Razgovori sa kupcima i prodavcima." },
    { Icon: Heart, title: "Omiljeni", href: "/nalog/omiljeni", copy: "Oglasi koje pratite." },
    { Icon: Search, title: "Sačuvane pretrage", href: "/nalog/sacuvane-pretrage", copy: "Filteri koje želite da pratite." },
    { Icon: Settings, title: "Profil", href: "/nalog/profil", copy: "Lokacija, telefon i stilovi ribolova." }
  ];
  return (
    <div>
      <h1 className="text-3xl font-black">Moj nalog</h1>
      <p className="mt-2 text-slate-600">Pregled najvažnijih delova naloga.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ Icon, title, href, copy }) => (
          <a key={title} href={href} className="focus-ring rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-river-500">
            <Icon size={24} className="text-river-600" />
            <h2 className="mt-4 text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{copy}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
