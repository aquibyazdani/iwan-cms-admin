import { Link } from "react-router-dom";
import { cx } from "../lib/cx.js";

/* The only button. Five variants, three sizes, and the element follows the
   props — `to` renders a <Link>, `href` an <a>, otherwise a real <button> with
   an explicit type. Same contract as the public site's Button, for the same
   reason: a component that decides its own element is a component a caller can
   never use in the wrong place. */

const BASE = cx(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
  "rounded font-medium transition-[background-color,border-color,color,opacity]",
  "duration-150 disabled:pointer-events-none disabled:opacity-50"
);

/* ⚠ Every variant states its OWN border colour rather than inheriting one from
   BASE. Tailwind emits utilities in its own order, not the order they are
   written, so a shared `border-line` here would sometimes beat a variant's
   override and sometimes not depending on where each lands in the sheet. The
   public site's Button hit exactly this and solves it the same way. */
const VARIANTS = {
  /* Vercel's filled black/white button: the single primary action on a screen. */
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
  /* A destructive action that is not the point of the screen — a Delete sitting
     among ordinary controls should not shout before it is chosen. */
  "danger-quiet": cx(
    "border border-line bg-surface text-danger",
    "hover:border-danger hover:bg-danger-soft"
  ),
};

const SIZES = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-[14px]",
  lg: "h-11 px-5 text-[15px]",
  /* A square button holding nothing but an icon. */
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
  /* `className` is appended last so a caller can resize or recolour without
     fighting the variant. */
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
      /* The label does not change while saving — a button that says "Save" then
         "Saving…" changes width mid-click and moves whatever is beside it. */
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
