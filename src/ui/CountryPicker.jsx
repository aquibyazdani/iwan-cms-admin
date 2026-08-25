import { COUNTRIES } from "../lib/countries.js";
import { Checkbox, SegmentedControl } from "./form.jsx";
import { cx } from "../lib/cx.js";

/* Where "which countries is this for" gets decided.

   ⚠ The stored value is a list where EMPTY means everywhere — which is a fine
   thing for a database and a terrible thing to show an editor as a set of
   unticked boxes. Untick everything and the item goes to MORE places, not
   fewer; nobody guesses that. So the scope is an explicit two-way choice first,
   and the countries only appear once "Specific countries" is picked.

   `allowed` is the signed-in editor's own country scope: a scoped editor cannot
   publish everywhere (that would include countries they do not have), so the
   Everywhere option is disabled for them rather than failing at save. */
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
      /* Moving to "specific" with nothing chosen would leave the value as the
         empty list — still meaning everywhere, with the UI now claiming
         otherwise. Seed it with the first country the editor may use. */
      onChange([scoped ? allowed[0] : COUNTRIES[0].code]);
    }
  };

  const toggle = (code, on) => {
    const next = on ? [...value, code] : value.filter((c) => c !== code);
    /* Unticking the last one would silently mean "everywhere". Refuse it —
       there is already an explicit control for that above. */
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
