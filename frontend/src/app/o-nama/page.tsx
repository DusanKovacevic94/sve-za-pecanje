import { SearchIcon, TrustShieldIcon } from "@/components/icons";
import {
  EditorialCallout,
  EditorialCta,
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
  EditorialSection,
} from "@/components/editorial/Editorial";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "O nama | Sve Za Pecanje" };

export default function AboutPage() {
  return (
    <EditorialPage>
      <EditorialIntro
        eyebrow="O platformi"
        title="Marketplace napravljen za ribolovačku opremu"
        summary="Sve Za Pecanje povezuje ljude koji kupuju i prodaju ribolovačku opremu u Srbiji, uz kategorije i podatke prilagođene stvarnom načinu pretrage."
        Icon={SearchIcon}
        actions={
          <>
            <Button href="/oglasi">Pregledaj oglase</Button>
            <Button href="/postavi-oglas" variant="secondary">Postavi oglas</Button>
          </>
        }
      />

      <EditorialFacts
        facts={[
          { label: "Fokus", value: "Samo ribolovačka oprema i prateće usluge." },
          { label: "Pretraga", value: "Kategorije i filteri koji imaju smisla za ribolov." },
          { label: "Odluka", value: "Strukturirani oglasi i odvojene činjenice o prodavcu." },
        ]}
      />

      <EditorialSection
        id="zasto-postojimo"
        title="Zašto postojimo"
        intro="Generički oglasnici otežavaju poređenje opreme kada su važni model, tehnika, stanje i namena."
      >
        <p>Sve Za Pecanje je mesto za kupovinu i prodaju ribolovačke opreme u Srbiji.</p>
        <p>
          Napravljen je za ribolovce koji žele brže da pronađu štapove, mašinice, varalice,
          elektroniku i drugu opremu, uz filtere koji imaju smisla za ribolov.
        </p>
        <p>
          Naš cilj je da oglasi budu pregledniji, detaljniji i korisniji nego na generičkim
          oglasnicima.
        </p>
      </EditorialSection>

      <EditorialSection
        id="kako-radi"
        title="Kako platforma pomaže"
        intro="Svaki deo interfejsa treba da olakša proveru i poređenje, bez skrivanja važnih podataka."
        Icon={TrustShieldIcon}
      >
        <ul className="list-disc space-y-2 pl-5 marker:text-reed-600">
          <li>Oglasi se razvrstavaju po specijalizovanim kategorijama i svojstvima.</li>
          <li>Kontakt, ocene, završene prodaje i starost naloga prikazuju se kao odvojene činjenice.</li>
          <li>Kupac i prodavac sami dogovaraju cenu, dostavu, pregled i plaćanje.</li>
        </ul>
      </EditorialSection>

      <EditorialCallout title="Pokazatelji pomažu, ali nisu garancija" Icon={TrustShieldIcon}>
        Sve Za Pecanje ne učestvuje u plaćanju ili primopredaji. Pre odluke proveri oglas,
        opremu i uslove dogovora.
      </EditorialCallout>

      <EditorialCta
        title="Pronađi sledeći komad opreme"
        copy="Pretraži aktuelne oglase ili objavi opremu koju više ne koristiš."
        actions={
          <>
            <Button href="/oglasi" variant="secondary">Pregledaj oglase</Button>
            <Button href="/postavi-oglas" variant="ghost" className="!text-white hover:!bg-white/10">Postavi oglas</Button>
          </>
        }
      />
    </EditorialPage>
  );
}
