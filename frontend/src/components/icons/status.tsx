import { IconBase, type IconProps } from "./IconBase";

export function CheckIcon(props: IconProps) {
  return (
    <IconBase name="check" {...props}>
      <path d="m4 12.5 5 5L20 6.5" />
    </IconBase>
  );
}

export function SuccessIcon(props: IconProps) {
  return (
    <IconBase name="success" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m7.5 12.3 3 3 6-6.3" />
    </IconBase>
  );
}

export function PendingCircleIcon(props: IconProps) {
  return (
    <IconBase name="pending-circle" {...props}>
      <circle cx="12" cy="12" r="8.5" />
    </IconBase>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <IconBase name="info" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5V17" />
      <circle cx="12" cy="7.2" r=".7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <IconBase name="alert" {...props}>
      <path d="M10.2 3.7 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.8 3.7a2 2 0 0 0-3.6 0Z" />
      <path d="M12 8v5" />
      <circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CloudOfflineIcon(props: IconProps) {
  return (
    <IconBase name="cloud-offline" {...props}>
      <path d="M7.4 18H5.8A3.8 3.8 0 0 1 5 10.5 7 7 0 0 1 17.6 7M19.5 11a3.7 3.7 0 0 1-1.3 7H12" />
      <path d="M3 3 21 21" />
    </IconBase>
  );
}

export function FileRemoveIcon(props: IconProps) {
  return (
    <IconBase name="file-remove" {...props}>
      <path d="M5 3h9l5 5v13H5zM14 3v5h5" />
      <path d="m8.5 13 6 6M14.5 13l-6 6" />
    </IconBase>
  );
}

export function ReportIcon(props: IconProps) {
  return (
    <IconBase name="report" {...props}>
      <path d="M5 21V4M5 5h12l-2 4 2 4H5" />
    </IconBase>
  );
}

export function BlockUserIcon(props: IconProps) {
  return (
    <IconBase name="block-user" {...props}>
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 19c.7-3.5 2.6-5.3 5.5-5.3 1.2 0 2.2.3 3 .8" />
      <circle cx="17.5" cy="16.5" r="4.5" />
      <path d="m14.3 13.3 6.4 6.4" />
    </IconBase>
  );
}

export function TrustShieldIcon(props: IconProps) {
  return (
    <IconBase name="trust-shield" {...props}>
      <path d="M12 2.5 20 6v5.5c0 5.2-2.7 8.4-8 10-5.3-1.6-8-4.8-8-10V6z" />
      <path d="m8.2 11.8 2.5 2.5 5.2-5.2" />
    </IconBase>
  );
}

export function ReactivateUserIcon(props: IconProps) {
  return (
    <IconBase name="reactivate-user" {...props}>
      <path d="M12 2.5 20 6v5.5c0 5.2-2.7 8.4-8 10-5.3-1.6-8-4.8-8-10V6z" />
      <path d="M15.8 10a4 4 0 1 0 .1 4M15.8 7.5V10h-2.5" />
    </IconBase>
  );
}

export function ShieldBlockedIcon(props: IconProps) {
  return (
    <IconBase name="shield-blocked" {...props}>
      <path d="M12 2.5 20 6v5.5c0 5.2-2.7 8.4-8 10-5.3-1.6-8-4.8-8-10V6z" />
      <path d="m8.5 9 7 7M15.5 9l-7 7" />
    </IconBase>
  );
}

export function IdeaIcon(props: IconProps) {
  return (
    <IconBase name="idea" {...props}>
      <path d="M8.5 15.5C7 14.3 6.2 12.7 6.2 11a5.8 5.8 0 1 1 11.6 0c0 1.7-.8 3.3-2.3 4.5-.7.6-1 1.2-1 2H9.5c0-.8-.3-1.4-1-2Z" />
      <path d="M9.5 20h5M10.5 17.5h3" />
    </IconBase>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <IconBase name="spinner" {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    </IconBase>
  );
}

