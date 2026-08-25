import {
  SearchUnavailableIcon,
  type IconComponent,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  icon: Icon = SearchUnavailableIcon,
  title,
  copy,
  action
}: {
  icon?: IconComponent;
  title: string;
  copy: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="surface px-6 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-river-100 bg-river-50 text-river-700">
        <Icon size={24} />
      </div>
      <h2 className="mt-4 text-xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{copy}</p>
      {action ? (
        <Button href={action.href} variant="secondary" className="mt-5">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
