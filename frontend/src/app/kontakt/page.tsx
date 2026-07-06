import { ContactForm } from "@/components/forms/ContactForm";

export const metadata = { title: "Kontakt | Sve Za Pecanje" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-black">Kontakt</h1>
      <ContactForm />
    </div>
  );
}
