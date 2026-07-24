import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

const links = [
  ["/admin", "Pregled"],
  ["/admin/oglasi", "Oglasi"],
  ["/admin/istaknuto", "Istaknuto"],
  ["/admin/prodavnice", "Prodavnice"],
  ["/admin/brendovi", "Brendovi"],
  ["/admin/kategorije", "Kategorije"],
  ["/admin/korisnici", "Korisnici"],
  ["/admin/prijave", "Prijave"],
  ["/admin/rizik", "Red rizika"],
  ["/admin/pretraga", "Pretraga"],
  ["/admin/emailovi", "Emailovi"],
  ["/admin/podesavanja", "Podešavanja"]
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin" && user?.role !== "super_admin") {
    redirect("/");
  }
  return (
    <div className="bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-river-50 hover:text-river-700"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
