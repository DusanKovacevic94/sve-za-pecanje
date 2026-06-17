import { RegisterForm } from "@/components/forms/RegisterForm";

export const metadata = { title: "Registracija | Sve Za Pecanje" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-black">Registracija</h1>
      <p className="mt-2 text-slate-600">Kreirajte nalog da postavite oglas, sačuvate pretrage i pošaljete poruke.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}

