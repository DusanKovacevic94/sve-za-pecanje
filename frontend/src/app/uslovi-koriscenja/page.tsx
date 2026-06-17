export const metadata = { title: "Uslovi korišćenja | Sve Za Pecanje" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">Uslovi korišćenja</h1>
      <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-soft">
        <p>Korisnici su odgovorni za tačnost svojih oglasa, komunikaciju sa drugim korisnicima i zakonitost opreme koju nude.</p>
        <p>Platforma ne poseduje predmete iz oglasa i nije strana u offline transakcijama između kupca i prodavca.</p>
        <p>Zabranjeni su nelegalna ribolovna oprema, oprema za krivolov, eksplozivi, oružje, municija, električni ribolov, falsifikati, ukradena oprema i uvredljiv ili prevaran sadržaj.</p>
        <p>Administratori mogu ukloniti sadržaj, odbiti oglas ili suspendovati nalog u slučaju zloupotrebe.</p>
      </div>
    </article>
  );
}

