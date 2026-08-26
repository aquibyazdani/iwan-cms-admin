import { useId } from "react";
import { COUNTRIES } from "../lib/countries.js";
import { Radio, SegmentedControl } from "./form.jsx";

/* ⚠ The stored value is a list where EMPTY means everywhere — fine for a
   database, terrible as a set of unticked boxes: untick everything and the item
   goes to MORE places, which nobody guesses. So scope is an explicit two-way
   choice first, and countries appear only once "Specific" is picked.

   ⚠ "Specific" is ONE country: with two countries, ticking both said exactly
   what "Everywhere" says. Add a THIRD to lib/countries.js and this has to go
   back to multi-select — `selected` below then shows nothing checked rather
   than quietly picking one. The stored shape is unchanged, an array of one.

   `allowed` is the editor's own scope — a scoped editor cannot publish
   everywhere, so that option is disabled rather than failing at save. */
export function CountryPicker({ value = [], onChange, allowed = null, error }) {
  const scoped = allowed && allowed.length > 0;
  const group = useId();

  /* Every country listed is the same reach as none, so an older document saved
     with both reads as "Everywhere". Nothing is rewritten by showing it. */
  const isEverywhere = value.length === 0 || value.length >= COUNTRIES.length;

  /* Null unless exactly one is chosen — see the note about a third country. */
  const selected = value.length === 1 ? value[0] : null;

  const options = [
    {
      value: "everywhere",
      label: "Everywhere",
    },
    { value: "specific", label: "Specific countries" },
  ];

  const setScope = (next) => {
    if (next === "everywhere") {
      if (scoped) return;
      onChange([]);
    } else if (isEverywhere) {
      /* ⚠ `isEverywhere`, not `value.length === 0` — an older document holding
         every country would leave this branch dead. Something must be chosen
         either way, or "Specific" still means everywhere. */
      onChange([scoped ? allowed[0] : COUNTRIES[0].code]);
    }
  };

  /* Always exactly one, so the empty list is unreachable from here. */
  const select = (code) => onChange([code]);

  return (
    <div className="flex flex-col gap-2.5">
      <SegmentedControl
        value={isEverywhere ? "everywhere" : "specific"}
        onChange={setScope}
        options={options.map((o) =>
          o.value === "everywhere" && scoped ? { ...o, label: "Everywhere" } : o
        )}
      />

      {isEverywhere ? (
        <p className="text-[12px] leading-[1.5] text-fg-subtle">
          Shown on the site for every country — India and Canada both.
        </p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {COUNTRIES.map((country) => {
              const permitted = !scoped || allowed.includes(country.code);
              return (
                <Radio
                  key={country.code}
                  name={group}
                  checked={selected === country.code}
                  disabled={!permitted}
                  onChange={() => select(country.code)}
                  label={
                    <>
                      <span aria-hidden="true" className="mr-1.5">
                        {country.flag}
                      </span>
                      {country.label}
                    </>
                  }
                  hint={permitted ? undefined : "Outside your permissions"}
                />
              );
            })}
          </div>
          <p className="text-[12px] leading-[1.5] text-fg-subtle">
            Shown only in the country selected above.
          </p>
        </>
      )}

      {scoped && (
        <p className="text-[12px] leading-[1.5] text-warn">
          Your account can only publish to{" "}
          {allowed
            .map((c) => COUNTRIES.find((x) => x.code === c)?.label ?? c)
            .join(" and ")}
          .
        </p>
      )}

      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

export default CountryPicker;
