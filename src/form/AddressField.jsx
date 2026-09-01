import { useEffect, useRef, useState } from "react";
import { IconMapPin, IconSearch, IconX } from "@tabler/icons-react";
import { api, query } from "../lib/api.js";
import { Field, Input } from "../ui/form.jsx";
import { Button } from "../ui/Button.jsx";
import { cx } from "../lib/cx.js";

/* The address, searched rather than typed — picking a result fills the
   address AND the coordinates together, which is the whole point. Nobody
   should be hunting a latitude by hand.

   ⚠ It writes TWO fields, so it takes `onPatch` rather than `onChange` — the
   same reason MediaField does. `coords` is never edited directly any more;
   CoordsField renders what was picked, read-only.

   ⚠ Typing freely still works and is not second-class. A venue the geocoder
   has never heard of is a normal case, especially for a community hall — the
   site then searches the address text for its map, exactly as it did before
   this field existed. */

const DEBOUNCE_MS = 350;

export default function AddressField({ field, form, error, onPatch }) {
  const value = form?.[field.name] ?? "";
  const coords = form?.coords ?? null;

  const [term, setTerm] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const boxRef = useRef(null);

  /* Close on an outside click, like every other panel in here. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Debounced, and the previous request is dropped rather than raced — page
     three of a search must not land after page four. */
  useEffect(() => {
    const q = term.trim();
    if (q.length < 3) {
      setItems([]);
      setSearched(false);
      return undefined;
    }

    let live = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const country = form?.countries?.[0] ?? "";
        const res = await api.get(`/api/admin/places${query({ q, country })}`);
        if (!live) return;
        setItems(res.items ?? []);
        setSearched(true);
        setOpen(true);
      } catch {
        /* An assist that failed. Say nothing loud — the box below still
           takes a typed address. */
        if (live) {
          setItems([]);
          setSearched(true);
        }
      } finally {
        if (live) setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term, form?.countries]);

  const choose = (place) => {
    onPatch({ [field.name]: place.address, coords: place.coords });
    setTerm("");
    setItems([]);
    setOpen(false);
    setSearched(false);
  };

  return (
    <div className="flex flex-col gap-2" ref={boxRef}>
      <Field
        label={field.label ?? "Address"}
        hint={field.hint}
        error={error}
        className="[&>*]:mb-0"
      >
        {() => (
          <div className="relative">
            <IconSearch
              size={15}
              stroke={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onFocus={() => items.length && setOpen(true)}
              placeholder="Search for the venue or address…"
              spellCheck={false}
              autoComplete="off"
              className="pl-9"
            />

            {open && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
                {items.length === 0 ? (
                  <p className="px-3.5 py-3 text-[13px] text-fg-subtle">
                    {busy
                      ? "Searching…"
                      : searched
                        ? "Nothing found. Type the address in the box below instead."
                        : "Keep typing…"}
                  </p>
                ) : (
                  <ul className="max-h-[260px] overflow-y-auto">
                    {items.map((place) => (
                      <li key={place.id}>
                        <button
                          type="button"
                          onClick={() => choose(place)}
                          className={cx(
                            "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left",
                            "transition-colors hover:bg-canvas"
                          )}
                        >
                          <IconMapPin
                            size={15}
                            stroke={1.8}
                            className="mt-0.5 flex-none text-fg-subtle"
                          />
                          <span className="min-w-0">
                            {place.name && (
                              <span className="block truncate text-[13px] font-medium text-fg">
                                {place.name}
                              </span>
                            )}
                            <span className="block truncate text-[12px] text-fg-muted">
                              {place.address}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Field>

      {/* What is actually stored. Editable, because a venue the geocoder does
          not know still needs an address — picking a result just fills it. */}
      <Input
        value={value}
        onChange={(e) => onPatch({ [field.name]: e.target.value })}
        placeholder="Or type the address here"
        aria-label="The stored address"
      />

      <div className="flex items-center gap-2">
        {coords?.length === 2 ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded bg-canvas px-2 py-1 text-[12px] text-fg-muted">
              <IconMapPin size={13} stroke={1.8} />
              {coords[0]}, {coords[1]}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onPatch({ coords: null })}
            >
              <IconX size={13} stroke={1.8} />
              Clear the pin
            </Button>
          </>
        ) : (
          <span className="text-[12px] text-fg-subtle">
            No exact pin — the map will search the address text.
          </span>
        )}
      </div>
    </div>
  );
}
