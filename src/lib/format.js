import { COUNTRIES } from "./countries.js";

/* ⚠ Field-by-field, never `new Date("2026-08-21")` — that reads the string as
   UTC and lands on the previous day for anyone west of Greenwich. The same
   parser the public site keeps in src/lib/events.js, and the same reason: a
   content date is a calendar day, not an instant.

   An admin showing an editor the wrong day for their own event would be a
   particularly embarrassing way to lose their trust in the tool. */
export const parseDay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/* ⚠ Today as the VIEWER's calendar day, not the server's — built field by
   field, for the same reason `parseDay` exists. The API filters "upcoming"
   against this, so a server in UTC never decides that tonight's event is
   already past for someone looking at it this morning. */
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

/* An updatedAt timestamp IS an instant, so this one is an ordinary Date. */
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

/* Seconds → "5:48", the same running time the site's player prints. */
export const formatLength = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

/* ⚠ An EMPTY country list means everywhere, not "unassigned" — see the API's
   lib/countries.js. Printing it as "—" would read as a form someone forgot to
   finish, so it is spelled out. */
export const formatCountries = (codes = []) => {
  if (!codes || codes.length === 0) return "Everywhere";
  return codes
    .map((code) => COUNTRIES.find((c) => c.code === code)?.label ?? code.toUpperCase())
    .join(" · ");
};

export const truncate = (text = "", max = 90) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/* A nav path as a readable label: "/iwan-women" → "Iwan Women".

   ⚠ Derived from the path rather than looked up in a list of programmes, and
   deliberately so: a list here would be a third copy of the programmes (after
   the site's nav.js and the API's /meta) and the one most likely to go stale.
   Deriving it means a programme added on the site reads correctly here with no
   change at all. Only the LIST of options to choose from comes from /meta.

   The site itself does the opposite — it resolves the label out of the active
   country's nav — because there a wrong label is visitor-facing. Here it is a
   column in an editor's table, and being approximately right always beats being
   exactly right until someone forgets to update a list. */
export const programmeLabel = (path) => {
  if (!path) return null;
  return path
    .replace(/^\//, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
