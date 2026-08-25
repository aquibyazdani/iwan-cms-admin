import { createContext, useContext, useMemo } from "react";
import { useFetch } from "./useFetch.js";
import { COUNTRY_CODES } from "./countries.js";

/* The lists the API decides — which country codes it accepts, and which
   programme paths content can be filed under — fetched once for the whole app
   rather than per form.

   ⚠ The programme paths are the public site's nav paths (`/iwan-women`), and
   the site resolves them to labels through the ACTIVE COUNTRY's nav. Canada
   does not run Iwan Women, so an item filed under it simply shows as unfiled
   there rather than breaking — which is why this is a dropdown of known paths
   and not free text: a typo would silently unfile an item in every country. */

const FALLBACK = {
  countries: COUNTRY_CODES,
  programmes: [
    { path: "/iwan-men", label: "Iwan Men" },
    { path: "/iwan-women", label: "Iwan Women" },
    { path: "/iwan-youth", label: "Iwan Youth" },
    { path: "/iwan-kids", label: "Iwan Kids" },
  ],
  statuses: ["draft", "published"],
};

/* The filter value meaning "not tied to any programme".

   ⚠ Must match `NO_PROGRAMME` in the API's src/routes/crud.js — it travels
   across as a query parameter. A sentinel rather than an empty string, because
   an empty query value cannot be told apart from an absent one, and it starts
   with "__" so it can never collide with a real nav path (always "/…"). */
export const NO_PROGRAMME = "__none";

const MetaContext = createContext(FALLBACK);

export function MetaProvider({ children }) {
  const { data } = useFetch("/api/admin/meta");

  /* The fallback is not a loading state — it is a full, usable answer. A form
     that renders an empty programme dropdown for the half-second the request
     takes is a form an editor can submit with the wrong value. */
  const value = useMemo(() => ({ ...FALLBACK, ...(data ?? {}) }), [data]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);

export default MetaProvider;
