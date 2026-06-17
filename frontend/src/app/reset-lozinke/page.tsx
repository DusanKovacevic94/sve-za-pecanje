export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-black">Reset lozinke</h1>
      <p className="mt-6 rounded-lg bg-white p-6 text-slate-600">Backend endpoint `/auth/reset-password` je spreman za promenu lozinke pomoću tokena.</p>
    </div>
  );
}

