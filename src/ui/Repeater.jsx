import { useRef } from "react";
import {
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import { Button } from "./Button.jsx";
import { cx } from "../lib/cx.js";

/* An ordered list of rows an editor can add to, remove from and reorder — the
   event agenda and the blog body are both this shape.

   Reordering is buttons, not drag-and-drop. Drag would need a pointer, a
   keyboard fallback and a touch fallback to be usable by everyone; two arrows
   are all three at once, and these lists are short.

   ⚠ Rows are keyed by a STABLE id held alongside the value, not by index. Keyed
   by index, removing the second of five rows makes React reuse row 3's DOM node
   for row 2 — every input below the deletion keeps the previous row's focus,
   selection and IME state, and the field an editor is typing into changes
   underneath them. */
export function Repeater({
  value = [],
  onChange,
  renderRow,
  newRow,
  addLabel = "Add row",
  emptyLabel = "Nothing here yet.",
  max = 100,
}) {
  /* A WeakMap would be cleaner but the row objects are replaced on every
     keystroke. An incrementing counter paired with a parallel id list survives
     that, because ids move with the rows rather than with the objects. */
  const ids = useRef([]);
  const nextId = useRef(0);

  /* Keep the id list the same length as the value list — rows can arrive from
     the server, from an add, or from a remove. */
  while (ids.current.length < value.length) ids.current.push((nextId.current += 1));
  if (ids.current.length > value.length) ids.current.length = value.length;

  const update = (index, next) => {
    onChange(value.map((row, i) => (i === index ? next : row)));
  };

  const remove = (index) => {
    ids.current = ids.current.filter((_, i) => i !== index);
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index, delta) => {
    const to = index + delta;
    if (to < 0 || to >= value.length) return;

    const swap = (list) => {
      const copy = [...list];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    };

    ids.current = swap(ids.current);
    onChange(swap(value));
  };

  const add = () => {
    if (value.length >= max) return;
    ids.current = [...ids.current, (nextId.current += 1)];
    onChange([...value, newRow()]);
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-3.5 py-4 text-center text-[12.5px] text-fg-subtle">
          {emptyLabel}
        </p>
      )}

      {value.map((row, index) => (
        <div
          key={ids.current[index]}
          className="flex items-start gap-2 rounded-lg border border-line bg-canvas p-2.5"
        >
          <span
            aria-hidden="true"
            className="mt-2 shrink-0 text-fg-subtle"
            title={`Row ${index + 1}`}
          >
            <IconGripVertical size={14} stroke={1.6} />
          </span>

          <div className="min-w-0 flex-1">
            {renderRow(row, (next) => update(index, next), index)}
          </div>

          <div className="flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Move row ${index + 1} up`}
              className={cx(
                "rounded p-1 text-fg-subtle transition-colors",
                "hover:bg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-30"
              )}
            >
              <IconChevronUp size={14} stroke={2} />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === value.length - 1}
              aria-label={`Move row ${index + 1} down`}
              className={cx(
                "rounded p-1 text-fg-subtle transition-colors",
                "hover:bg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-30"
              )}
            >
              <IconChevronDown size={14} stroke={2} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => remove(index)}
            aria-label={`Remove row ${index + 1}`}
            className="mt-0.5 shrink-0 rounded p-1.5 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash size={14} stroke={1.8} />
          </button>
        </div>
      ))}

      <div>
        <Button size="sm" onClick={add} disabled={value.length >= max}>
          <IconPlus size={14} stroke={2} />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export default Repeater;
