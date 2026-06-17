export const metadata = { title: "O nama | Sve Za Pecanje" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">O nama</h1>
      <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-soft">
        <p>Sve Za Pecanje je mesto za kupovinu i prodaju ribolovačke opreme u Srbiji.</p>
        <p>Napravljen je za ribolovce koji žele brže da pronađu štapove, mašinice, varalice, elektroniku i drugu opremu, uz filtere koji imaju smisla za ribolov.</p>
        <p>Naš cilj je da oglasi budu pregledniji, detaljniji i korisniji nego na generičkim oglasnicima.</p>
      </div>
    </article>
  );
}

