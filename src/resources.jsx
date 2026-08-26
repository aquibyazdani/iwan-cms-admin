import {
  IconCalendarEvent,
  IconArticle,
  IconMicrophone,
  IconSpeakerphone,
} from "@tabler/icons-react";
import { CountryBadges, StatusBadge, Badge, ProgrammeBadge } from "./ui/Badge.jsx";
import { formatDay, formatLength, formatWhen } from "./lib/format.js";
import { useMeta } from "./lib/meta.jsx";

/* Events, blogs, episodes and promos differ in their FIELDS and nothing else —
   the same thing routes/crud.js says on the API side. So there is one list
   screen and one form screen, and this file is what tells them apart: a fifth
   content type is an entry here, not two more pages. */

const statusColumn = {
  header: "Status",
  width: "w-[110px]",
  cell: (row) => <StatusBadge status={row.status} />,
};

const countriesColumn = {
  header: "Countries",
  width: "w-[190px]",
  cell: (row) => <CountryBadges codes={row.countries} />,
};

/* A cell is rendered inside the table, so this may hold a hook — which is how
   it reaches the colours /meta serves. */
function ProgrammePill({ path }) {
  const { programmes } = useMeta();
  return <ProgrammeBadge path={path} programmes={programmes} />;
}

/* ⚠ "Open to all" is a real value, not a blank — an empty cell would read as a
   field someone forgot to fill in. */
const programmeColumn = {
  header: "Programme",
  width: "w-[150px]",
  cell: (row) =>
    row.programme ? (
      <ProgrammePill path={row.programme} />
    ) : (
      <span className="text-fg-subtle">Open to all</span>
    ),
};

const updatedColumn = {
  header: "Updated",
  width: "w-[110px]",
  cell: (row) => <span className="text-fg-muted">{formatWhen(row.updatedAt)}</span>,
};

/* The slug is what the public URL is made of, so it is visible without
   opening the row. */
const titleCell = (title, slug) => (
  <div className="min-w-0">
    <p className="truncate font-medium text-fg">{title || "Untitled"}</p>
    <p className="truncate font-mono text-[11.5px] text-fg-subtle">/{slug}</p>
  </div>
);

/* Shared by every type, in sidebar order. */
const publishingSection = {
  title: "Publishing",
  description:
    "A draft is invisible on the public site — it exists only here until it is published.",
  fields: [
    { name: "status", kind: "status" },
    { name: "countries", kind: "countries", label: "Where this appears" },
  ],
};

export const RESOURCES = {
  events: {
    key: "events",
    path: "events",
    label: "Events",
    singular: "Event",
    icon: IconCalendarEvent,
    /* Only for types that carry a `programme` — a filter that can never match
       is worse than none. */
    hasProgramme: true,
    description:
      "Everything on /events and the homepage calendar. An event happens in one place, so most carry a single country.",
    /* Newest is not useful here — an editor is working on what has not
       happened yet. */
    emptyBody: "Add the first event and it appears on the site once published.",
    slugFrom: "title",
    titleOf: (row) => row.title,

    columns: [
      { header: "Event", cell: (row) => titleCell(row.title, row.slug) },
      {
        header: "Date",
        width: "w-[130px]",
        cell: (row) => <span className="whitespace-nowrap">{formatDay(row.date)}</span>,
      },
      programmeColumn,
      countriesColumn,
      statusColumn,
      updatedColumn,
    ],

    empty: () => ({
      slug: "",
      title: "",
      kind: "",
      countries: [],
      status: "draft",
      date: "",
      start: "",
      end: "",
      venue: "",
      address: "",
      coords: null,
      programme: null,
      spots: null,
      img: "",
      summary: "",
      details: "",
      agenda: [],
      form: [],
    }),

    sections: [
      {
        title: "The event",
        fields: [
          { name: "title", label: "Title", kind: "text", required: true },
          { name: "slug", kind: "slug" },
          {
            name: "kind",
            label: "Kind",
            kind: "text",
            width: "half",
            placeholder: "Community meal",
            hint: "The small label on the card — free text, not a category.",
          },
          { name: "programme", kind: "programme", width: "half" },
          {
            name: "summary",
            label: "Summary",
            kind: "textarea",
            rows: 2,
            hint: "One line, shown on the card and in the listing.",
          },
          {
            name: "details",
            label: "Details",
            kind: "textarea",
            rows: 7,
            hint: "The full description on the event's own page.",
          },
        ],
      },
      {
        title: "When",
        fields: [
          {
            name: "date",
            label: "Date",
            kind: "date",
            required: true,
            width: "third",
          },
          { name: "start", label: "Starts", kind: "time", width: "third" },
          { name: "end", label: "Ends", kind: "time", width: "third" },
        ],
      },
      {
        title: "Where",
        fields: [
          { name: "venue", label: "Venue", kind: "text", width: "half" },
          {
            name: "spots",
            label: "Places",
            kind: "number",
            width: "half",
            hint: "How many people can come. Leave blank if it is not limited.",
          },
          {
            name: "address",
            label: "Address",
            kind: "text",
            hint: "Used for the map when there are no coordinates.",
          },
          {
            name: "coords",
            kind: "coords",
            label: "Coordinates",
            hint: "Optional. With these the map pins the exact spot instead of searching for the address.",
          },
        ],
      },
      {
        title: "Registration form",
        description:
          "The questions people answer to sign up. An event cannot be published without at least one.",
        fields: [{ name: "form", kind: "form" }],
      },
      {
        title: "Running order",
        description:
          "Optional. Shown as a timeline on the event's page — leave it empty and that whole block is absent rather than blank.",
        fields: [{ name: "agenda", kind: "agenda" }],
      },
      {
        title: "Photo",
        fields: [
          {
            name: "img",
            label: "Image URL",
            kind: "url",
            hint: "A full https:// URL. File uploads are not wired up yet.",
          },
        ],
      },
      publishingSection,
    ],
  },

  blogs: {
    key: "blogs",
    path: "blogs",
    label: "Blog posts",
    singular: "Post",
    icon: IconArticle,
    hasProgramme: true,
    description:
      "Everything on /blogs. Posts default to every country — tick specific ones only when a post is genuinely local.",
    emptyBody: "Write the first post and it appears on /blogs once published.",
    slugFrom: "title",
    titleOf: (row) => row.title,

    columns: [
      { header: "Post", cell: (row) => titleCell(row.title, row.slug) },
      {
        header: "Date",
        width: "w-[130px]",
        cell: (row) => (
          <span className="whitespace-nowrap text-fg-muted">
            {/* ⚠ Some posts genuinely have no date and none was invented.
                "No date" is the honest cell, not today's. */}
            {row.date ? formatDay(row.date) : "No date"}
          </span>
        ),
      },
      programmeColumn,
      countriesColumn,
      statusColumn,
      updatedColumn,
    ],

    empty: () => ({
      slug: "",
      title: "",
      countries: [],
      status: "draft",
      date: "",
      programme: null,
      img: "",
      excerpt: "",
      html: "",
    }),

    sections: [
      {
        title: "The post",
        fields: [
          { name: "title", label: "Title", kind: "text", required: true },
          { name: "slug", kind: "slug" },
          {
            name: "date",
            label: "Date",
            kind: "date",
            width: "half",
            hint: "Optional. Undated posts sort last and render without a date.",
          },
          { name: "programme", kind: "programme", width: "half" },
          {
            name: "excerpt",
            label: "Excerpt",
            kind: "textarea",
            rows: 2,
            hint: "The teaser on the listing card.",
          },
        ],
      },
      {
        title: "Body",
        fields: [{ name: "html", kind: "html" }],
      },
      {
        title: "Photo",
        fields: [
          {
            name: "img",
            label: "Image URL",
            kind: "url",
            hint: "A full https:// URL. A post with no photo falls back to its programme's mark.",
          },
        ],
      },
      publishingSection,
    ],
  },

  episodes: {
    key: "episodes",
    path: "episodes",
    label: "Podcast",
    singular: "Episode",
    icon: IconMicrophone,
    hasProgramme: true,
    description:
      "Episodes on /podcast. The show's own title and artwork are in Settings.",
    emptyBody: "Add an episode and it appears on /podcast once published.",
    slugFrom: "title",
    titleOf: (row) => row.title,

    columns: [
      { header: "Episode", cell: (row) => titleCell(row.title, row.slug) },
      {
        header: "Length",
        width: "w-[90px]",
        cell: (row) => (
          <span className="font-mono text-[12.5px] text-fg-muted">
            {formatLength(row.length)}
          </span>
        ),
      },
      programmeColumn,
      countriesColumn,
      statusColumn,
      {
        header: "Order",
        width: "w-[70px]",
        cell: (row) => <span className="text-fg-muted">{row.order}</span>,
      },
    ],

    empty: () => ({
      slug: "",
      title: "",
      countries: [],
      status: "draft",
      author: "",
      programme: null,
      audio: "",
      video: "",
      length: null,
      cover: "",
      order: 0,
      publishedOn: "",
    }),

    sections: [
      {
        title: "The episode",
        fields: [
          { name: "title", label: "Title", kind: "text", required: true },
          { name: "slug", kind: "slug" },
          { name: "author", label: "Author", kind: "text", width: "half" },
          {
            name: "publishedOn",
            label: "Published on",
            kind: "date",
            width: "half",
          },
          { name: "programme", kind: "programme", width: "half" },
        ],
      },
      {
        title: "Media",
        fields: [
          /* One control for both keys — see MediaField. */
          { name: "audio", kind: "media" },
          {
            name: "length",
            label: "Running time",
            kind: "duration",
            width: "half",
            /* ⚠ The player is preload="none", so without a stored length a
               card would fetch megabytes of audio to print a duration. */
            hint: "In seconds, or mm:ss. Needed so the card can show a running time without downloading the media.",
          },
          {
            name: "order",
            label: "Order",
            kind: "number",
            width: "half",
            hint: "Lower numbers come first in the grid.",
          },
          {
            name: "cover",
            label: "Cover image URL",
            kind: "url",
            hint: "Optional — falls back to the show's artwork.",
          },
        ],
      },
      publishingSection,
    ],
  },

  promos: {
    key: "promos",
    path: "promos",
    label: "Promos",
    singular: "Promo",
    icon: IconSpeakerphone,
    description:
      "The pop-up that greets a visitor. Only one shows at a time — a promo naming a country beats a global one, then the highest priority wins.",
    emptyBody: "Create a promo to greet visitors with a campaign.",
    slugFrom: "name",
    titleOf: (row) => row.name || row.heading,

    columns: [
      {
        header: "Promo",
        cell: (row) => titleCell(row.name || row.heading, row.slug),
      },
      {
        header: "Window",
        width: "w-[180px]",
        cell: (row) => (
          <span className="whitespace-nowrap text-fg-muted">
            {row.startsAt || row.endsAt
              ? `${row.startsAt ? formatDay(row.startsAt) : "Now"} → ${
                  row.endsAt ? formatDay(row.endsAt) : "Open"
                }`
              : "Always"}
          </span>
        ),
      },
      countriesColumn,
      statusColumn,
      {
        header: "Priority",
        width: "w-[90px]",
        cell: (row) =>
          row.priority ? (
            <Badge>{row.priority}</Badge>
          ) : (
            <span className="text-fg-subtle">—</span>
          ),
      },
    ],

    empty: () => ({
      slug: "",
      name: "",
      countries: [],
      status: "draft",
      eyebrow: "",
      heading: "",
      mark: "",
      body: "",
      cta: { label: "", to: "/" },
      dismiss: "Maybe later",
      startsAt: "",
      endsAt: "",
      priority: 0,
    }),

    sections: [
      {
        title: "Campaign",
        fields: [
          {
            name: "name",
            label: "Internal name",
            kind: "text",
            required: true,
            hint: "Only ever seen here — it is how you will find this promo in the list.",
          },
          {
            name: "slug",
            kind: "slug",
            hint: "⚠ Also the key a visitor's dismissal is remembered under. Give a NEW campaign a new slug and everyone sees it again, including people who dismissed the last one.",
          },
        ],
      },
      {
        title: "What it says",
        description:
          "The heading is split in two: the first part renders plain and the highlighted part renders in the brand's marker style. Where it breaks is yours to choose.",
        fields: [
          {
            name: "eyebrow",
            label: "Eyebrow",
            kind: "text",
            width: "half",
            placeholder: "What's on",
          },
          {
            name: "heading",
            label: "Heading — plain part",
            kind: "text",
            width: "half",
            placeholder: "New sessions are",
          },
          {
            name: "mark",
            label: "Heading — highlighted part",
            kind: "text",
            placeholder: "open for registration.",
          },
          { name: "body", label: "Body", kind: "textarea", rows: 3 },
          { name: "cta", kind: "cta" },
          {
            name: "dismiss",
            label: "Dismiss label",
            kind: "text",
            width: "half",
            hint: "Leave blank to hide the secondary button entirely.",
          },
        ],
      },
      {
        title: "When it runs",
        description:
          "Both dates are optional and inclusive. Leave them blank for a promo that runs until you unpublish it.",
        fields: [
          { name: "startsAt", label: "Starts", kind: "date", width: "third" },
          { name: "endsAt", label: "Ends", kind: "date", width: "third" },
          {
            name: "priority",
            label: "Priority",
            kind: "number",
            width: "third",
            hint: "Higher wins.",
          },
        ],
      },
      publishingSection,
    ],
  },
};

export const RESOURCE_LIST = Object.values(RESOURCES);

export default RESOURCES;
