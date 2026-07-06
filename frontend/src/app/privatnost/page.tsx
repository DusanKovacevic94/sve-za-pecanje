export const metadata = { title: "Privatnost | Sve Za Pecanje" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">Privatnost</h1>
      <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-soft">
        <p>Prikupljamo podatke potrebne za nalog, oglase, poruke, bezbednost i rad marketplace-a.</p>
        <p>Email adrese se ne prikazuju javno. Broj telefona se prikazuje samo ako korisnik uključi tu opciju.</p>
        <p>Poruke se čuvaju radi komunikacije između kupca i prodavca i osnovne moderacije u slučaju prijave.</p>
        <p>
          U produkciji koristimo Umami analitiku bez kolačića za osnovne statistike posećenosti i anonimne događaje
          kao što su registracija, postavljanje oglasa, slanje poruke i čuvanje pretrage. Ne koristimo ove podatke za
          profilisanje pojedinačnih korisnika.
        </p>
        <p>Koristimo kolačiće za prijavu i sesiju. Zahtev za brisanje naloga možete poslati preko kontakt stranice.</p>
      </div>
    </article>
  );
}
