import { notFound, redirect } from "next/navigation";

import { MessageForm } from "@/components/messages/MessageForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError, type Conversation } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  deliveryMethodLabels,
  formatDate,
  formatListingPrice,
  listingStatusLabels,
  priceTypeLabels
} from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";

type ConversationPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export default async function ConversationPage({ params, searchParams }: ConversationPageProps) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!user) {
    redirect("/prijava");
  }
  const page = Math.max(Number(query?.page ?? 1), 1);
  let conversation: Conversation;
  try {
    const response = await serverApiFetch<Conversation>(`/conversations/${id}?page=${page}&page_size=50`);
    conversation = response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiError && error.status === 403) {
      redirect("/nalog/poruke");
    }
    throw error;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button href="/nalog/poruke" variant="ghost" className="mb-3 px-0">Nazad na poruke</Button>
          <h1 className="text-3xl font-black">{conversation.listing.title}</h1>
          <p className="mt-2 text-slate-600">
            Razgovor sa {conversation.counterpart.display_name ?? conversation.counterpart.username}
          </p>
        </div>
        <Button href={`/oglasi/${conversation.listing.slug}`} variant="secondary">Otvori oglas</Button>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={conversation.listing.status === "reserved" ? "warn" : "neutral"}>
            {listingStatusLabels[conversation.listing.status] ?? conversation.listing.status}
          </Badge>
          <span className="text-sm font-bold text-river-800">
            {formatListingPrice(
              conversation.listing.price_type,
              conversation.listing.price_amount,
              conversation.listing.currency
            )}
          </span>
          <Badge>{priceTypeLabels[conversation.listing.price_type]}</Badge>
          {conversation.listing.delivery_methods.map((method) => (
            <Badge key={method}>{deliveryMethodLabels[method] ?? method}</Badge>
          ))}
          <span className="text-sm font-semibold text-slate-500">
            {conversation.messages_meta.total} poruka
          </span>
        </div>
        {conversation.listing.delivery_note ? (
          <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {conversation.listing.delivery_note}
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          {conversation.messages.map((message) => {
            const own = message.sender_id === user.id;
            const sender = message.sender_id === conversation.buyer_id ? conversation.buyer : conversation.seller;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[min(680px,85%)] rounded-lg px-4 py-3 ${own ? "bg-river-600 text-white" : "bg-slate-100 text-ink"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold opacity-80">
                    <span>{sender.display_name ?? sender.username}</span>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6">{message.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        {conversation.messages_meta.total_pages > 1 ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Button href={`/nalog/poruke/${conversation.id}?page=${page - 1}`} variant="secondary">Prethodna</Button>
            ) : <span />}
            <span className="text-sm font-semibold text-slate-500">
              Strana {conversation.messages_meta.page} / {conversation.messages_meta.total_pages}
            </span>
            {page < conversation.messages_meta.total_pages ? (
              <Button href={`/nalog/poruke/${conversation.id}?page=${page + 1}`} variant="secondary">Sledeća</Button>
            ) : <span />}
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Odgovor</h2>
        <div className="mt-4">
          <MessageForm mode="reply" conversationId={conversation.id} />
        </div>
      </section>
    </div>
  );
}
