import { cx } from "../lib/cx.js";
import { COUNTRIES } from "../lib/countries.js";
import { programmeLabel as programmeLabelOf } from "../lib/format.js";

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

/* A programme pill in the programme's OWN colour, which the API serves as a hex
   (see PROGRAMMES in its routes/admin.js) because the admin's Tailwind knows
   nothing about the site's four programme colours.

   ⚠ Inline `style`, not a class: the value arrives at runtime, so there is no
   class for Tailwind to have generated. Falls back to a plain badge while /meta
   is still in flight or for a path it does not know. */
export function ProgrammeBadge({ path, programmes = [], className }) {
  const programme = programmes.find((p) => p.path === path);
  const label = programme?.label ?? programmeLabelOf(path);

  if (!programme?.color) {
    return <Badge className={className}>{label}</Badge>;
  }

  return (
    <span
      style={{ backgroundColor: programme.color }}
      className={cx(
        "inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5",
        "text-[11px] font-medium leading-[1.5] whitespace-nowrap text-white",
        className
      )}
    >
      {label}
    </span>
  );
}

/* A draft is deliberately the LOUDER of the two: published is the resting state
   of most rows, so the unpublished ones are what need to stand out. */
export function StatusBadge({ status }) {
  return status === "published" ? (
    <Badge tone="success">Published</Badge>
  ) : (
    <Badge tone="warn">Draft</Badge>
  );
}

/* ⚠ An empty list means EVERYWHERE, not "unassigned" — rendering nothing would
   read as a half-filled form. */
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
            {/* Windows falls back to the two letters — hence the label. */}
            <span aria-hidden="true">{country?.flag ?? "🏳"}</span>
            {country?.label ?? code.toUpperCase()}
          </Badge>
        );
      })}
    </span>
  );
}

export default Badge;
