import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldA11yProps = {
  error?: ReactNode;
  errorId?: string;
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldA11yProps;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldA11yProps;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldA11yProps;

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
      {children}
    </label>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="text-sm font-semibold text-red-700">
      {children}
    </p>
  );
}

export function Input({ error, errorId, className, ...props }: InputProps) {
  const describedBy = error ? joinDescribedBy(props["aria-describedby"], errorId ?? `${props.id}-error`) : props["aria-describedby"];
  return (
    <>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`focus-ring min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm transition ${
          error ? "border-red-400" : "border-slate-200 hover:border-river-200"
        } ${className ?? ""}`}
      />
      {error ? <FieldError id={errorId ?? `${props.id}-error`}>{error}</FieldError> : null}
    </>
  );
}

export function Select({ error, errorId, className, ...props }: SelectProps) {
  const describedBy = error ? joinDescribedBy(props["aria-describedby"], errorId ?? `${props.id}-error`) : props["aria-describedby"];
  return (
    <>
      <select
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`focus-ring min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm transition ${
          error ? "border-red-400" : "border-slate-200 hover:border-river-200"
        } ${className ?? ""}`}
      />
      {error ? <FieldError id={errorId ?? `${props.id}-error`}>{error}</FieldError> : null}
    </>
  );
}

export function Textarea({ error, errorId, className, ...props }: TextareaProps) {
  const describedBy = error ? joinDescribedBy(props["aria-describedby"], errorId ?? `${props.id}-error`) : props["aria-describedby"];
  return (
    <>
      <textarea
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`focus-ring min-h-32 w-full rounded-lg border bg-white px-3 py-2 text-sm transition ${
          error ? "border-red-400" : "border-slate-200 hover:border-river-200"
        } ${className ?? ""}`}
      />
      {error ? <FieldError id={errorId ?? `${props.id}-error`}>{error}</FieldError> : null}
    </>
  );
}

function joinDescribedBy(current: string | undefined, errorId: string) {
  return current ? `${current} ${errorId}` : errorId;
}
