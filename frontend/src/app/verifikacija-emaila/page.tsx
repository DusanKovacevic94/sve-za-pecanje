export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-black">Verifikacija emaila</h1>
      <p className="mt-6 rounded-lg bg-white p-6 text-slate-600">Backend endpoint `/auth/verify-email` potvrđuje email token iz poruke.</p>
    </div>
  );
}

