import { useEffect, useRef, useState } from "react";
import { IconColumns3, IconCheck } from "@tabler/icons-react";
import { cx } from "../lib/cx.js";

/* Which of an event's questions appear as columns. "Show every answer" does not
   scale — a twelve-question form is a 3,700px table in a 1,100px window — and
   everything stays available in the detail panel and the CSV. */
export function ColumnPicker({ columns, selected, onChange, label = "Columns" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* ⚠ `mousedown` rather than `click`: a click listener fires after the
     button's own handler, so choosing a column closes and reopens the
     panel. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (columns.length === 0) return null;

  const toggle = (key) =>
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cx(
          "inline-flex h-9 items-center gap-2 rounded border px-3 text-[13px] font-medium",
          "transition-colors duration-150",
          open
            ? "border-line-strong bg-muted text-fg"
            : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"
        )}
      >
        <IconColumns3 size={15} stroke={1.8} />
        {label}
        <span className="text-fg-subtle">
          {selected.length}/{columns.length}
        </span>
      </button>

      {open && (
        <div
          className={cx(
            "absolute right-0 z-20 mt-1.5 w-[280px] animate-in overflow-hidden",
            "rounded-lg border border-line bg-surface shadow-pop"
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Show as columns
            </span>
            <button
              type="button"
              onClick={() =>
                onChange(
                  selected.length === columns.length ? [] : columns.map((c) => c.key)
                )
              }
              className="text-[12px] font-medium text-accent hover:underline"
            >
              {selected.length === columns.length ? "None" : "All"}
            </button>
          </div>

          {/* Capped, or a long form runs off the screen. */}
          <div className="max-h-[320px] overflow-y-auto py-1">
            {columns.map((c) => {
              const on = selected.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={cx(
                    "flex w-full items-start gap-2.5 px-3 py-1.5 text-left text-[13px]",
                    "transition-colors hover:bg-muted",
                    on ? "text-fg" : "text-fg-muted"
                  )}
                >
                  <span
                    className={cx(
                      "mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded border",
                      on ? "border-accent bg-accent text-white" : "border-line-strong"
                    )}
                  >
                    {on && <IconCheck size={11} stroke={3} />}
                  </span>
                  <span className="min-w-0 flex-1 leading-[1.4]">{c.label}</span>
                </button>
              );
            })}
          </div>

          <p className="border-t border-line bg-canvas px-3 py-2 text-[11.5px] leading-[1.45] text-fg-subtle">
            Every answer is always in the row detail and the CSV — this only changes the
            table.
          </p>
        </div>
      )}
    </div>
  );
}

export default ColumnPicker;
