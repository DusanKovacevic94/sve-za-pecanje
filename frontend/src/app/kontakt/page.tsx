import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";

export const metadata = { title: "Kontakt | Sve Za Pecanje" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-black">Kontakt</h1>
      <form className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div><FieldLabel htmlFor="name">Ime</FieldLabel><Input id="name" name="name" /></div>
        <div><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" /></div>
        <div><FieldLabel htmlFor="subject">Tema</FieldLabel><Input id="subject" name="subject" /></div>
        <div><FieldLabel htmlFor="message">Poruka</FieldLabel><Textarea id="message" name="message" /></div>
        <Button type="submit">Pošalji</Button>
      </form>
    </div>
  );
}

