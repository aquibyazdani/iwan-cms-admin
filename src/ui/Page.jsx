import { cx } from "../lib/cx.js";

/* Page furniture. Hairlines rather than shadows — a shadow here means "this
   floats", so spending it on a static panel leaves nothing to say it with. */

export function PageHeader({ title, description, actions, className }) {
  return (
    <div
      className={cx("mb-6 flex flex-wrap items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-fg">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-[70ch] text-[13px] leading-[1.6] text-fg-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-xl border border-line bg-surface",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({ title, description, actions, className }) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        {description && (
          <p className="mt-0.5 max-w-[70ch] text-[12.5px] leading-[1.6] text-fg-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelBody({ className, children }) {
  return <div className={cx("px-5 py-5", className)}>{children}</div>;
}

/* `sticky`, so the filters stay reachable down a long table. */
export function Toolbar({ className, children }) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}
