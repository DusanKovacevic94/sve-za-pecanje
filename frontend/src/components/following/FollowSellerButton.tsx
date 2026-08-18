"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FollowedUserIcon, FollowUserIcon } from "@/components/icons";
import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type FollowState = {
  follower_count: number;
  is_following: boolean;
};

export function FollowSellerButton({
  sellerId,
  initialFollowing,
  initialFollowerCount,
  className = "",
}: {
  sellerId: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  className?: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const response = await apiFetch<FollowState>(
        `/following/sellers/${sellerId}`,
        { method: following ? "DELETE" : "POST" },
      );
      setFollowing(response.data.is_following);
      setFollowerCount(response.data.follower_count);
      pushToast(
        response.data.is_following
          ? "Sada pratite ovog prodavca."
          : "Više ne pratite ovog prodavca.",
        "success",
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/prijava");
        return;
      }
      pushToast(
        error instanceof Error ? error.message : "Praćenje nije ažurirano.",
        "error",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        className="w-full"
      >
        {following ? <FollowedUserIcon size={18} /> : <FollowUserIcon size={18} />}
        {following ? "Pratite prodavca" : "Prati prodavca"}
      </Button>
      <p className="mt-1 text-center text-xs text-slate-500">
        {followerCount} {followerCount === 1 ? "pratilac" : "pratilaca"}
      </p>
    </div>
  );
}
