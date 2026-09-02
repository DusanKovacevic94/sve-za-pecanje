import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm font-semibold text-river-700">Greška 404</p>
      <h1 className="mt-2 text-3xl font-extrabold">Stranica nije pronađena</h1>
      <p className="mt-3 text-ink-600">
        Oglas ili stranica koju tražite ne postoji ili je uklonjena.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button href="/">Početna</Button>
        <Button href="/oglasi" variant="secondary">
          Pregledaj oglase
        </Button>
      </div>
    </div>
  );
}
