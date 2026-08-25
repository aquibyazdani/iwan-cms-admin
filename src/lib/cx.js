/* Joins class names, dropping anything falsy, so a conditional class can be
   written inline as `cond && "…"` without leaving "false" in the attribute.
   Same helper, same name, as the public site's src/lib/cx.js. */
export const cx = (...parts) => parts.filter(Boolean).join(" ");

export default cx;
