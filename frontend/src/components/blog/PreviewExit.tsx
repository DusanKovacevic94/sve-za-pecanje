"use client";
import { useState } from "react";

export function PreviewExit() {
  const [failed, setFailed] = useState(false);
  async function exit() {
    setFailed(false);
    try {
      // A no-referrer HTML form navigation can send Origin: null. Same-origin
      // fetch retains the origin check without relaxing preview privacy headers.
      const response = await fetch("/blog/preview/exit", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      window.location.replace("/blog");
    } catch {
      setFailed(true);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={exit}
        className="focus-ring mt-3 rounded-xl font-semibold text-river-700 underline"
      >
        Završi pregled
      </button>
      {failed ? (
        <p role="alert" className="mt-2 text-sm">
          Pregled nije zatvoren. Pokušajte ponovo.
        </p>
      ) : null}
    </>
  );
}
