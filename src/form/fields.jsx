import { useEffect, useState } from "react";
import { Field, Input, Textarea, Select, SegmentedControl } from "../ui/form.jsx";
import { CountryPicker } from "../ui/CountryPicker.jsx";
import { Repeater } from "../ui/Repeater.jsx";
import { RichText } from "../ui/RichText.jsx";
import { FormBuilder } from "./FormBuilder.jsx";
import { slugify, isValidSlug } from "../lib/slug.js";
import { cx } from "../lib/cx.js";

/* One renderer per field kind, called by ResourceForm as it walks a resource's
   spec — which is why adding a content type is a config entry rather than a new
   form component. Every renderer takes the spec, the value, an onChange and the
   API's error for that field. */

const WIDTHS = {
  full: "sm:col-span-6",
  half: "sm:col-span-3",
  third: "sm:col-span-2",
};

export const widthClass = (width = "full") => WIDTHS[width] ?? WIDTHS.full;

/* Follows the title while the document is NEW, stops once it is saved or
   edited by hand.

   ⚠ Changing a slug changes a published URL and breaks every link to it; on a
   promo it also re-shows the campaign to everyone who dismissed it. Neither
   should happen by accident from typing in the title box, so it locks behind a
   deliberate "Edit". */
function SlugField({ field, value, onChange, error, form, isNew }) {
  const [unlocked, setUnlocked] = useState(false);
  const [touched, setTouched] = useState(false);

  const source = form[field.source ?? "title"] ?? "";

  useEffect(() => {
    if (!isNew || touched) return;
    onChange(slugify(source));
    /* `onChange` is a new value every render, so depending on it re-runs this
       on every keystroke anywhere in the form. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, isNew, touched]);

  const editable = isNew || unlocked;
  const shape = value && !isValidSlug(value) ? "Lowercase words joined by hyphens" : null;

  return (
    <Field
      label="Slug"
      required
      error={error ?? shape}
      hint={
        field.hint ??
        (editable
          ? "The address on the public site — /events/your-slug."
          : "Changing this changes the public URL and breaks existing links.")
      }
    >
      {(props) => (
        <div className="flex gap-2">
          <Input
            {...props}
            value={value ?? ""}
            disabled={!editable}
            spellCheck={false}
            onChange={(e) => {
              setTouched(true);
              /* Slugified on the way in — a typed space should become a
                 hyphen, not a red line. */
              onChange(slugify(e.target.value));
            }}
            className="font-mono text-[13px]"
          />
          {!isNew && !unlocked && (
            <button
              type="button"
              onClick={() => setUnlocked(true)}
              className="shrink-0 rounded border border-line bg-surface px-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

/* Seconds, typed as "348" or "5:48". ⚠ Keeps its own text state rather than
   deriving the value from the number each render: mid-typing "5:" is not a
   valid duration, and rewriting it to "5:00" makes the field untypeable. */
function DurationField({ field, value, onChange, error }) {
  const asText = (seconds) => {
    if (!Number.isFinite(seconds)) return "";
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const [text, setText] = useState(() => asText(value));

  const parse = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.includes(":")) {
      const [m, s] = trimmed.split(":");
      const minutes = Number(m);
      const seconds = Number(s);
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
      return minutes * 60 + seconds;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  return (
    <Field label={field.label} hint={field.hint} error={error}>
      {(props) => (
        <Input
          {...props}
          value={text}
          placeholder="5:48"
          inputMode="numeric"
          onChange={(e) => {
            setText(e.target.value);
            onChange(parse(e.target.value));
          }}
          /* Canonicalise to mm:ss once the field is left. */
          onBlur={() => setText(asText(parse(text)))}
          className="font-mono"
        />
      )}
    </Field>
  );
}

function CoordsField({ field, value, onChange, error }) {
  const [lat, lng] = value ?? ["", ""];

  const set = (index, raw) => {
    const next = [...(value ?? ["", ""])];
    next[index] = raw === "" ? "" : Number(raw);

    /* Both blank is null, not [NaN, NaN] — the site then searches the address
       text instead. */
    if (next[0] === "" && next[1] === "") return onChange(null);
    onChange(next);
  };

  return (
    <Field label={field.label} hint={field.hint} error={error}>
      {() => (
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={lat === "" || lat === undefined ? "" : lat}
            onChange={(e) => set(0, e.target.value)}
            placeholder="Latitude"
            inputMode="decimal"
            aria-label="Latitude"
          />
          <Input
            value={lng === "" || lng === undefined ? "" : lng}
            onChange={(e) => set(1, e.target.value)}
            placeholder="Longitude"
            inputMode="decimal"
            aria-label="Longitude"
          />
        </div>
      )}
    </Field>
  );
}

function AgendaField({ value, onChange, error }) {
  return (
    <Field error={error}>
      {() => (
        <Repeater
          value={value ?? []}
          onChange={onChange}
          newRow={() => ({ time: "", label: "" })}
          addLabel="Add a row"
          emptyLabel="No running order — the site leaves that block out entirely."
          max={40}
          renderRow={(row, update) => (
            <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
              <Input
                value={row.time ?? ""}
                onChange={(e) => update({ ...row, time: e.target.value })}
                placeholder="18:30"
                aria-label="Time"
                className="font-mono text-[13px]"
              />
              <Input
                value={row.label ?? ""}
                onChange={(e) => update({ ...row, label: e.target.value })}
                placeholder="Doors open, tea and settling in"
                aria-label="What happens"
              />
            </div>
          )}
        />
      )}
    </Field>
  );
}

const BLOCK_KINDS = [
  { value: "h", label: "Heading" },
  { value: "p", label: "Paragraph" },
  { value: "li", label: "Bullet" },
];

function BlocksField({ value, onChange, error }) {
  return (
    <Field error={error}>
      {() => (
        <Repeater
          value={value ?? []}
          onChange={onChange}
          newRow={() => ({ kind: "p", text: "" })}
          addLabel="Add a block"
          emptyLabel="No body yet — add a heading, a paragraph or a bullet."
          max={400}
          renderRow={(row, update) => (
            <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
              <Select
                value={row.kind ?? "p"}
                onChange={(e) => update({ ...row, kind: e.target.value })}
                aria-label="Block kind"
              >
                {BLOCK_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
              <Textarea
                value={row.text ?? ""}
                rows={row.kind === "p" ? 3 : 2}
                onChange={(e) => update({ ...row, text: e.target.value })}
                aria-label="Text"
              />
            </div>
          )}
        />
      )}
    </Field>
  );
}

function CtaField({ value, onChange, error }) {
  const cta = value ?? { label: "", to: "/" };

  return (
    <Field
      label="Button"
      error={error}
      hint="The link is an in-app path like /events — the pop-up closes itself and the site navigates."
    >
      {() => (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={cta.label ?? ""}
            onChange={(e) => onChange({ ...cta, label: e.target.value })}
            placeholder="See what's on"
            aria-label="Button label"
          />
          <Input
            value={cta.to ?? ""}
            onChange={(e) => onChange({ ...cta, to: e.target.value })}
            placeholder="/events"
            aria-label="Button link"
            className="font-mono text-[13px]"
          />
        </div>
      )}
    </Field>
  );
}

export function renderField({
  field,
  value,
  onChange,
  error,
  form,
  isNew,
  meta,
  allowedCountries,
}) {
  const common = {
    label: field.label,
    hint: field.hint,
    error,
    required: field.required,
  };

  switch (field.kind) {
    case "slug":
      return (
        <SlugField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          form={form}
          isNew={isNew}
        />
      );

    case "textarea":
      return (
        <Field {...common}>
          {(props) => (
            <Textarea
              {...props}
              rows={field.rows ?? 4}
              value={value ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );

    case "number":
      return (
        <Field {...common}>
          {(props) => (
            <Input
              {...props}
              type="number"
              value={value ?? ""}
              placeholder={field.placeholder}
              onChange={(e) =>
                /* Blank is null, not 0 — "no limit" and "nobody may come" are
                   different things. */
                onChange(e.target.value === "" ? null : Number(e.target.value))
              }
            />
          )}
        </Field>
      );

    case "date":
      return (
        <Field {...common}>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );

    case "time":
      return (
        <Field {...common}>
          {(props) => (
            <Input
              {...props}
              type="time"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );

    case "url":
      return (
        <Field {...common}>
          {(props) => (
            <Input
              {...props}
              type="url"
              inputMode="url"
              spellCheck={false}
              value={value ?? ""}
              placeholder={field.placeholder ?? "https://"}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );

    case "programme":
      return (
        <Field
          label={field.label ?? "Programme"}
          error={error}
          hint={
            field.hint ??
            "Which programme this belongs to, or leave it open to the whole community."
          }
        >
          {(props) => (
            <Select
              {...props}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value || null)}
            >
              <option value="">Open to all</option>
              {meta.programmes.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );

    case "status":
      return (
        <Field label="Status" error={error}>
          {() => (
            <SegmentedControl
              value={value ?? "draft"}
              onChange={onChange}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
              ]}
            />
          )}
        </Field>
      );

    case "countries":
      return (
        <Field label={field.label ?? "Countries"} error={error}>
          {() => (
            <CountryPicker
              value={value ?? []}
              onChange={onChange}
              allowed={allowedCountries}
            />
          )}
        </Field>
      );

    case "duration":
      return (
        <DurationField field={field} value={value} onChange={onChange} error={error} />
      );

    case "coords":
      return (
        <CoordsField field={field} value={value} onChange={onChange} error={error} />
      );

    case "agenda":
      return <AgendaField value={value} onChange={onChange} error={error} />;

    case "blocks":
      return <BlocksField value={value} onChange={onChange} error={error} />;

    case "form":
      return (
        <Field label={field.label} hint={field.hint} error={error}>
          {() => <FormBuilder value={value ?? []} onChange={onChange} />}
        </Field>
      );

    case "html":
      return (
        <Field label={field.label} hint={field.hint} error={error}>
          {() => (
            <RichText value={value ?? ""} onChange={onChange} invalid={Boolean(error)} />
          )}
        </Field>
      );

    case "cta":
      return <CtaField value={value} onChange={onChange} error={error} />;

    case "text":
    default:
      return (
        <Field {...common}>
          {(props) => (
            <Input
              {...props}
              value={value ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
  }
}

export const fieldWidth = (field) => cx(widthClass(field.width));
