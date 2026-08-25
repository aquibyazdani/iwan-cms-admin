import {
  IconAbc,
  IconAlignLeft,
  IconUser,
  IconMail,
  IconPhone,
  IconHash,
  IconCalendar,
  IconCircleDot,
  IconCheckbox,
  IconChevronDown,
  IconShieldCheck,
} from "@tabler/icons-react";

/* Every question type the builder can add.

   ⚠ `type` must match FIELD_TYPES in the API's src/models/formField.js. A type
   offered here that the API does not know is a save that fails after the editor
   has done the work — the worst moment to find out.

   `defaults` is what a newly-added question starts as. The point is that the
   common case needs no configuring: adding "E-mail" should produce a usable
   e-mail question, not an empty one to fill in. */
export const FIELD_TYPES = [
  {
    type: "name",
    label: "Name",
    hint: "First and last, in two boxes",
    icon: IconUser,
    defaults: { label: "Your full name", required: true },
  },
  {
    type: "email",
    label: "E-mail",
    hint: "Checked for an @",
    icon: IconMail,
    defaults: {
      label: "E-mail",
      required: true,
      placeholder: "ex: myname@example.com",
    },
  },
  {
    type: "phone",
    label: "Phone",
    icon: IconPhone,
    defaults: { label: "Phone", placeholder: "(000) 000-0000" },
  },
  {
    type: "text",
    label: "Short text",
    hint: "One line",
    icon: IconAbc,
    defaults: { label: "Question" },
  },
  {
    type: "textarea",
    label: "Long text",
    hint: "A paragraph",
    icon: IconAlignLeft,
    defaults: { label: "Anything we should know?" },
  },
  {
    type: "radio",
    label: "Choose one",
    hint: "Radio buttons",
    icon: IconCircleDot,
    defaults: {
      label: "Pick one",
      required: true,
      options: [{ label: "Yes" }, { label: "No" }],
    },
  },
  {
    type: "checkboxes",
    label: "Choose any",
    hint: "Tick boxes",
    icon: IconCheckbox,
    defaults: {
      label: "Pick any that apply",
      options: [{ label: "First option" }, { label: "Second option" }],
    },
  },
  {
    type: "select",
    label: "Dropdown",
    hint: "For long lists",
    icon: IconChevronDown,
    defaults: {
      label: "Choose one",
      options: [{ label: "First option" }, { label: "Second option" }],
    },
  },
  {
    type: "number",
    label: "Number",
    icon: IconHash,
    defaults: { label: "How many?" },
  },
  {
    type: "date",
    label: "Date",
    icon: IconCalendar,
    defaults: { label: "Which date?" },
  },
  {
    type: "consent",
    label: "Agreement",
    hint: "Must be ticked",
    icon: IconShieldCheck,
    defaults: {
      label: "I agree to follow all safety rules",
      /* ⚠ Always required — an agreement nobody has to give is not an
         agreement. The builder hides the toggle for this type. */
      required: true,
    },
  },
];

export const CHOICE_TYPES = ["radio", "checkboxes", "select"];

/* Types with a box to type into, and therefore a placeholder worth setting. */
export const PLACEHOLDER_TYPES = ["text", "textarea", "email", "phone", "number"];

export const typeInfo = (type) =>
  FIELD_TYPES.find((t) => t.type === type) ?? {
    type,
    label: type,
    icon: IconAbc,
    defaults: {},
  };

/* A question's key is what its ANSWERS will be stored against, so it is derived
   from the label once and then left alone — see the note in the API's
   models/formField.js. Underscores rather than hyphens: these read as data
   column names more often than as URLs. */
export const keyFromLabel = (label = "") =>
  label
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)
    .replace(/_+$/g, "") || "question";

/* Makes `key` unique against the keys already in the form, by adding _2, _3…
   ⚠ Two questions sharing a key means one answer overwrites the other, which
   the API refuses — but it should never get that far from the builder. */
export const uniqueKey = (base, taken) => {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
};

export const newField = (type, taken = []) => {
  const info = typeInfo(type);
  const defaults = info.defaults ?? {};
  return {
    key: uniqueKey(keyFromLabel(defaults.label ?? info.label), taken),
    type,
    label: defaults.label ?? "",
    help: defaults.help ?? "",
    placeholder: defaults.placeholder ?? "",
    required: Boolean(defaults.required),
    options: defaults.options ? defaults.options.map((o) => ({ ...o })) : [],
  };
};
