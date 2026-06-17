import { apiFetch } from "@/lib/api";

type User = { id: string; email: string; username: string; role: string; status: string };

export default async function AdminUsersPage() {
  const users = await apiFetch<User[]>("/admin/users").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Korisnici</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {users.data.map((user) => (
          <div key={user.id} className="grid gap-2 border-b border-slate-100 p-4 md:grid-cols-4">
            <strong>{user.username}</strong>
            <span>{user.email}</span>
            <span>{user.role}</span>
            <span>{user.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

