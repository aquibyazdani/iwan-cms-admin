import { cx } from "../lib/cx.js";
import { COUNTRIES } from "../lib/countries.js";

const TONES = {
  neutral: "border-line bg-muted text-fg-muted",
  success: "border-success/30 bg-success-soft text-success",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/30 bg-danger-soft text-danger",
  accent: "border-accent/30 bg-accent-soft text-accent",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11px] font-medium leading-[1.5] whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* Draft vs published, in the one place that decides how each reads.
   A draft is deliberately the LOUDER of the two: published is the resting state
   of most rows, and an editor scanning a list needs the unpublished ones to
   stand out, not the other way round. */
export function StatusBadge({ status }) {
  return status === "published" ? (
    <Badge tone="success">Published</Badge>
  ) : (
    <Badge tone="warn">Draft</Badge>
  );
}

/* ⚠ An empty list means EVERYWHERE, not "unassigned". Rendering nothing there
   would read as a half-filled form, so it gets its own badge. */
export function CountryBadges({ codes = [] }) {
  if (!codes || codes.length === 0) {
    return <Badge tone="accent">Everywhere</Badge>;
  }

  return (
    <span className="inline-flex flex-wrap gap-1">
      {codes.map((code) => {
        const country = COUNTRIES.find((c) => c.code === code);
        return (
          <Badge key={code}>
            {/* Windows draws no flag glyph and falls back to the two letters,
                which is why the label is always beside it. */}
            <span aria-hidden="true">{country?.flag ?? "🏳"}</span>
            {country?.label ?? code.toUpperCase()}
          </Badge>
        );
      })}
    </span>
  );
}

export default Badge;
