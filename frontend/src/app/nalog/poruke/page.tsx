import Link from "next/link";

import { MessageForm } from "@/components/messages/MessageForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Conversation } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";

type MessagesPageProps = {
  searchParams?: Promise<{ listing?: string }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams;
  const listingId = params?.listing;
  const conversations = await serverApiFetch<Conversation[]>("/conversations").catch(() => ({
    data: [],
  }));

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Poruke</h1>
          <p className="mt-2 text-slate-600">Razgovori sa kupcima i prodavcima.</p>
        </div>
        <Button href="/oglasi" variant="secondary">Pronađi oglas</Button>
      </div>

      {listingId ? (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Nova poruka</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pošaljite prvu poruku prodavcu. Razgovor će se pojaviti u listi čim poruka bude poslata.
          </p>
          <div className="mt-4">
            <MessageForm mode="new" listingId={listingId} />
          </div>
        </section>
      ) : null}

      <div className="mt-6 space-y-4">
        {conversations.data.length ? conversations.data.map((conversation) => {
          const lastMessage = conversation.messages.at(-1);
          return (
            <Link
              key={conversation.id}
              href={`/nalog/poruke/${conversation.id}`}
              className="focus-ring block rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-river-500"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-river-700">{conversation.listing.title}</p>
                  <h2 className="mt-1 truncate text-xl font-black">
                    {conversation.counterpart.display_name ?? conversation.counterpart.username}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {conversation.unread_count ? <Badge tone="accent">{conversation.unread_count} novo</Badge> : null}
                  {conversation.last_message_at ? (
                    <span className="text-xs font-semibold text-slate-500">
                      {formatDate(conversation.last_message_at)}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-slate-700">{lastMessage?.body ?? "Nema poruka."}</p>
            </Link>
          );
        }) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-black">Nemate poruke.</h2>
            <p className="mt-2 text-slate-600">Kada kontaktirate prodavca ili neko kontaktira vas, poruke će se prikazati ovde.</p>
          </div>
        )}
      </div>
    </div>
  );
}
