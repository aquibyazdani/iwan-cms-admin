import { useId } from "react";
import { cx } from "../lib/cx.js";

/* The form controls, and the wrapper that gives each one its label, hint and
   error. Grouped in one file because they share the CONTROL class set and would
   otherwise drift apart — a select that is a pixel taller than the input beside
   it is the sort of thing nobody reports and everybody notices. */

const CONTROL = cx(
  "w-full rounded border bg-surface px-3 text-[14px] text-fg",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-fg-subtle",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-muted"
);

const TONE = {
  normal: "border-line hover:border-line-strong focus:border-accent",
  invalid: "border-danger hover:border-danger focus:border-danger",
};

const tone = (invalid) => TONE[invalid ? "invalid" : "normal"];

/* Label, control, hint and error in one stack, with the ids wired up so the
   label points at the control and a screen reader reads the error with it.
   `children` is a render function taking the props the control needs, which is
   what keeps the wiring here instead of repeated at every call site. */
export function Field({ label, hint, error, required, className, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
          {required && (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children({
        id,
        invalid: Boolean(error),
        "aria-invalid": error ? true : undefined,
        "aria-describedby": cx(hint && hintId, error && errorId) || undefined,
        required,
      })}

      {hint && !error && (
        <p id={hintId} className="text-[12px] leading-[1.5] text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[12px] leading-[1.5] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ invalid, className, ...rest }) {
  return <input className={cx(CONTROL, tone(invalid), "h-9", className)} {...rest} />;
}

export function Textarea({ invalid, rows = 4, className, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cx(CONTROL, tone(invalid), "resize-y py-2 leading-[1.6]", className)}
      {...rest}
    />
  );
}

export function Select({ invalid, className, children, ...rest }) {
  return (
    <div className="relative">
      <select
        className={cx(
          CONTROL,
          tone(invalid),
          "h-9 cursor-pointer appearance-none pr-9",
          /* ⚠ `bg-none` only clears background-IMAGE — the control would keep
             its UA background and go opaque grey in dark mode. It has to be
             bg-surface, which CONTROL already sets. This is the same trap the
             public site documents. */
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
      >
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}

/* A checkbox with its label as one click target. The native input is kept —
   styling a real checkbox rather than replacing it means the keyboard, the
   indeterminate state and form semantics all keep working for free. */
export function Checkbox({ checked, onChange, label, hint, disabled, className }) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-2.5 rounded border p-3 transition-colors duration-150",
        checked
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface hover:border-line-strong",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        {hint && <span className="block text-[12px] text-fg-subtle">{hint}</span>}
      </span>
    </label>
  );
}

/* A row of mutually exclusive options — used for draft/published, where a
   dropdown would hide the current state behind a click. */
export function SegmentedControl({ value, onChange, options, className }) {
  return (
    <div
      role="radiogroup"
      className={cx(
        "inline-flex gap-0.5 rounded-lg border border-line bg-muted p-0.5",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
              active ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
