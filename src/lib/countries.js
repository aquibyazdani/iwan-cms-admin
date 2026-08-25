/* ⚠ Must stay in step with the API's src/lib/countries.js and the public site's
   src/config/countries.js. The API is the authority — it also serves this list
   from /api/admin/meta — but the labels and flags are the admin's own, and a
   local copy means the country filter still renders while that call is in
   flight.

   `flag` is the regional-indicator emoji pair. Apple and Android draw the real
   flag; Windows has no flag glyphs and renders the two letters instead, which is
   legible and the reason the label is always shown next to it. */
export const COUNTRIES = [
  { code: "in", label: "India", flag: "🇮🇳" },
  { code: "ca", label: "Canada", flag: "🇨🇦" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export default COUNTRIES;
