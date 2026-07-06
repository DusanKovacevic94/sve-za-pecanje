"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/Button";
import "@/styles/globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    } else {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="sr-Latn-RS">
      <body>
        <main className="mx-auto grid min-h-screen max-w-lg place-items-center px-4 text-center">
          <div>
            <h1 className="text-3xl font-black">Došlo je do greške</h1>
            <p className="mt-3 text-slate-600">
              Nešto nije u redu na našoj strani. Pokušajte ponovo za nekoliko trenutaka.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={reset}>Pokušaj ponovo</Button>
              <Button href="/" variant="secondary">
                Početna
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
