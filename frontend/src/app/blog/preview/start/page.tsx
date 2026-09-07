"use client";
import { useEffect, useRef, useState } from "react";
import { PageTitle } from "@/components/ui/Primitives";

export default function StartPreview() {
  const started = useRef(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    // Fragment never reaches HTTP/access logs; erase it before making any request.
    window.history.replaceState(null, "", "/blog/preview/start");
    if (!token) {
      setFailed(true);
      return;
    }
    void fetch("/blog/preview/session", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (
          typeof data.path !== "string" ||
          !/^\/blog\/preview\/[1-9]\d{0,15}$/.test(data.path)
        )
          throw new Error();
        window.location.replace(data.path);
      })
      .catch(() => setFailed(true));
  }, []);
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <PageTitle>
        {failed ? "Pregled nije dostupan" : "Otvaramo pregled nacrta"}
      </PageTitle>
      <p className="mt-4 text-ink-600" role="status">
        {failed
          ? "Otvorite novi pregled iz CMS-a. Veza je možda istekla ili više nemate pristup."
          : "Sačekajte trenutak."}
      </p>
    </section>
  );
}
