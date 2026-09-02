import { AnalyticsIcon, StoreIcon, VerifiedBadgeIcon } from "@/components/icons";
import {
  EditorialCallout,
  EditorialCta,
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
  EditorialSection,
} from "@/components/editorial/Editorial";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Primitives";
import type { ShopPlan } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Za prodavnice | Sve Za Pecanje" };

export default async function ForShopsPage() {
  const plans = await apiFetch<ShopPlan[]>("/shops/plans", { next: { revalidate: 3600 } }).catch(
    () => ({ data: [] as ShopPlan[] })
  );

  return (
    <EditorialPage>
      <EditorialIntro
        eyebrow="Za profesionalne prodavce"
        title="Prodavnica na Sve Za Pecanje"
        summary="Za pecaroške radnje, servise i male uvoznike koji žele svoju stranicu i više prostora za aktivne oglase."
        Icon={StoreIcon}
        actions={
          <>
            <Button href="/nalog/prodavnica">Zatraži predračun</Button>
            <Button href="/prodavnice" variant="secondary">Pogledaj prodavnice</Button>
          </>
        }
      />

      <EditorialFacts
        facts={[
          { label: "Stranica", value: "Logo, opis i aktivni oglasi na jednoj adresi." },
          { label: "Oznaka", value: "Jasna oznaka aktivne prodavnice na njenim oglasima." },
          { label: "Statistika", value: "Pregledi, omiljeni i poruke dostupni po oglasu." },
        ]}
      />

      <EditorialSection
        id="paketi"
        title="Paketi za prodavnice"
        intro="Dostupne opcije i cene učitavaju se iz aktuelne ponude platforme."
        Icon={StoreIcon}
      >
        {plans.data.length ? (
          <div className="space-y-3">
            {plans.data.map((plan) => (
              <Panel key={plan.plan} className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-extrabold text-ink">{plan.label}</h3>
                  <p className="text-xl font-extrabold text-river-800">
                    {formatPrice(plan.price_amount, plan.currency)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-600">{plan.description}</p>
              </Panel>
            ))}
          </div>
        ) : (
          <Panel className="p-5">
            <p className="font-bold text-ink">Paketi trenutno nisu prikazani.</p>
            <p className="mt-1 text-sm text-ink-600">
              Kontaktiraj nas za aktuelne opcije, bez obaveze i bez automatske naplate.
            </p>
          </Panel>
        )}
      </EditorialSection>

      <EditorialSection
        id="sta-dobijate"
        title="Šta prodavnica dobija"
        intro="Alati su usmereni na predstavljanje inventara i upravljanje oglasima."
        Icon={AnalyticsIcon}
      >
        <ul className="list-disc space-y-2 pl-5 marker:text-reed-600">
          <li>Brendiranu stranicu sa opisom i svim aktivnim oglasima.</li>
          <li>Jasnu oznaku da oglas pripada aktivnoj prodavnici.</li>
          <li>Statistiku pregleda, omiljenih i poruka za svaki oglas u nalogu.</li>
        </ul>
      </EditorialSection>

      <EditorialCallout title="Oznaka prodavnice nije garancija transakcije" Icon={VerifiedBadgeIcon}>
        Ona potvrđuje status naloga na platformi. Kupac i dalje treba da proveri opremu, uslove
        kupovine i podatke prodavca.
      </EditorialCallout>

      <EditorialCta
        title="Predstavi inventar ribolovcima"
        copy="Pošalji zahtev za predračun ili prvo pogledaj kako izgledaju postojeće stranice prodavnica."
        actions={
          <>
            <Button href="/nalog/prodavnica" variant="secondary">Zatraži predračun</Button>
            <Button href="/prodavnice" variant="ghost" className="!text-white hover:!bg-white/10">Pogledaj prodavnice</Button>
          </>
        }
      />
    </EditorialPage>
  );
}
