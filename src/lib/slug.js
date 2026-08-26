/* A document's public identity. Must match the API's
   `^[a-z0-9]+(?:-[a-z0-9]+)*$` — the same rule, applied as-you-type. */
export const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    /* Strip accents, not the letters under them: "Ramadân" → "ramadan", not
       "ramadn". ⚠ Escaped rather than written as literal combining marks —
       those are invisible and the first thing a reformat destroys. */
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    /* Non-alphanumerics become hyphens, so an emoji or a curly apostrophe is a
       break rather than a hole. Live post titles carry both. */
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    /* The slice can land on a hyphen. */
    .replace(/-+$/g, "");

export const isValidSlug = (value = "") => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export default slugify;
