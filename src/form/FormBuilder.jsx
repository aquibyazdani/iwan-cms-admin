import { useRef, useState } from "react";
import {
  IconGripVertical,
  IconTrash,
  IconCopy,
  IconChevronUp,
  IconChevronDown,
  IconPlus,
  IconAsterisk,
  IconX,
} from "@tabler/icons-react";
import { Input, Select } from "../ui/form.jsx";
import { Alert } from "../ui/feedback.jsx";
import { cx } from "../lib/cx.js";
import {
  FIELD_TYPES,
  CHOICE_TYPES,
  PLACEHOLDER_TYPES,
  typeInfo,
  keyFromLabel,
  uniqueKey,
  newField,
} from "./fieldTypes.js";

/* The registration form builder.

   Reordering works two ways on purpose: dragging is what people reach for, the
   arrows are what make it work from a keyboard, on a touch screen, and for
   anyone who finds a precise drag hard.

   ⚠ Rows are keyed by their `key`, not by index. Keying by index makes removing
   the second of five rows reuse row 3's DOM node for row 2, so every input
   below the deletion keeps the previous row's cursor position. */

const ROW = cx(
  "rounded-lg border bg-surface transition-[border-color,box-shadow] duration-150"
);

function OptionList({ options, onChange }) {
  const add = () => onChange([...options, { label: "" }]);
  const set = (i, label) => onChange(options.map((o, j) => (j === i ? { label } : o)));
  const remove = (i) => onChange(options.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((option, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full border-2 border-line-strong"
          />
          <Input
            value={option.label}
            onChange={(e) => set(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            aria-label={`Option ${i + 1}`}
            className="h-8 text-[13px]"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            /* ⚠ The API refuses a choice with no options, so the last one is
               disabled rather than allowed to fail on save. */
            disabled={options.length <= 1}
            aria-label={`Remove option ${i + 1}`}
            title={options.length <= 1 ? "A choice needs at least one option" : "Remove"}
            className="shrink-0 rounded p-1 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
          >
            <IconX size={13} stroke={2} />
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          onClick={add}
          className="text-[12.5px] font-medium text-accent hover:underline"
        >
          + Add option
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  index,
  total,
  taken,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  dragging,
  dragProps,
}) {
  const info = typeInfo(field.type);
  const Icon = info.icon;
  const [open, setOpen] = useState(false);

  const set = (patch) => onChange({ ...field, ...patch });

  /* ⚠ The key follows the label only while it still LOOKS derived from it.
     Deriving that from the values rather than a "user touched it" flag is what
     makes it survive a reload — a flag resets on reopen, and the key would
     start following the label again on a question someone had set by hand. */
  const setLabel = (label) => {
    const derived = keyFromLabel(field.label);
    const stillDerived =
      field.key === derived || field.key.replace(/_\d+$/, "") === derived;

    if (!stillDerived) return set({ label });
    return set({ label, key: uniqueKey(keyFromLabel(label), taken) });
  };

  return (
    <div
      {...dragProps}
      className={cx(
        ROW,
        dragging ? "border-accent opacity-40" : "border-line",
        "hover:border-line-strong"
      )}
    >
      <div className="flex items-start gap-2 p-2.5">
        {/* The grip is the handle, or selecting text in an input starts a
            drag. */}
        <span
          data-drag-handle
          aria-hidden="true"
          className="mt-1.5 cursor-grab text-fg-subtle active:cursor-grabbing"
          title="Drag to reorder"
        >
          <IconGripVertical size={15} stroke={1.6} />
        </span>

        <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded bg-muted text-fg-muted">
          <Icon size={13} stroke={1.8} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Input
              value={field.label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ask a question…"
              aria-label={`Question ${index + 1}`}
              className="h-8 font-medium"
            />
            {field.type !== "consent" && (
              <button
                type="button"
                onClick={() => set({ required: !field.required })}
                aria-pressed={field.required}
                title={field.required ? "Required" : "Optional"}
                className={cx(
                  "grid h-8 w-8 shrink-0 place-items-center rounded border transition-colors",
                  field.required
                    ? "border-danger/30 bg-danger-soft text-danger"
                    : "border-line text-fg-subtle hover:border-line-strong hover:text-fg"
                )}
              >
                <IconAsterisk size={13} stroke={2.4} />
              </button>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-fg-subtle">
            <span>{info.label}</span>
            <span className="font-mono">{field.key}</span>
            {field.type === "consent" ? (
              <span className="text-warn">always required</span>
            ) : (
              field.required && <span className="text-danger">required</span>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="font-medium text-accent hover:underline"
            >
              {open ? "Done" : "Settings"}
            </button>
          </div>

          {open && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-line bg-canvas p-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-fg">Type</span>
                <Select
                  value={field.type}
                  onChange={(e) => {
                    const next = e.target.value;
                    /* Changing type keeps the label and key — it is the same
                       question — but options only survive on types that have
                       them. */
                    set({
                      type: next,
                      options: CHOICE_TYPES.includes(next)
                        ? field.options.length
                          ? field.options
                          : [{ label: "Yes" }, { label: "No" }]
                        : [],
                      required: next === "consent" ? true : field.required,
                    });
                  }}
                  className="h-8 text-[13px]"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-fg">Help text</span>
                <Input
                  value={field.help}
                  onChange={(e) => set({ help: e.target.value })}
                  placeholder="The small grey line under the box"
                  className="h-8 text-[13px]"
                />
              </label>

              {PLACEHOLDER_TYPES.includes(field.type) && (
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-fg">Placeholder</span>
                  <Input
                    value={field.placeholder}
                    onChange={(e) => set({ placeholder: e.target.value })}
                    placeholder="Greyed text inside the box"
                    className="h-8 text-[13px]"
                  />
                </label>
              )}

              {CHOICE_TYPES.includes(field.type) && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-fg">Options</span>
                  <OptionList
                    options={field.options}
                    onChange={(options) => set({ options })}
                  />
                </div>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-fg">Key</span>
                <Input
                  value={field.key}
                  onChange={(e) => set({ key: keyFromLabel(e.target.value) })}
                  className="h-8 font-mono text-[12.5px]"
                />
                {/* ⚠ Answers are filed under this, so changing it after
                    registrations exist orphans every one collected. */}
                <span className="text-[11.5px] text-fg-subtle">
                  What answers are stored under. Changing it later loses the link to
                  answers already collected.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label={`Move question ${index + 1} up`}
            className="rounded p-1 text-fg-subtle transition-colors hover:bg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronUp size={13} stroke={2} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label={`Move question ${index + 1} down`}
            className="rounded p-1 text-fg-subtle transition-colors hover:bg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronDown size={13} stroke={2} />
          </button>
        </div>

        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            aria-label={`Duplicate question ${index + 1}`}
            className="rounded p-1 text-fg-subtle transition-colors hover:bg-muted hover:text-fg"
          >
            <IconCopy size={13} stroke={1.8} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove question ${index + 1}`}
            className="rounded p-1 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash size={13} stroke={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormBuilder({ value = [], onChange, error }) {
  const fields = value ?? [];
  const taken = fields.map((f) => f.key);

  const ids = useRef([]);
  const nextId = useRef(0);
  while (ids.current.length < fields.length) ids.current.push((nextId.current += 1));
  if (ids.current.length > fields.length) ids.current.length = fields.length;

  /* Native HTML5 drag rather than a library — one vertical list is not worth
     30KB, and the arrows cover what drag does not. */
  const [dragIndex, setDragIndex] = useState(null);
  const overIndex = useRef(null);

  const move = (from, delta) => {
    const to = from + delta;
    if (to < 0 || to >= fields.length) return;
    const swap = (list) => {
      const copy = [...list];
      [copy[from], copy[to]] = [copy[to], copy[from]];
      return copy;
    };
    ids.current = swap(ids.current);
    onChange(swap(fields));
  };

  const moveTo = (from, to) => {
    if (from === to || to == null) return;
    const reorder = (list) => {
      const copy = [...list];
      const [row] = copy.splice(from, 1);
      copy.splice(to, 0, row);
      return copy;
    };
    ids.current = reorder(ids.current);
    onChange(reorder(fields));
  };

  const add = (type) => {
    ids.current = [...ids.current, (nextId.current += 1)];
    onChange([...fields, newField(type, taken)]);
  };

  const duplicate = (i) => {
    const copy = {
      ...fields[i],
      key: uniqueKey(fields[i].key, taken),
      options: fields[i].options.map((o) => ({ ...o })),
    };
    /* A new row, so a new id — two rows on one key is the bug this avoids. */
    const nextIds = [...ids.current];
    nextIds.splice(i + 1, 0, (nextId.current += 1));
    ids.current = nextIds;

    const next = [...fields];
    next.splice(i + 1, 0, copy);
    onChange(next);
  };

  const remove = (i) => {
    ids.current = ids.current.filter((_, j) => j !== i);
    onChange(fields.filter((_, j) => j !== i));
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert>{error}</Alert>}

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[13.5px] font-medium text-fg">No registration form yet</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[12.5px] text-fg-muted">
            An event cannot be published without one. Add the questions people answer when
            they sign up.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field, i) => (
            <FieldRow
              key={ids.current[i]}
              field={field}
              index={i}
              total={fields.length}
              taken={taken.filter((_, j) => j !== i)}
              onChange={(next) => onChange(fields.map((f, j) => (j === i ? next : f)))}
              onRemove={remove}
              onDuplicate={duplicate}
              onMove={move}
              dragging={dragIndex === i}
              dragProps={{
                draggable: true,
                onDragStart: (e) => {
                  /* ⚠ Only from the grip, or selecting text starts a drag. */
                  if (!e.target.closest?.("[data-drag-handle]")) {
                    e.preventDefault();
                    return;
                  }
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                  /* Firefox will not drag without data set. */
                  e.dataTransfer.setData("text/plain", String(i));
                },
                onDragOver: (e) => {
                  e.preventDefault();
                  overIndex.current = i;
                },
                onDragEnd: () => {
                  moveTo(dragIndex, overIndex.current);
                  setDragIndex(null);
                  overIndex.current = null;
                },
              }}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border border-line bg-canvas p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
          Add a question
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FIELD_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => add(t.type)}
              title={t.hint}
              className={cx(
                "inline-flex items-center gap-1.5 rounded border border-line bg-surface",
                "px-2.5 py-1.5 text-[12.5px] font-medium text-fg-muted",
                "transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
              )}
            >
              <t.icon size={13} stroke={1.8} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {fields.length > 0 && (
        <p className="text-[12px] text-fg-subtle">
          <IconPlus size={11} stroke={2} className="inline" /> Drag the handle to reorder,
          or use the arrows.
        </p>
      )}
    </div>
  );
}

export default FormBuilder;
