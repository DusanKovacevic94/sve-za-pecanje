import type { HTMLAttributes, ReactNode } from "react";

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={classes("text-3xl font-extrabold tracking-tight text-ink sm:text-4xl", className)}
      {...props}
    />
  );
}

export function SectionHeading({
  as: Tag = "h2",
  level = "section",
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3";
  level?: "section" | "card";
}) {
  return (
    <Tag
      className={classes(
        "text-ink",
        level === "section" ? "text-xl font-extrabold sm:text-2xl" : "text-base font-bold",
        className
      )}
      {...props}
    />
  );
}

export function SupportingCopy({
  as: Tag = "p",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "p" | "div" | "span" }) {
  return (
    <Tag
      className={classes("text-sm leading-6 text-ink-600", className)}
      {...props}
    />
  );
}

export const panelClassName = "rounded-xl border border-sand-200 bg-white";
export const raisedPanelClassName = `${panelClassName} shadow-soft`;

export function Panel({
  as: Tag = "div",
  elevation = "none",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside";
  elevation?: "none" | "soft" | "lift";
  children: ReactNode;
}) {
  return (
    <Tag
      className={classes(
        panelClassName,
        elevation === "soft" && "shadow-soft",
        elevation === "lift" && "shadow-lift",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function ActionRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classes("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}
      {...props}
    />
  );
}

export function Metadata({
  as: Tag = "span",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "span" | "p" | "div" }) {
  return (
    <Tag
      className={classes("text-xs font-semibold leading-5 text-ink-500", className)}
      {...props}
    />
  );
}

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={classes("border-0 border-t border-sand-200", className)} {...props} />;
}
