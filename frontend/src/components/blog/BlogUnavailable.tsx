"use client";
import BlogError from "@/app/blog/error";
export function BlogUnavailable() {
  return <BlogError reset={() => window.location.reload()} />;
}
