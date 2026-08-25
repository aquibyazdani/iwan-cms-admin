/* The slug is a document's public identity — /events/<slug> on the site, and
   the key a dismissed promo is remembered under. It has to match the API's
   `^[a-z0-9]+(?:-[a-z0-9]+)*$`, so this is the same rule expressed once for the
   form to apply as-you-type. */
export const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    /* Strip accents rather than dropping the letters underneath them, so
       "Ramadân" becomes "ramadan" and not "ramadn". The escape is spelled out
       rather than written as literal combining marks — those are invisible in
       an editor and the first thing a well-meaning reformat destroys. */
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    /* Anything that is not a letter or a number becomes a hyphen — which is
       what turns an emoji or a curly apostrophe in a title into a break rather
       than a hole. Several of the live site's post titles carry both. */
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    /* The slice can land on a trailing hyphen. */
    .replace(/-+$/g, "");

export const isValidSlug = (value = "") => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export default slugify;
