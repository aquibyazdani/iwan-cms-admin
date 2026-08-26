/* ⚠ Must stay in step with the API's src/lib/countries.js. The API is the
   authority and serves this from /api/admin/meta, but a local copy means the
   filter still renders while that call is in flight.

   `flag` is the regional-indicator pair. Windows draws no flag glyph and shows
   the two letters instead, which is why the label is always beside it. */
export const COUNTRIES = [
  { code: "in", label: "India", flag: "🇮🇳" },
  { code: "ca", label: "Canada", flag: "🇨🇦" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export default COUNTRIES;
