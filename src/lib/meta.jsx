import { createContext, useContext, useMemo } from "react";
import { useFetch } from "./useFetch.js";
import { COUNTRY_CODES } from "./countries.js";

/* The lists the API decides, fetched once for the whole app rather than per
   form.

   ⚠ Programme paths are the site's nav paths, resolved to labels through the
   ACTIVE COUNTRY's nav — so an item filed under a programme a country does not
   run shows as unfiled rather than breaking. Hence a dropdown of known paths
   and not free text: a typo would silently unfile an item everywhere. */

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

/* ⚠ Must match `NO_PROGRAMME` in the API's src/routes/crud.js — it travels as
   a query parameter. A sentinel because an empty query value cannot be told
   apart from an absent one, and "__" cannot collide with a nav path. */
export const NO_PROGRAMME = "__none";

const MetaContext = createContext(FALLBACK);

export function MetaProvider({ children }) {
  const { data } = useFetch("/api/admin/meta");

  /* A full usable answer, not a loading state — an empty dropdown for half a
     second is a form an editor can submit with the wrong value. */
  const value = useMemo(() => ({ ...FALLBACK, ...(data ?? {}) }), [data]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);

export default MetaProvider;
