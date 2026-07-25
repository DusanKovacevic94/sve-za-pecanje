import type { Metadata } from "next";

import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export const metadata: Metadata = {
  title: "Obaveštenja | Sve Za Pecanje",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationCenter />;
}
