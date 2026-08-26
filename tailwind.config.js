/* The admin's design system, in one file — same discipline as the public site
   (no hex code anywhere in src/), because a colour written inline cannot be
   themed.

   The look is Vercel's Geist: near-monochrome, hairline borders instead of
   shadows, small radii, one blue for actionable and one red for destructive.
   ⚠ A tool for editors, not a brand surface — the Iwan palette stays on the
   public site, or the two become easy to confuse.

   Every colour is `rgb(var(--x) / <alpha-value>)` so `text-fg/60` works AND
   recolours under `[data-theme="dark"]`. */

const rgb = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ['[data-theme="dark"]', '[data-theme="dark"] *'],
  theme: {
    extend: {
      colors: {
        canvas: rgb("--c-canvas"),
        surface: rgb("--c-surface"),
        raised: rgb("--c-raised"),
        muted: rgb("--c-muted"),

        line: rgb("--c-line"),
        "line-strong": rgb("--c-line-strong"),

        fg: rgb("--c-fg"),
        "fg-muted": rgb("--c-fg-muted"),
        "fg-subtle": rgb("--c-fg-subtle"),
        "fg-invert": rgb("--c-fg-invert"),

        accent: rgb("--c-accent"),
        "accent-hover": rgb("--c-accent-hover"),
        "accent-soft": rgb("--c-accent-soft"),

        success: rgb("--c-success"),
        "success-soft": rgb("--c-success-soft"),
        warn: rgb("--c-warn"),
        "warn-soft": rgb("--c-warn-soft"),
        danger: rgb("--c-danger"),
        "danger-hover": rgb("--c-danger-hover"),
        "danger-soft": rgb("--c-danger-soft"),

        /* The PUBLIC SITE's palette, mirrored for the post preview and nothing
           else. Copied from the site's tailwind.config.js and updated alongside
           it; deliberately not themeable, since the preview always shows the
           default brand theme.

           ⚠ They must never leak into the admin's own chrome — hence the `site-`
           prefix. The admin looking like the site would make the two easy to
           confuse, which is the last thing you want when one edits the other. */
        "site-ink": "#0a1020",
        "site-ink-2": "#1a2233",
        "site-muted": "#5b6b80",
        "site-line": "#e4e8f0",
        "site-mist": "#f7f9fc",
        "site-primary": "#244967",
        "site-accent": "#f9be00",
      },

      fontFamily: {
        /* Geist if the machine has it, then the system stack. Nothing is
           downloaded — an admin tool should not wait on a font CDN. */
        sans: [
          "Geist",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        /* The site sets DM Sans; it is not loaded here, so the preview reads
           true in spacing and weight if not in the exact face. */
        site: ['"DM Sans"', "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: [
          "Geist Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },

      /* Geist's radii. Anything rounder reads as consumer software. */
      borderRadius: {
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },

      boxShadow: {
        /* Borders carry the structure; shadows only lift what floats. */
        pop: "0 4px 12px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04)",
        dialog: "0 16px 48px rgb(0 0 0 / 0.16), 0 2px 8px rgb(0 0 0 / 0.06)",
        focus: "0 0 0 3px rgb(var(--c-accent) / 0.25)",
      },

      keyframes: {
        in: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
        pop: {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        in: "in 160ms ease-out both",
        pop: "pop 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
        spin: "spin 700ms linear infinite",
      },
    },
  },

  plugins: [
    /* A plugin rather than a stylesheet, so adding a colour means editing one
       file rather than two that can disagree. */
    ({ addBase }) =>
      addBase({
        ":root": {
          "--c-canvas": "250 250 250",
          "--c-surface": "255 255 255",
          "--c-raised": "255 255 255",
          "--c-muted": "244 244 245",

          "--c-line": "234 234 234",
          "--c-line-strong": "212 212 212",

          "--c-fg": "10 10 10",
          "--c-fg-muted": "102 102 102",
          "--c-fg-subtle": "143 143 143",
          "--c-fg-invert": "255 255 255",

          "--c-accent": "0 112 243",
          "--c-accent-hover": "7 97 209",
          "--c-accent-soft": "230 242 255",

          "--c-success": "24 122 51",
          "--c-success-soft": "227 245 232",
          "--c-warn": "161 106 2",
          "--c-warn-soft": "255 244 219",
          "--c-danger": "205 43 49",
          "--c-danger-hover": "180 35 40",
          "--c-danger-soft": "255 232 232",
        },
        '[data-theme="dark"]': {
          "--c-canvas": "10 10 10",
          "--c-surface": "17 17 17",
          "--c-raised": "26 26 26",
          "--c-muted": "38 38 38",

          "--c-line": "46 46 46",
          "--c-line-strong": "69 69 69",

          "--c-fg": "237 237 237",
          "--c-fg-muted": "161 161 161",
          "--c-fg-subtle": "115 115 115",
          "--c-fg-invert": "10 10 10",

          "--c-accent": "0 114 245",
          "--c-accent-hover": "50 145 255",
          "--c-accent-soft": "16 40 68",

          "--c-success": "98 197 122",
          "--c-success-soft": "19 43 25",
          "--c-warn": "240 176 60",
          "--c-warn-soft": "54 39 10",
          "--c-danger": "255 110 110",
          "--c-danger-hover": "255 140 140",
          "--c-danger-soft": "61 22 22",
        },
      }),
  ],
};
