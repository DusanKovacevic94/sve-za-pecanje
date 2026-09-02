import { ContactForm } from "@/components/forms/ContactForm";
import { MailIcon, ReportIcon } from "@/components/icons";
import {
  EditorialCallout,
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
  EditorialSection,
} from "@/components/editorial/Editorial";

export const metadata = { title: "Kontakt | Sve Za Pecanje" };

export default function ContactPage() {
  return (
    <EditorialPage>
      <EditorialIntro
        eyebrow="Podrška"
        title="Kontakt"
        summary="Pošalji nam pitanje, prijavu problema ili predlog. Što je opis precizniji, lakše ćemo razumeti slučaj."
        Icon={MailIcon}
      />

      <EditorialFacts
        facts={[
          { label: "Za oglas", value: "Dodaj link ili tačan naslov oglasa." },
          { label: "Za nalog", value: "Navedi email adresu naloga, ali ne i lozinku." },
          { label: "Za bezbednost", value: "Sačuvaj poruke i druge relevantne podatke." },
        ]}
      />

      <EditorialSection
        id="posalji-poruku"
        title="Pošalji poruku"
        intro="Obavezna polja služe da odgovor povežemo sa pravim pitanjem."
        Icon={MailIcon}
      >
        <ContactForm />
      </EditorialSection>

      <EditorialCallout title="Ne šalji osetljive podatke" Icon={ReportIcon} tone="warning">
        U poruku nemoj unositi lozinku, kompletne podatke platne kartice ili pristupne kodove.
        Sumnjiv oglas možeš prijaviti i direktno sa njegove stranice.
      </EditorialCallout>
    </EditorialPage>
  );
}
