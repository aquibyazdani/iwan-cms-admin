import { Link } from "react-router-dom";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { API_URL } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useAuth } from "../lib/auth.jsx";
import { COUNTRIES } from "../lib/countries.js";
import { RESOURCE_LIST } from "../resources.jsx";
import { PageHeader, Panel, PanelBody, PanelHeader } from "../ui/Page.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Loading, ErrorState } from "../ui/feedback.jsx";
import { formatDay, todayKey } from "../lib/format.js";
import { cx } from "../lib/cx.js";

/* Deliberately NOT a count of rows in the database.

   An editor's actual question is "what does a visitor in Canada see right
   now?", and the answer to that excludes drafts, excludes anything outside its
   promo window, and folds in every global item. Rather than reimplement those
   rules here and risk them disagreeing with the API, this reads the same PUBLIC
   endpoint the site itself calls, once per country. Two requests, and what it
   shows is what the site shows by construction. */
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={`Hello${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="What the public site is serving right now, per country. Drafts are not counted — they are invisible until published."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {COUNTRIES.map((country) => (
          <CountryCard key={country.code} country={country} />
        ))}
      </div>

      <Panel>
        <PanelHeader title="Add something" />
        <PanelBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {RESOURCE_LIST.map((resource) => (
              <Link
                key={resource.key}
                to={`/${resource.path}/new`}
                className={cx(
                  "group flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3",
                  "transition-colors duration-150 hover:border-line-strong hover:bg-canvas"
                )}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-fg-muted">
                  <resource.icon size={16} stroke={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-fg">
                    New {resource.singular.toLowerCase()}
                  </span>
                  <span className="block truncate text-[12px] text-fg-subtle">
                    {resource.label}
                  </span>
                </span>
                <IconPlus
                  size={15}
                  stroke={2}
                  className="shrink-0 text-fg-subtle transition-transform group-hover:scale-110"
                />
              </Link>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </>
  );
}

function CountryCard({ country }) {
  /* The public API, not the admin one — no token, and the same URL the site
     itself fetches. */
  /* ⚠ `from` is the viewer's own calendar day, and it is what makes "next
     event" mean anything. Without it the API returns every published event in
     ascending date order, so page one is the OLDEST — and this panel would
     confidently announce an event from last year. */
  const { data, error, loading, reload } = useFetch(
    `/api/content?country=${country.code}&from=${todayKey()}`
  );

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <span aria-hidden="true">{country.flag}</span>
            {country.label}
          </span>
        }
        actions={
          <Button
            size="sm"
            variant="ghost"
            href={`${API_URL}/api/content?country=${country.code}`}
          >
            Raw
          </Button>
        }
      />

      {loading && !data ? (
        <Loading className="!py-10" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <PanelBody className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {/* ⚠ `total`, not `items.length`. The bootstrap carries only the
                first page of each list, so counting what it returned would
                report "6" forever however much is published. */}
            <Stat label="Events" value={data.events.total} to="/events" />
            <Stat label="Posts" value={data.blogs.total} to="/blogs" />
            <Stat label="Episodes" value={data.podcast?.total ?? 0} to="/episodes" />
          </div>

          <div className="rounded-lg border border-line bg-canvas px-3.5 py-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Pop-up showing now
            </p>
            {data.promo ? (
              <p className="text-[13px] text-fg">
                {data.promo.heading}{" "}
                <span className="text-fg-muted">{data.promo.mark}</span>
                <Badge className="ml-2" tone="accent">
                  {data.promo.id}
                </Badge>
              </p>
            ) : (
              <p className="text-[13px] text-fg-muted">
                Nothing —{" "}
                <Link to="/promos" className="text-accent hover:underline">
                  set one up
                </Link>
                .
              </p>
            )}
          </div>

          <NextEvent events={data.events.items} />
        </PanelBody>
      )}
    </Panel>
  );
}

function Stat({ label, value, to }) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-line bg-canvas px-3 py-2.5 transition-colors hover:border-line-strong"
    >
      <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-fg">
        {value}
      </p>
      <p className="flex items-center gap-1 text-[12px] text-fg-muted">
        {label}
        <IconArrowRight
          size={11}
          stroke={2}
          className="opacity-0 transition-opacity group-hover:opacity-60"
        />
      </p>
    </Link>
  );
}

/* The soonest upcoming event, which the API has already worked out: the
   request carries `?from=<today>` and the list comes back in ascending date
   order, so the first item IS the next one.

   ⚠ This used to filter and sort here, over the whole event list. With paging
   there is no whole list to filter — doing it locally would only ever search
   the first page. */
function NextEvent({ events }) {
  const upcoming = events?.[0] ?? null;

  return (
    <div className="rounded-lg border border-line bg-canvas px-3.5 py-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
        Next event
      </p>
      {upcoming ? (
        <p className="text-[13px] text-fg">
          {upcoming.title}
          <span className="ml-2 text-fg-muted">{formatDay(upcoming.date)}</span>
        </p>
      ) : (
        <p className="text-[13px] text-fg-muted">
          Nothing coming up —{" "}
          <Link to="/events/new" className="text-accent hover:underline">
            add one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
