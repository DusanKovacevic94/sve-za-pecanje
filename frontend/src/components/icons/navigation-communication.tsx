import { IconBase, type IconProps } from "./IconBase";

export function SearchIcon(props: IconProps) {
  return (
    <IconBase name="search" {...props}>
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="m15.1 15.1 4.6 4.6" />
    </IconBase>
  );
}

export function SearchUnavailableIcon(props: IconProps) {
  return (
    <IconBase name="search-unavailable" {...props}>
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="m15.1 15.1 4.6 4.6M8.3 8.3l4.4 4.4M12.7 8.3l-4.4 4.4" />
    </IconBase>
  );
}

export function FiltersIcon(props: IconProps) {
  return (
    <IconBase name="filters" {...props}>
      <path d="M4 6h5M13 6h7M4 12h9M17 12h3M4 18h3M11 18h9" />
      <circle cx="11" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="18" r="2" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase name="chevron-down" {...props}>
      <path d="m7 9.5 5 5 5-5" />
    </IconBase>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <IconBase name="dashboard" {...props}>
      <rect x="3.5" y="3.5" width="7" height="6" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="9" rx="1.2" />
      <rect x="3.5" y="12.5" width="7" height="8" rx="1.2" />
      <rect x="13.5" y="15.5" width="7" height="5" rx="1.2" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase name="settings" {...props}>
      <path d="M9.5 3.8 10.2 2h3.6l.7 1.8 2 .8 1.8-.8 2 2-1 1.8.8 2 1.9.7v3.4l-1.9.7-.8 2 1 1.8-2 2-1.8-.9-2 .8-.7 1.9h-3.6l-.7-1.9-2-.8-1.8.9-2-2 1-1.8-.8-2-1.9-.7v-3.4l1.9-.7.8-2-1-1.8 2-2 1.8.8z" />
      <circle cx="12" cy="12" r="3.1" />
    </IconBase>
  );
}

export function ViewIcon(props: IconProps) {
  return (
    <IconBase name="view" {...props}>
      <path d="M2.8 12c2.4-3.7 5.5-5.5 9.2-5.5s6.8 1.8 9.2 5.5c-2.4 3.7-5.5 5.5-9.2 5.5S5.2 15.7 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </IconBase>
  );
}

export function LocationIcon(props: IconProps) {
  return (
    <IconBase name="location" {...props}>
      <path d="M12 21s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.1" />
    </IconBase>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <IconBase name="external-link" {...props}>
      <path d="M10 5H5.5A2.5 2.5 0 0 0 3 7.5v11A2.5 2.5 0 0 0 5.5 21h11a2.5 2.5 0 0 0 2.5-2.5V14" />
      <path d="M14 3h7v7M21 3l-9 9" />
    </IconBase>
  );
}

function BellShape() {
  return (
    <>
      <path d="M6.2 10.2c0-3.6 2.3-6.2 5.8-6.2s5.8 2.6 5.8 6.2v4l1.8 2.5H4.4l1.8-2.5z" />
      <path d="M9.7 19.2c.5 1.1 1.2 1.6 2.3 1.6s1.8-.5 2.3-1.6" />
    </>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconBase name="bell" {...props}>
      <BellShape />
    </IconBase>
  );
}

export function BellMutedIcon(props: IconProps) {
  return (
    <IconBase name="bell-muted" {...props}>
      <BellShape />
      <path d="M4 4 20 20" />
    </IconBase>
  );
}

export function DoubleCheckIcon(props: IconProps) {
  return (
    <IconBase name="double-check" {...props}>
      <path d="m3 12 4 4 7-8M10 14.5l2.5 2.5L21 7.5" />
    </IconBase>
  );
}

function MailShape() {
  return (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4.5 7 7.5 5.8L19.5 7" />
    </>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <IconBase name="mail" {...props}>
      <MailShape />
    </IconBase>
  );
}

export function VerifiedMailIcon(props: IconProps) {
  return (
    <IconBase name="verified-mail" {...props}>
      <MailShape />
      <circle cx="18.2" cy="17.8" r="3.2" />
      <path d="m16.7 17.8 1 1 2-2.2" />
    </IconBase>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <IconBase name="phone" {...props}>
      <path d="M7.2 3.5 4.4 5.2c-.9.5-1.2 1.5-.9 2.5 2 6.5 6.3 10.8 12.8 12.8 1 .3 2-.1 2.5-.9l1.7-2.8-4.7-2.5-1.5 2c-2.9-1.2-5.4-3.7-6.6-6.6l2-1.5z" />
    </IconBase>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconBase name="message" {...props}>
      <path d="M4.8 4h14.4A2.8 2.8 0 0 1 22 6.8v8.4a2.8 2.8 0 0 1-2.8 2.8H10l-5.5 3v-3.4A2.8 2.8 0 0 1 2 14.8v-8A2.8 2.8 0 0 1 4.8 4Z" />
      <path d="M7 9h10M7 13h6" />
    </IconBase>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <IconBase name="send" {...props}>
      <path d="m3 4 18 8-18 8 2.2-6.2L14 12l-8.8-1.8z" />
    </IconBase>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconBase name="share" {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
    </IconBase>
  );
}

export function PromotionIcon(props: IconProps) {
  return (
    <IconBase name="promotion" {...props}>
      <path d="M4 10v4h4l8 4V6l-8 4z" />
      <path d="m8 14 1.2 5H6.5L5.4 14M19 9l2-1M19 15l2 1M19.5 12H22" />
    </IconBase>
  );
}
