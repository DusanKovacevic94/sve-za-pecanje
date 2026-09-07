import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogNotFound from "@/app/blog/not-found";
import { BlogUnavailable } from "@/components/blog/BlogUnavailable";
export const metadata: Metadata = {
  title: "Blog | Sve Za Pecanje",
  description: "Status dostupnosti bloga.",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
  referrer: "no-referrer",
};
export default async function BlogStatus({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (code === "404") return <BlogNotFound />;
  if (code === "503") return <BlogUnavailable />;
  notFound();
}
