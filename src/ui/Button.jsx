import { Link } from "react-router-dom";
import { cx } from "../lib/cx.js";

/* The only button. The element follows the props — `to` renders a <Link>,
   `href` an <a>, otherwise a real <button> with an explicit type — so a caller
   cannot use it in the wrong place. */

const BASE = cx(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
  "rounded font-medium transition-[background-color,border-color,color,opacity]",
  "duration-150 disabled:pointer-events-none disabled:opacity-50"
);

/* ⚠ Every variant states its OWN border colour rather than inheriting from
   BASE. Tailwind emits utilities in its own order, not the written one, so a
   shared `border-line` would beat a variant's override unpredictably. */
const VARIANTS = {
  /* The single primary action on a screen. */
  primary: cx(
    "border border-fg bg-fg text-fg-invert",
    "hover:bg-fg/90 hover:border-fg/90"
  ),
  secondary: cx(
    "border border-line bg-surface text-fg",
    "hover:border-line-strong hover:bg-muted"
  ),
  ghost:
    "border border-transparent bg-transparent text-fg-muted hover:bg-muted hover:text-fg",
  accent: cx(
    "border border-accent bg-accent text-white",
    "hover:bg-accent-hover hover:border-accent-hover"
  ),
  danger: cx(
    "border border-danger bg-danger text-white",
    "hover:bg-danger-hover hover:border-danger-hover"
  ),
  /* A Delete sitting among ordinary controls should not shout. */
  "danger-quiet": cx(
    "border border-line bg-surface text-danger",
    "hover:border-danger hover:bg-danger-soft"
  ),
};

const SIZES = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-[14px]",
  lg: "h-11 px-5 text-[15px]",
  /* Icon only. */
  icon: "h-9 w-9 p-0",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  to,
  href,
  type = "button",
  loading = false,
  disabled,
  children,
  ...rest
}) {
  /* Last, so a caller can resize or recolour without fighting the variant. */
  const classes = cx(BASE, VARIANTS[variant], SIZES[size], className);

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noreferrer noopener"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      /* ⚠ The label does not change while saving: "Save" → "Saving…" changes
         width mid-click and moves whatever is beside it. */
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70"
        />
      )}
      {children}
    </button>
  );
}

export default Button;
