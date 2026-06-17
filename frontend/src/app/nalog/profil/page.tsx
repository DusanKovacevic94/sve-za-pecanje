export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">Profil</h1>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-slate-600">Uređivanje profila je povezano preko API endpointa `/users/me/profile`; forma može da se proširi po potrebi.</p>
      </div>
    </div>
  );
}

