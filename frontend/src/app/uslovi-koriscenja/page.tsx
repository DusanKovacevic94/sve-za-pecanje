import { InfoIcon, TrustShieldIcon } from "@/components/icons";
import {
  EditorialCallout,
  EditorialCta,
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
  EditorialSection,
} from "@/components/editorial/Editorial";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Uslovi korišćenja | Sve Za Pecanje" };

export default function TermsPage() {
  return (
    <EditorialPage>
      <EditorialIntro
        eyebrow="Pravila platforme"
        title="Uslovi korišćenja"
        summary="Ova pravila objašnjavaju odgovornost korisnika, ulogu platforme i sadržaj koji nije dozvoljen."
        Icon={InfoIcon}
      />

      <EditorialFacts
        facts={[
          { label: "Oglas", value: "Korisnik odgovara za tačnost i zakonitost ponude." },
          { label: "Transakcija", value: "Kupac i prodavac dogovaraju je van platforme." },
          { label: "Moderacija", value: "Zloupotreba može dovesti do uklanjanja ili suspenzije." },
        ]}
      />

      <EditorialSection id="odgovornost-korisnika" title="Odgovornost korisnika">
        <p>
          Korisnici su odgovorni za tačnost svojih oglasa, komunikaciju sa drugim korisnicima i
          zakonitost opreme koju nude.
        </p>
      </EditorialSection>

      <EditorialSection id="uloga-platforme" title="Uloga platforme">
        <p>
          Platforma ne poseduje predmete iz oglasa i nije strana u offline transakcijama između
          kupca i prodavca.
        </p>
      </EditorialSection>

      <EditorialSection id="zabranjeni-sadrzaj" title="Zabranjeni sadržaj" Icon={TrustShieldIcon}>
        <p>
          Zabranjeni su nelegalna ribolovna oprema, oprema za krivolov, eksplozivi, oružje,
          municija, električni ribolov, falsifikati, ukradena oprema i uvredljiv ili prevaran
          sadržaj.
        </p>
      </EditorialSection>

      <EditorialCallout title="Moderacija i sprovođenje pravila" Icon={InfoIcon}>
        Administratori mogu ukloniti sadržaj, odbiti oglas ili suspendovati nalog u slučaju
        zloupotrebe.
      </EditorialCallout>

      <EditorialCta
        title="Imaš pitanje o pravilima?"
        copy="Pošalji podršci konkretan primer ili pročitaj savete za bezbednu kupovinu."
        actions={
          <>
            <Button href="/kontakt" variant="secondary">Kontakt</Button>
            <Button href="/saveti-za-bezbednost" variant="ghost" className="!text-white hover:!bg-white/10">Saveti za bezbednost</Button>
          </>
        }
      />
    </EditorialPage>
  );
}
