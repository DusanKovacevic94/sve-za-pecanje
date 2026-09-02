import {
  AddListingIcon,
  FavoriteIcon,
  MessageIcon,
  SearchIcon,
  SettingsIcon,
  StoreIcon,
  type IconComponent,
} from "@/components/icons";
import {
  PageTitle,
  SectionHeading,
  SupportingCopy,
  raisedPanelClassName,
} from "@/components/ui/Primitives";

export const metadata = { title: "Moj nalog | Sve Za Pecanje" };

export default function AccountPage() {
  const items: { Icon: IconComponent; title: string; href: string; copy: string }[] = [
    { Icon: AddListingIcon, title: "Moji oglasi", href: "/nalog/oglasi", copy: "Aktivni, na čekanju i prodati oglasi." },
    { Icon: MessageIcon, title: "Poruke", href: "/nalog/poruke", copy: "Razgovori sa kupcima i prodavcima." },
    { Icon: FavoriteIcon, title: "Omiljeni", href: "/nalog/omiljeni", copy: "Oglasi koje pratite." },
    { Icon: StoreIcon, title: "Prodavnica", href: "/nalog/prodavnica", copy: "Podaci, pretplata i javna stranica prodavnice." },
    { Icon: SearchIcon, title: "Sačuvane pretrage", href: "/nalog/sacuvane-pretrage", copy: "Filteri koje želite da pratite." },
    { Icon: SettingsIcon, title: "Profil", href: "/nalog/profil", copy: "Lokacija, telefon i stilovi ribolova." }
  ];
  return (
    <div>
      <PageTitle>Moj nalog</PageTitle>
      <SupportingCopy className="mt-2">Pregled najvažnijih delova naloga.</SupportingCopy>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ Icon, title, href, copy }) => (
          <a key={title} href={href} className={`focus-ring p-5 hover:border-river-500 ${raisedPanelClassName}`}>
            <Icon size={24} className="text-river-600" />
            <SectionHeading level="card" className="mt-4">{title}</SectionHeading>
            <SupportingCopy className="mt-2">{copy}</SupportingCopy>
          </a>
        ))}
      </div>
    </div>
  );
}
