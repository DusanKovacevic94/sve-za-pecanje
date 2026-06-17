export const metadata = { title: "Saveti za bezbednu kupovinu | Sve Za Pecanje" };

export default function SafetyPage() {
  const tips = [
    "Proverite opremu uživo kada god je moguće.",
    "Ne šaljite novac unapred nepoznatim prodavcima.",
    "Obratite pažnju na oglase sa nerealno niskim cenama.",
    "Sačuvajte komunikaciju sa prodavcem.",
    "Prijavite sumnjive oglase administratorima.",
    "Kod skuplje opreme proverite serijski broj i stanje."
  ];
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">Saveti za bezbednu kupovinu</h1>
      <ul className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        {tips.map((tip) => <li key={tip} className="text-slate-700">- {tip}</li>)}
      </ul>
    </article>
  );
}

