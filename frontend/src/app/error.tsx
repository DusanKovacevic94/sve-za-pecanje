"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold">Došlo je do greške</h1>
      <p className="mt-3 text-ink-600">
        Nešto nije u redu na našoj strani. Pokušajte ponovo za nekoliko trenutaka.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Pokušaj ponovo</Button>
        <Button href="/" variant="secondary">
          Početna
        </Button>
      </div>
    </div>
  );
}
