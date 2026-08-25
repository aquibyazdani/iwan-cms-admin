# iwan-cms-admin

The CMS admin for [iwan.community](https://iwan.community) — where events, blog
posts, podcast episodes and promos are written, and where each is assigned to
India, Canada, both, or everywhere.

Vite + React + Tailwind, deployed on Vercel. It talks to
[`iwan-cms-api`](../iwan-cms-api) and to nothing else.

## Running it

```bash
npm install
cp .env.example .env.local     # point VITE_API_URL at the API
npm run dev                    # :5174
```

The API has to be running too. The quickest way to get the whole stack up with
no database of your own:

```bash
cd ../iwan-cms-api && npm run dev:memory
```

That boots the API on a throwaway in-memory MongoDB, seeds it from the public
site's content, and prints a dev login.

## The design system

Vercel's Geist, in Tailwind: a near-monochrome surface, hairline borders doing
the work shadows would otherwise do, small radii, one blue for anything
actionable and one red for anything destructive.

**Every colour lives in `tailwind.config.js`** — the same rule the public site
keeps, and for the same reason: a hex written inline is a colour that cannot be
themed. Colours are declared `rgb(var(--x) / <alpha-value>)`, so `bg-surface`,
`text-fg/60` and friends all work _and_ recolour under `[data-theme="dark"]`.

⚠ This is deliberately **not** the Iwan brand palette. It is a tool for editors,
and dressing it in the site's own colours would only make the two easy to
confuse at a glance.

The primitives are in `src/ui/` — `Button`, `form.jsx` (Field/Input/Textarea/
Select/Checkbox/SegmentedControl), `Table`, `Dialog`, `Toast`, `Badge`,
`Page`, `Repeater`, `CountryPicker`, `feedback.jsx`.

## One list screen, one form screen

Events, blogs, episodes and promos differ in their **fields** and in nothing
else: same identity (a unique slug), same country list, same draft/published
switch, same six operations. So there is one `ResourceList`, one `ResourceForm`,
and **`src/resources.jsx` is what tells them apart** — columns, form sections,
labels, empty states.

Adding a fifth content type is an entry in that file. It is the same shape as
the API's `routes/crud.js`, on purpose.

Field kinds are rendered by `src/form/fields.jsx`: `text` · `textarea` · `slug` ·
`date` · `time` · `number` · `url` · `programme` · `status` · `countries` ·
`duration` · `coords` · `agenda` · `html` · `cta`.

## The blog editor

TipTap (ProseMirror) in `src/ui/RichText.jsx`, chosen because it is **headless** —
the toolbar and the writing surface are ours, styled with the same design tokens
as everything else, rather than an editor theme fighting the admin's. Prose
styles are hand-written in `index.css` against those tokens, so dark mode comes
for free.

⚠ **Nothing in that component is a security control.** The API sanitises on
write, and that is the only thing standing between a pasted payload and a stored
XSS on the public site. The toolbar limiting what an editor can _insert_ is a
usability decision — a paste, or a request sent by hand, bypasses it entirely.

⚠ Its extension list is **matched to the API's allowlist**. If one gains a tag
the other has to, or an editor gets a button whose output is silently stripped on
save — which reads as the editor eating their work.

## Countries

⚠ **An empty country list means EVERYWHERE**, not "unassigned" — that is the
convention the API stores and the public site already uses. It is a fine thing
for a database and a terrible thing to show an editor as a set of unticked
boxes: untick everything and the item goes to _more_ places, not fewer.

So `CountryPicker` asks the question explicitly — **Everywhere** or **Specific
countries** — and only shows the checkboxes for the second. Unticking the last
country is refused rather than silently meaning "everywhere".

A **scoped editor** (one whose account names particular countries) cannot pick
Everywhere at all, since that would include countries they do not have. The
picker disables it rather than letting the save fail.

## Gotchas that have already bitten

- **A scroll container must be `relative` if anything inside it is
  `position: absolute`.** `overflow` does not clip an absolutely-positioned
  descendant whose containing block is an ancestor of the scroll box — and
  Tailwind's `sr-only` _is_ `position: absolute`. The visually-hidden "Actions"
  label in the table's last header cell escaped its `overflow-x-auto` wrapper,
  landed at x≈750 in page coordinates, and gave the whole document 363px of
  horizontal scroll at 390px wide. The table was scrolling correctly the entire
  time. See `ui/Table.jsx`.
- **A contenteditable must not be wrapped in a `<button>`.** The editor body had
  one, to widen the click target to its padding — and the browser then suppressed
  text selection inside it, so Bold and every other toolbar action had nothing to
  apply to. A plain `<div>` with the same handler works; the contenteditable is
  already the focusable control.
- **Toolbar buttons act on `onMouseDown` with `preventDefault()`, not `onClick`.**
  A click moves focus to the button first, which collapses the editor's
  selection — so "make this bold" would apply to nothing.
- **The editor's `value` sync is guarded on the content differing.** Without
  that, every keystroke round-trips through the parent's state, comes back, and
  resets the document — destroying the cursor position on every character typed.
- **`Repeater` rows are keyed by a stable id, not by index.** Keyed by index,
  removing the second of five rows makes React reuse row 3's DOM node for row 2 —
  every input below the deletion keeps the previous row's focus, selection and
  IME state, and the field an editor is typing into changes underneath them.
- **The duration field keeps its own text state.** Mid-typing, `"5:"` is not a
  valid duration; a controlled input deriving its value from the parsed number
  would rewrite it to `"5:00"` and make the field impossible to type into.
- **List filters live in the URL, not in state.** That makes a filtered list
  shareable and — the reason it actually matters — means Back after opening a
  row returns to the list the editor was looking at, not to an unfiltered page
  one.
- **`ready` is not the same as "no user".** On the first render the stored token
  is still being checked; rendering the sign-in screen during that moment
  flashes it at someone who is already signed in.
- **The theme is applied by an inline script in `index.html`**, before first
  paint. A module import runs a frame too late and a dark-mode session flashes
  white on every load. `lib/theme.js` only handles changing it afterwards.
- **A 401 from anywhere ends the session**, via `setUnauthorizedHandler` in
  `lib/api.js` — except on the sign-in call itself, which passes `auth: false`
  so a wrong password does not sign you out of the sign-in screen.

## Deploying to Vercel

Framework preset **Vite**, build `npm run build`, output `dist`. `vercel.json`
already carries the SPA rewrite (without it every deep link 404s on a hard
refresh) and `X-Robots-Tag: noindex`.

Set per deployment:

| variable         | what it does                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`   | the API this build talks to                                                                                                                                             |
| `VITE_SITE_URL`  | the public site, for the sidebar's "View the site" link                                                                                                                 |
| `VITE_ENV_LABEL` | a badge beside the logo. **Set it on every non-production deploy** — it is what stops someone editing the live site believing they are on dev. Leave it empty for prod. |

⚠ Vite inlines `VITE_*` at **build** time, so changing one means a redeploy, and
nothing here may ever be a secret — the whole bundle is public.

Whatever origin Vercel gives this app has to be added to the API's
`CORS_ORIGINS`, or every request from it is refused.
