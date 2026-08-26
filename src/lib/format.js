import { COUNTRIES } from "./countries.js";

/* ⚠ Field-by-field, never `new Date("2026-08-21")` — that reads as UTC and
   lands a day early west of Greenwich. A content date is a calendar day, not an
   instant; the site keeps the same parser in src/lib/events.js. */
export const parseDay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/* ⚠ The VIEWER's calendar day, not the server's — the API filters "upcoming"
   against this, so a UTC server never calls tonight's event past. */
export const todayKey = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDay = (iso) => {
  const date = parseDay(iso);
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* A timestamp IS an instant, so this one is an ordinary Date. */
export const formatWhen = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* Seconds → "5:48", as the site's player prints it. */
export const formatLength = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

/* ⚠ An EMPTY list means everywhere, not "unassigned" — printing "—" would read
   as a form someone forgot to finish. */
export const formatCountries = (codes = []) => {
  if (!codes || codes.length === 0) return "Everywhere";
  return codes
    .map((code) => COUNTRIES.find((c) => c.code === code)?.label ?? code.toUpperCase())
    .join(" · ");
};

export const truncate = (text = "", max = 90) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/* "/iwan-women" → "Iwan Women".

   ⚠ Derived from the path rather than looked up: a list here would be a third
   copy of the programmes and the likeliest to go stale. The site does the
   opposite because there a wrong label is visitor-facing; here it is a column
   in a table, where approximately right beats stale. */
export const programmeLabel = (path) => {
  if (!path) return null;
  return path
    .replace(/^\//, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
