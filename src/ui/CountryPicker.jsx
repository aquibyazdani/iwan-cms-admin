import { COUNTRIES } from "../lib/countries.js";
import { Checkbox, SegmentedControl } from "./form.jsx";
import { cx } from "../lib/cx.js";

/* ⚠ The stored value is a list where EMPTY means everywhere — fine for a
   database, terrible as a set of unticked boxes: untick everything and the item
   goes to MORE places, which nobody guesses. So scope is an explicit two-way
   choice first, and countries appear only once "Specific" is picked.

   `allowed` is the editor's own scope — a scoped editor cannot publish
   everywhere, so that option is disabled rather than failing at save. */
export function CountryPicker({ value = [], onChange, allowed = null, error }) {
  const scoped = allowed && allowed.length > 0;
  const isEverywhere = value.length === 0;

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
    } else if (value.length === 0) {
      /* ⚠ "Specific" with nothing chosen is still the empty list, which still
         means everywhere while the UI claims otherwise. */
      onChange([scoped ? allowed[0] : COUNTRIES[0].code]);
    }
  };

  const toggle = (code, on) => {
    const next = on ? [...value, code] : value.filter((c) => c !== code);
    /* Unticking the last would silently mean "everywhere", and there is
       already an explicit control for that. */
    if (next.length === 0) return;
    onChange(next);
  };

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
          <div
            className={cx(
              "grid gap-2",
              COUNTRIES.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2"
            )}
          >
            {COUNTRIES.map((country) => {
              const permitted = !scoped || allowed.includes(country.code);
              return (
                <Checkbox
                  key={country.code}
                  checked={value.includes(country.code)}
                  disabled={!permitted}
                  onChange={(on) => toggle(country.code, on)}
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
            Shown only in the countries ticked above.
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
