import { apiFetch } from "@/lib/api";

type Conversation = {
  id: string;
  listing_id: string;
  buyer_unread_count: number;
  seller_unread_count: number;
  messages: { id: string; sender_id: string; body: string; created_at: string }[];
};

export default async function MessagesPage() {
  const conversations = await apiFetch<Conversation[]>("/conversations").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">Poruke</h1>
      <div className="mt-6 space-y-4">
        {conversations.data.length ? conversations.data.map((conversation) => (
          <article key={conversation.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">Oglas: {conversation.listing_id}</p>
            <p className="mt-2 text-slate-800">{conversation.messages.at(-1)?.body ?? "Nema poruka."}</p>
          </article>
        )) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-black">Nemate poruke.</h2>
            <p className="mt-2 text-slate-600">Kada kontaktirate prodavca ili neko kontaktira vas, poruke će se prikazati ovde.</p>
          </div>
        )}
      </div>
    </div>
  );
}

