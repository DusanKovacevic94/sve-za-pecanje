import { FollowingHub } from "@/components/following/FollowingHub";
import {
  type FollowingSeller,
  type ListingCard as ListingCardType,
} from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export default async function FollowingPage() {
  const [feed, following] = await Promise.all([
    serverApiFetch<ListingCardType[]>("/following/feed?limit=24").catch(() => ({
      data: [] as ListingCardType[],
      meta: {},
    })),
    serverApiFetch<FollowingSeller[]>("/following?limit=50").catch(() => ({
      data: [] as FollowingSeller[],
      meta: {},
    })),
  ]);
  const nextCursor = (feed.meta as Record<string, unknown> | undefined)
    ?.next_cursor;

  return (
    <FollowingHub
      initialListings={feed.data}
      initialCursor={
        typeof nextCursor === "string" ? nextCursor : null
      }
      sellers={following.data}
    />
  );
}
