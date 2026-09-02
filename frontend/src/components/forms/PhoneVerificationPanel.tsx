"use client";

import { useState } from "react";

import { PhoneIcon, SuccessIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Alert, type AlertMessage } from "@/components/ui/Alert";
import { FieldLabel, Input } from "@/components/ui/Field";
import { apiFetch, type UserProfile } from "@/lib/api";

type ChallengeResponse = {
  challenge_id: string;
  expires_at: string;
  resend_available_at: string;
  phone_masked: string;
};

export function PhoneVerificationPanel({
  profile,
  phoneDirty,
  onVerified,
}: {
  profile: UserProfile;
  phoneDirty: boolean;
  onVerified: (profile: UserProfile) => void;
}) {
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<AlertMessage | null>(null);
  const [loading, setLoading] = useState(false);

  if (!profile.phone_verification_enabled) return null;

  async function requestCode() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiFetch<ChallengeResponse>(
        "/users/me/phone-verification/request",
        { method: "POST" }
      );
      setChallenge(response.data);
      setMessage({ tone: "success", text: `Kod je poslat na ${response.data.phone_masked}.` });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Kod nije moguće poslati."
      });
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    if (!challenge) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiFetch<UserProfile>(
        "/users/me/phone-verification/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            challenge_id: challenge.challenge_id,
            code,
          }),
        }
      );
      onVerified(response.data);
      setChallenge(null);
      setCode("");
      setMessage({ tone: "success", text: "Broj telefona je potvrđen." });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Kod nije moguće potvrditi."
      });
    } finally {
      setLoading(false);
    }
  }

  const canRequest = Boolean(profile.phone_number_e164) && !phoneDirty;

  return (
    <section
      className="rounded-xl border border-river-100 bg-river-50 p-4 md:col-span-2"
      aria-labelledby="phone-verification-title"
    >
      <div className="flex items-start gap-3">
        <PhoneIcon className="mt-0.5 text-river-700" size={20} />
        <div className="min-w-0 flex-1">
          <h2 id="phone-verification-title" className="font-extrabold text-ink">
            Potvrda broja telefona
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Potvrda vlasništva ne menja podešavanje vidljivosti broja.
          </p>
          {profile.phone_verified_at && !phoneDirty ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-river-800">
              <SuccessIcon size={18} />
              Telefon je potvrđen
            </p>
          ) : (
            <div className="mt-3">
              {!profile.phone_number_e164 ? (
                <p className="text-sm font-semibold text-ink-700">
                  Unesite i sačuvajte broj telefona pre potvrde.
                </p>
              ) : null}
              {phoneDirty ? (
                <p className="text-sm font-semibold text-amber-800">
                  Sačuvajte izmenjeni broj pre slanja koda.
                </p>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={requestCode}
                disabled={!canRequest || loading}
                className="mt-2"
              >
                {challenge ? "Pošalji novi kod" : "Pošalji verifikacioni kod"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {challenge && !profile.phone_verified_at && !phoneDirty ? (
        <div className="mt-4 max-w-sm">
          <FieldLabel htmlFor="phone_verification_code">
            Šestocifreni kod
          </FieldLabel>
          <Input
            id="phone_verification_code"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
          />
          <Button
            type="button"
            onClick={confirmCode}
            disabled={code.length !== 6 || loading}
            className="mt-3"
          >
            Potvrdi kod
          </Button>
        </div>
      ) : null}

      {message ? <Alert tone={message.tone} className="mt-3">{message.text}</Alert> : null}
    </section>
  );
}
