import { ProfileForm } from "@/components/forms/ProfileForm";
import type { UserProfile } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export default async function ProfilePage() {
  const profile = await serverApiFetch<UserProfile>("/users/me/profile");

  return (
    <div>
      <h1 className="text-3xl font-black">Profil</h1>
      <p className="mt-2 text-slate-600">Podaci koje drugi ribolovci vide na vašem javnom profilu.</p>
      <div className="mt-6">
        <ProfileForm profile={profile.data} />
      </div>
    </div>
  );
}
