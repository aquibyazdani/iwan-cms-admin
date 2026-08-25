import { cx } from "../lib/cx.js";
import { Button } from "./Button.jsx";

/* The four states every list and form screen can be in besides "showing the
   thing": loading, empty, failed, and a page-level error. Each is a component
   rather than an inline block so they cannot be written five slightly different
   ways across five screens. */

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx(
        "inline-block h-4 w-4 animate-spin rounded-full",
        "border-2 border-current border-r-transparent opacity-60",
        className
      )}
    />
  );
}

export function Loading({ label = "Loading…", className }) {
  return (
    <div
      className={cx(
        "flex items-center justify-center gap-2.5 py-16 text-[13px] text-fg-muted",
        className
      )}
    >
      <Spinner />
      {label}
    </div>
  );
}

/* Rows of grey blocks standing in for a table while it loads. Used instead of a
   spinner where the shape of what is coming is already known — the layout does
   not jump when the data lands. */
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action, icon: Icon }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-muted text-fg-subtle">
          <Icon size={18} stroke={1.6} />
        </span>
      )}
      <div>
        <p className="text-[15px] font-medium text-fg">{title}</p>
        {body && <p className="mt-1 max-w-[46ch] text-[13px] text-fg-muted">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/* A failed request, with the retry that goes with it. `onRetry` is optional
   because not every failure is worth retrying — a 403 will not improve. */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-fg">That did not work</p>
      <p className="max-w-[52ch] text-[13px] text-fg-muted">
        {error?.message ?? "Something went wrong."}
      </p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* An inline message above a form. Carries `role="alert"` so it is announced
   when it appears — a submit that failed silently for a screen-reader user is
   a submit that looks like it did nothing. */
export function Alert({ tone = "danger", title, children, className }) {
  const TONES = {
    danger: "border-danger/30 bg-danger-soft text-danger",
    warn: "border-warn/30 bg-warn-soft text-warn",
    accent: "border-accent/30 bg-accent-soft text-accent",
  };

  return (
    <div
      role="alert"
      className={cx("rounded-lg border px-3.5 py-3 text-[13px]", TONES[tone], className)}
    >
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cx(title && "mt-0.5", "opacity-90")}>{children}</div>}
    </div>
  );
}
