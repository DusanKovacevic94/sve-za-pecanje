import { LockIcon, MessageIcon } from "@/components/icons";
import {
  EditorialCallout,
  EditorialCta,
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
  EditorialSection,
} from "@/components/editorial/Editorial";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Privatnost | Sve Za Pecanje" };

export default function PrivacyPage() {
  return (
    <EditorialPage>
      <EditorialIntro
        eyebrow="Podaci i nalog"
        title="Privatnost"
        summary="Ovde je sažeto koje podatke platforma koristi, šta je javno i kako možeš da zatražiš brisanje naloga."
        Icon={LockIcon}
      />

      <EditorialFacts
        facts={[
          { label: "Email", value: "Ne prikazuje se javno." },
          { label: "Telefon", value: "Javan je samo kada korisnik to uključi." },
          { label: "Analitika", value: "Bez kolačića i bez profilisanja korisnika." },
        ]}
      />

      <EditorialSection id="podaci-koje-koristimo" title="Podaci koje koristimo" Icon={LockIcon}>
        <p>Prikupljamo podatke potrebne za nalog, oglase, poruke, bezbednost i rad marketplace-a.</p>
        <p>
          Email adrese se ne prikazuju javno. Broj telefona se prikazuje samo ako korisnik uključi
          tu opciju.
        </p>
      </EditorialSection>

      <EditorialSection id="poruke-i-moderacija" title="Poruke i moderacija" Icon={MessageIcon}>
        <p>
          Poruke se čuvaju radi komunikacije između kupca i prodavca i osnovne moderacije u slučaju
          prijave.
        </p>
      </EditorialSection>

      <EditorialSection id="analitika" title="Analitika posećenosti">
        <p>
          U produkciji koristimo Umami analitiku bez kolačića za osnovne statistike posećenosti i
          anonimne događaje kao što su registracija, postavljanje oglasa, slanje poruke i čuvanje
          pretrage. Ne koristimo ove podatke za profilisanje pojedinačnih korisnika.
        </p>
      </EditorialSection>

      <EditorialSection id="analitika-bloga" title="Čitanje bloga i povezani oglasi">
        <p>
          Kada je merenje bloga uključeno, beležimo prikaze objavljenih članaka i klikove na
          povezane kategorije i oglase. Koristimo oznaku članka, oznaku odredišta klika i
          nasumičnu oznaku tog prikaza stranice, bez povezivanja sa korisničkim nalogom.
        </p>
        <p>
          Za ovo merenje ne postavljamo kolačiće niti čuvamo oznaku u pregledaču za naredne
          posete. Ne beležimo naslov članka, sadržaj poruka ili adresu prethodne stranice.
          IP adresa se pre čuvanja pretvara u zaštićeni heš. Pojedinačne događaje čuvamo
          do 90 dana; izveštaju pristupaju samo administratori.
        </p>
        <p>
          Merenje bloga se ne pokreće kada pregledač šalje Do Not Track ili Global Privacy
          Control signal, niti u uredničkom pregledu nacrta. Klik na oglas ne znači da je
          čitalac kontaktirao prodavca ili obavio kupovinu.
        </p>
      </EditorialSection>

      <EditorialCallout title="Sesija i brisanje naloga" Icon={LockIcon}>
        Koristimo kolačiće za prijavu i sesiju. Zahtev za brisanje naloga možete poslati preko
        kontakt stranice.
      </EditorialCallout>

      <EditorialCta
        title="Želiš da zatražiš brisanje naloga?"
        copy="Pošalji zahtev sa email adrese povezane sa nalogom kako bismo mogli da proverimo vlasništvo."
        actions={<Button href="/kontakt" variant="secondary">Otvori kontakt formu</Button>}
      />
    </EditorialPage>
  );
}
