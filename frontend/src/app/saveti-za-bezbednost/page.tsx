import {
  AlertIcon,
  MessageIcon,
  ReportIcon,
  SearchIcon,
  TrustShieldIcon,
} from "@/components/icons";
import {
  EditorialCallout,
  EditorialCta,
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
  EditorialSection,
} from "@/components/editorial/Editorial";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Saveti za bezbednu kupovinu | Sve Za Pecanje" };

export default function SafetyPage() {
  return (
    <EditorialPage>
      <EditorialIntro
        eyebrow="Bezbedna kupovina"
        title="Proveri opremu, dogovor i prodavca"
        summary="Najsigurnija kupovina počinje proverljivim detaljima i jasnim dogovorom. Pokazatelji profila pomažu u proceni, ali nisu garancija transakcije."
        Icon={TrustShieldIcon}
        actions={
          <>
            <Button href="/oglasi">Pregledaj oglase</Button>
            <Button href="/kontakt" variant="secondary">Kontaktiraj podršku</Button>
          </>
        }
      />

      <EditorialFacts
        facts={[
          { label: "Pre dogovora", value: "Uporedi cenu, opis, fotografije i stanje." },
          { label: "Tokom dogovora", value: "Sačuvaj komunikaciju i potvrdi uslove." },
          { label: "Pri preuzimanju", value: "Pregledaj opremu pre plaćanja kad god možeš." },
        ]}
      />

      <EditorialSection
        id="pre-kontakta"
        title="Pre nego što kontaktiraš prodavca"
        intro="Oglas treba da pruži dovoljno podataka da znaš šta proveravaš."
        Icon={SearchIcon}
      >
        <ul className="list-disc space-y-2 pl-5 marker:text-reed-600">
          <li>Obrati pažnju na oglase sa nerealno niskim cenama.</li>
          <li>Uporedi model, stanje i tehničke detalje sa drugim oglasima.</li>
          <li>Kod skuplje opreme zatraži serijski broj i jasne fotografije tragova korišćenja.</li>
          <li>Proveri potvrđene kontakte, ocene, završene prodaje i starost naloga kao odvojene činjenice.</li>
        </ul>
      </EditorialSection>

      <EditorialSection
        id="dogovor"
        title="Dok dogovaraš kupovinu"
        intro="Precizan dogovor smanjuje prostor za nesporazum."
        Icon={MessageIcon}
      >
        <ul className="list-disc space-y-2 pl-5 marker:text-reed-600">
          <li>Sačuvaj komunikaciju sa prodavcem na platformi.</li>
          <li>Potvrdi konačnu cenu, šta ulazi u ponudu i način preuzimanja ili dostave.</li>
          <li>Ne šalji novac unapred nepoznatom prodavcu samo zato što ponuda deluje hitno.</li>
        </ul>
      </EditorialSection>

      <EditorialCallout title="Prekini dogovor ako se činjenice menjaju" Icon={AlertIcon} tone="warning">
        Ako prodavac menja cenu, podatke o opremi ili način plaćanja nakon dogovora, zastani i ponovo proveri ponudu.
      </EditorialCallout>

      <EditorialSection
        id="preuzimanje"
        title="Pri preuzimanju i plaćanju"
        intro="Stanje opreme proverava se na predmetu, ne samo u opisu."
        Icon={TrustShieldIcon}
      >
        <ul className="list-disc space-y-2 pl-5 marker:text-reed-600">
          <li>Proveri opremu uživo kada god je moguće.</li>
          <li>Uporedi serijski broj, model i vidljivo stanje sa oglasom.</li>
          <li>Za štapove proveri provodnike i spojeve; za mašinice rad, kočnicu i tragove korozije.</li>
        </ul>
      </EditorialSection>

      <EditorialSection
        id="prijava"
        title="Ako primetiš problem"
        intro="Sačuvaj podatke koji pomažu da se prijava proveri."
        Icon={ReportIcon}
      >
        <ol className="list-decimal space-y-2 pl-5 marker:font-bold marker:text-river-700">
          <li>Prekini uplatu ili dalji dogovor.</li>
          <li>Sačuvaj poruke, link oglasa i podatke o ponudi.</li>
          <li>Prijavi sumnjiv oglas preko dugmeta na stranici oglasa.</li>
          <li>Pošalji podršci dodatni kontekst ako je potreban.</li>
        </ol>
      </EditorialSection>

      <EditorialCta
        title="Treba da prijaviš problem?"
        copy="Pošalji nam link oglasa i kratak opis onoga što se dogodilo. Ne šalji lozinku ili podatke platne kartice."
        actions={
          <>
            <Button href="/kontakt" variant="secondary">Otvori kontakt formu</Button>
            <Button href="/oglasi" variant="ghost" className="!text-white hover:!bg-white/10">Nazad na oglase</Button>
          </>
        }
      />
    </EditorialPage>
  );
}
