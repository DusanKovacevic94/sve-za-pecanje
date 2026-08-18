import { IconBase, type IconProps } from "./IconBase";

function UserShape() {
  return (
    <>
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 18.5c.8-3.3 2.6-5 5.5-5s4.7 1.7 5.5 5" />
    </>
  );
}

export function AccountIcon(props: IconProps) {
  return (
    <IconBase name="account" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9" r="2.7" />
      <path d="M6.9 18c.8-2.8 2.5-4.2 5.1-4.2s4.3 1.4 5.1 4.2" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase name="user" {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase name="users" {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.7-3.5 2.5-5.2 5.5-5.2s4.8 1.7 5.5 5.2" />
      <path d="M15 5.6a3 3 0 0 1 0 5.8M16 14c2.4.4 3.9 2.1 4.5 5" />
    </IconBase>
  );
}

export function FollowUserIcon(props: IconProps) {
  return (
    <IconBase name="follow-user" {...props}>
      <UserShape />
      <path d="M19 11v6M16 14h6" />
    </IconBase>
  );
}

export function FollowedUserIcon(props: IconProps) {
  return (
    <IconBase name="followed-user" {...props}>
      <UserShape />
      <path d="m16.5 14 2 2 3.5-4" />
    </IconBase>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <IconBase name="store" {...props}>
      <path d="M4 10v10h16V10M3 10l2-6h14l2 6" />
      <path d="M3 10c.5 1.4 1.5 2.1 3 2.1s2.5-.7 3-2.1c.5 1.4 1.5 2.1 3 2.1s2.5-.7 3-2.1c.5 1.4 1.5 2.1 3 2.1s2.5-.7 3-2.1" />
      <path d="M9 20v-5h6v5" />
    </IconBase>
  );
}

export function ShopBagIcon(props: IconProps) {
  return (
    <IconBase name="shop-bag" {...props}>
      <path d="M5 8h14l1 12H4z" />
      <path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2M12 12v5" />
    </IconBase>
  );
}

export function VerifiedBadgeIcon(props: IconProps) {
  return (
    <IconBase name="verified-badge" {...props}>
      <path d="m12 2.5 2.2 1.7 2.8-.3.9 2.6 2.4 1.4-.8 2.7.8 2.7-2.4 1.4-.9 2.6-2.8-.3L12 21.5l-2.2-1.7-2.8.3-.9-2.6-2.4-1.4.8-2.7-.8-2.7 2.4-1.4L7 3.9l2.8.3z" />
      <path d="m8.3 12 2.4 2.4 5-5" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase name="calendar" {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M7.5 3v4M16.5 3v4M3.5 9h17M7.5 13h2M12 13h2M16.5 13h.1M7.5 17h2M12 17h2" />
    </IconBase>
  );
}

export function CalendarClockIcon(props: IconProps) {
  return (
    <IconBase name="calendar-clock" {...props}>
      <rect x="3" y="4.5" width="16" height="15.5" rx="2" />
      <path d="M7 2.5v4M15 2.5v4M3 8.5h16" />
      <circle cx="17.5" cy="17.5" r="4" />
      <path d="M17.5 15.2v2.5l1.7 1" />
    </IconBase>
  );
}

export function RatingIcon(props: IconProps) {
  return (
    <IconBase name="rating" {...props}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </IconBase>
  );
}

export function FavoriteIcon(props: IconProps) {
  return (
    <IconBase name="favorite" {...props}>
      <path d="M12 20.5 4.6 13.3C.8 9.5 3.3 4 7.4 4c2 0 3.6 1 4.6 2.5C13 5 14.6 4 16.6 4c4.1 0 6.6 5.5 2.8 9.3z" />
    </IconBase>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <IconBase name="camera" {...props}>
      <path d="M4.5 7h3l1.3-2h6.4l1.3 2h3A2.5 2.5 0 0 1 22 9.5v8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-8A2.5 2.5 0 0 1 4.5 7Z" />
      <circle cx="12" cy="13.5" r="3.5" />
      <circle cx="18.5" cy="9.5" r=".6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <IconBase name="analytics" {...props}>
      <path d="M4 20V10h4v10M10 20V5h4v15M16 20v-7h4v7M3 20h18" />
      <path d="m5 7 5-4 4 3 5-4" />
    </IconBase>
  );
}

export function AddIcon(props: IconProps) {
  return (
    <IconBase name="add" {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function AddCircleIcon(props: IconProps) {
  return (
    <IconBase name="add-circle" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M7.5 12h9" />
    </IconBase>
  );
}

export function AddListingIcon(props: IconProps) {
  return (
    <IconBase name="add-listing" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M12 7v10M7 12h10" />
    </IconBase>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <IconBase name="edit" {...props}>
      <path d="m4 20 1-4.7L16.8 3.5a2.1 2.1 0 0 1 3 3L8 18.3zM14.8 5.5l3.7 3.7M4 20l4-1.7" />
    </IconBase>
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <IconBase name="delete" {...props}>
      <path d="M4 6h16M9 6V3.5h6V6M6.5 6l.8 15h9.4l.8-15M10 10v7M14 10v7" />
    </IconBase>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <IconBase name="archive" {...props}>
      <path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6" />
      <path d="M12 10v6M9.5 13.5 12 16l2.5-2.5" />
    </IconBase>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <IconBase name="save" {...props}>
      <path d="M4 3h13l3 3v15H4z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase name="download" {...props}>
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 19v2h16v-2" />
    </IconBase>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <IconBase name="retry" {...props}>
      <path d="M19 8V3l-2.2 2.2A8 8 0 1 0 20 12" />
      <path d="M19 3h-5" />
    </IconBase>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <IconBase name="undo" {...props}>
      <path d="m9 7-5 5 5 5M4 12h9c4.4 0 7 2.3 7 6" />
    </IconBase>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <IconBase name="arrow-up" {...props}>
      <path d="M12 20V4M6.5 9.5 12 4l5.5 5.5" />
    </IconBase>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <IconBase name="arrow-down" {...props}>
      <path d="M12 4v16M6.5 14.5 12 20l5.5-5.5" />
    </IconBase>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <IconBase name="logout" {...props}>
      <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
    </IconBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconBase name="lock" {...props}>
      <rect x="4.5" y="10" width="15" height="11" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v3" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase name="close" {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}
