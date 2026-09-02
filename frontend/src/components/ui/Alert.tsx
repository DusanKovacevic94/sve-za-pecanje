import type { HTMLAttributes, ReactNode } from "react";

import { AlertIcon, InfoIcon, SuccessIcon } from "@/components/icons";

export type AlertTone = "success" | "error" | "warning" | "info";

export type AlertMessage = {
  tone: AlertTone;
  text: string;
};

type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "role" | "title"> & {
  children: ReactNode;
  tone: AlertTone;
  title?: ReactNode;
  role?: "alert" | "status";
};

const toneStyles: Record<AlertTone, string> = {
  success: "border-river-200 bg-river-50 text-river-900",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-reed-200 bg-reed-50 text-reed-900",
  info: "border-sand-200 bg-sand-50 text-ink-800"
};

const toneLabels: Record<AlertTone, string> = {
  success: "Uspešno",
  error: "Greška",
  warning: "Upozorenje",
  info: "Informacija"
};

function ToneIcon({ tone }: { tone: AlertTone }) {
  if (tone === "success") return <SuccessIcon className="shrink-0" size={19} />;
  if (tone === "info") return <InfoIcon className="shrink-0" size={19} />;
  return <AlertIcon className="shrink-0" size={19} />;
}

export function Alert({
  children,
  tone,
  title,
  role = tone === "error" ? "alert" : "status",
  className = "",
  ...props
}: AlertProps) {
  return (
    <div
      role={role}
      data-alert-tone={tone}
      className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${toneStyles[tone]} ${className}`}
      {...props}
    >
      <ToneIcon tone={tone} />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{toneLabels[tone]}: </span>
        {title ? <p className="font-extrabold">{title}</p> : null}
        <div className={title ? "mt-1" : "font-semibold"}>{children}</div>
      </div>
    </div>
  );
}
