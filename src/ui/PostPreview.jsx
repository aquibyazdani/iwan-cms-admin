import { useMemo } from "react";
import { IconCalendar, IconEyeOff } from "@tabler/icons-react";
import { formatDay, programmeLabel } from "../lib/format.js";
import { cx } from "../lib/cx.js";

/* How a post will read on the public site.

   ⚠ An approximation, and nothing on screen says so — the caveat lives here.
   The real page has DM Sans, a wider column and a programme-toned header. What
   this gets RIGHT is what an editor is judging: heading hierarchy, paragraph
   rhythm, list indents, where a long title wraps, and whether it is too long.

   ⚠ The HTML has been through the API's allowlist on write, which is what makes
   `dangerouslySetInnerHTML` acceptable here. */
export function PostPreview({ post }) {
  const html = post.html ?? "";

  /* An empty editor produces one empty paragraph, not "" — treating that as
     content previews nothing and calls it a post. */
  const isEmpty = useMemo(
    () => !html.trim() || /^(<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)+$/i.test(html.trim()),
    [html]
  );

  const programme = programmeLabel(post.programme);

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      {/* The site's post header. */}
      <div className="bg-site-primary px-[clamp(1.25rem,4vw,2.5rem)] py-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {post.date ? (
            <span className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-white">
              {formatDay(post.date)}
            </span>
          ) : (
            /* The site omits the date line, so this names what will be missing
               rather than leaving a blank. */
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/50">
              <IconCalendar size={13} stroke={2} />
              No date — this line will not appear
            </span>
          )}
          <span className="rounded-full bg-white/[0.18] px-[0.6rem] py-[3px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
            {programme ?? "Default"}
          </span>
        </div>

        <h1 className="max-w-[24ch] font-site text-[clamp(1.6rem,3.4vw,38px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-white">
          {post.title || "Untitled"}
        </h1>
      </div>

      <div className="bg-white px-[clamp(1.25rem,4vw,2.5rem)] py-9">
        <div className="mx-auto max-w-[680px]">
          {post.img && (
            <img
              src={post.img}
              alt=""
              className="mb-9 max-h-[420px] w-full rounded-2xl object-cover"
              /* A broken URL is worth seeing, but the browser's glyph mid-
                 preview reads as the preview being broken. */
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}

          {isEmpty ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center text-[13px] text-fg-subtle">
              <IconEyeOff size={15} stroke={1.7} />
              Nothing written yet — the page would show only the header above.
            </p>
          ) : (
            <div
              className={cx("site-prose")}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PostPreview;
