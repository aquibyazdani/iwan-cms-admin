import { useEffect, useRef, useState } from "react";
import { cx } from "../lib/cx.js";
import { Button } from "./Button.jsx";

/* A real <table>, not a grid of divs — the rows are tabular data, and a table
   is what gives a screen reader the column headers to read each cell against.

   ⚠ It is wrapped in its own `overflow-x-auto` container. A wide table must
   scroll inside itself; letting it widen the page instead breaks the sidebar
   layout and puts a horizontal scrollbar on the whole document.

   ⚠ That wrapper MUST be `relative`, and this is not cosmetic. `overflow`
   does not clip an absolutely-positioned descendant whose containing block is
   an ancestor of the scroll container — and Tailwind's `sr-only` is
   `position: absolute`. The visually-hidden "Actions" label in the last header
   cell therefore escaped the scroll box, landed at x≈750 in PAGE coordinates,
   and gave the whole document 363px of horizontal scroll at 390px wide. The
   table itself was innocent and scrolling correctly the entire time.
   `relative` makes this element the containing block, so the clip applies. */
export function Table({ children, className }) {
  const ref = useRef(null);
  /* Which edges have content beyond them, so the fades below can show only on
     the side there is actually more to see. */
  const [edges, setEdges] = useState({ left: false, right: false });

  /* ⚠ A table that scrolls sideways but does not LOOK like it is a table whose
     extra columns nobody finds. The fades are the affordance; without them the
     rightmost visible column looks like the last one.

     Recomputed on scroll, on resize, and whenever the children change — the
     registrations table gains and loses columns as the picker is used, and a
     stale measurement would leave a fade over nothing. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setEdges({
        left: scrollLeft > 2,
        /* -2 rather than 0: sub-pixel layout means a fully scrolled element is
           often a fraction short, which would leave the fade on for ever. */
        right: scrollLeft < scrollWidth - clientWidth - 2,
      });
    };

    measure();
    el.addEventListener("scroll", measure, { passive: true });

    /* Catches both the window resizing and the table itself changing width. */
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div className="relative">
      <div ref={ref} className="relative w-full overflow-x-auto">
        <table
          className={cx("w-full min-w-[640px] border-collapse text-left", className)}
        >
          {children}
        </table>
      </div>

      {/* ⚠ `pointer-events-none`, or these would swallow clicks on the first
          and last columns — which is where the row link and the delete button
          live. */}
      {edges.left && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent"
        />
      )}
      {edges.right && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent"
        />
      )}
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="border-b border-line bg-canvas">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className, ...rest }) {
  return (
    <th
      scope="col"
      className={cx(
        "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle",
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({ children, className, ...rest }) {
  return (
    <tr className={cx("transition-colors hover:bg-canvas", className)} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ children, className, ...rest }) {
  return (
    <td className={cx("px-4 py-3 align-middle text-[13px] text-fg", className)} {...rest}>
      {children}
    </td>
  );
}

/* Page N of M, with the range spelled out. Hidden entirely when everything fits
   on one page — a pager showing "1–6 of 6" with both arrows dead is noise. */
export function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-[12.5px] text-fg-muted">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="px-1 text-[12.5px] text-fg-muted">
          {page} / {pages}
        </span>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
