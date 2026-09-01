import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconDownload, IconUsers, IconSearch, IconTrash } from "@tabler/icons-react";
import { api, query, API_URL, readToken } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../ui/Toast.jsx";
import { COUNTRIES } from "../lib/countries.js";
import { formatWhen } from "../lib/format.js";
import { Button } from "../ui/Button.jsx";
import { Badge, CountryBadges } from "../ui/Badge.jsx";
import { Input, Select, Textarea } from "../ui/form.jsx";
import { PageHeader, Panel, Toolbar } from "../ui/Page.jsx";
import { Table, Thead, Tbody, Tr, Th, Td, Pagination } from "../ui/Table.jsx";
import { EmptyState, ErrorState, TableSkeleton } from "../ui/feedback.jsx";
import { Dialog, ConfirmDialog } from "../ui/Dialog.jsx";
import { cx } from "../lib/cx.js";

const PER_PAGE = 25;

/* Every form that can put someone on this list. Ordered as they appear on the
   site rather than alphabetically. */
const SOURCES = [
  { value: "subscribe", label: "Newsletter" },
  { value: "contact", label: "Contact form" },
  { value: "event", label: "Event sign-up" },
  { value: "volunteer", label: "Volunteer" },
  { value: "career", label: "Career" },
];

export const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.value, s.label]));

/* Exported for the Contact page, which lists the same people narrowed to the
   contact form — one dialog, so the two views cannot drift. */
export function AudienceDetail({ row, onClose, onChanged }) {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [note, setNote] = useState(row?.note ?? "");
  const [saving, setSaving] = useState(false);

  if (!row) return null;

  const patch = async (body, said) => {
    try {
      await api.patch(`/api/admin/audience/${row.id}`, body);
      toast.success(said);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      await patch({ note }, "Note saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={row.name || row.email}
      description={row.name ? row.email : undefined}
      width="max-w-[640px]"
      footer={
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="divide-y divide-line rounded-lg border border-line">
          {[
            ["Mobile", row.mobile || "Not given"],
            ["Came from", row.sources.map((s) => SOURCE_LABEL[s] ?? s).join(" · ")],
            ["First seen", formatWhen(row.firstSeenAt)],
            ["Last seen", formatWhen(row.lastSeenAt)],
          ].map(([label, value]) => (
            <div key={label} className="px-3.5 py-2.5">
              <dt className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-fg-subtle">
                {label}
              </dt>
              <dd className="mt-0.5 text-[13.5px] text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-fg">
              {row.subscribed ? "Subscribed to the newsletter" : "Not subscribed"}
            </p>
            <p className="mt-0.5 text-[12px] text-fg-subtle">
              {/* ⚠ Unticking a box on another form never lands here — only this
                  button does. See the note on the API's Audience model. */}
              This is the only place a subscription is turned off.
            </p>
          </div>
          <Button
            size="sm"
            disabled={!canWrite}
            onClick={() =>
              patch(
                { subscribed: !row.subscribed },
                row.subscribed ? "Unsubscribed" : "Subscribed"
              )
            }
          >
            {row.subscribed ? "Unsubscribe" : "Subscribe"}
          </Button>
        </div>

        {row.messages.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg">
              Messages ({row.messages.length})
            </p>
            <div className="flex flex-col gap-2">
              {row.messages.map((m, i) => (
                <div key={i} className="rounded-lg border border-line px-3.5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-medium text-fg">
                      {m.subject || "No subject"}
                    </p>
                    <span className="text-[12px] text-fg-subtle">{formatWhen(m.at)}</span>
                  </div>
                  {m.body && (
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.6] text-fg-muted">
                      {m.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg">
            Private note
            <span className="ml-2 font-normal text-fg-subtle">Only ever seen here</span>
          </span>
          <Textarea
            rows={3}
            value={note}
            disabled={!canWrite}
            onChange={(e) => setNote(e.target.value)}
          />
          <div>
            <Button size="sm" onClick={saveNote} loading={saving} disabled={!canWrite}>
              Save note
            </Button>
          </div>
        </label>
      </div>
    </Dialog>
  );
}

export default function Audience() {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [params, setParams] = useSearchParams();

  const source = params.get("source") ?? "";
  const country = params.get("country") ?? "";
  const subscribed = params.get("subscribed") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [open, setOpen] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const setParam = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const path = useMemo(
    () =>
      `/api/admin/audience${query({ source, country, subscribed, q, page, limit: PER_PAGE })}`,
    [source, country, subscribed, q, page]
  );

  const { data, error, loading, reload } = useFetch(path);
  const stats = useFetch("/api/admin/audience/stats");

  const items = data?.items ?? [];
  const filtered = Boolean(source || country || subscribed || q);

  const remove = async () => {
    try {
      await api.del(`/api/admin/audience/${pendingDelete.id}`);
      toast.success("Removed from the audience");
      setPendingDelete(null);
      reload();
      stats.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ⚠ An authenticated GET, so it cannot be a plain <a href> — the browser
     sends no Authorization header. Same approach as the registrations export. */
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/audience/export${query({ source, country, subscribed, q })}`,
        { headers: { authorization: `Bearer ${readToken()}` } }
      );
      if (!res.ok) throw new Error(`The server said ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "audience.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            Audience
            {data && (
              <Badge className="!text-[12px]">
                {data.total}
                {filtered && " matching"}
              </Badge>
            )}
          </span>
        }
        description="Everyone who has given Iwan their email, from any form on the site. One row per person, however many times they have been in touch."
        actions={
          <Button onClick={exportCsv} loading={exporting} disabled={!items.length}>
            <IconDownload size={15} stroke={1.8} />
            {data ? `Export ${data.total}` : "Export"}
          </Button>
        }
      />

      {stats.data && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="accent">{stats.data.subscribed} subscribed</Badge>
          {SOURCES.map((s) =>
            stats.data.sources[s.value] ? (
              <Badge key={s.value}>
                {s.label}: {stats.data.sources[s.value]}
              </Badge>
            ) : null
          )}
        </div>
      )}

      <Panel>
        <Toolbar>
          <div className="relative min-w-[180px] flex-1">
            <IconSearch
              size={15}
              stroke={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <Input
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Search name, email or mobile…"
              className="pl-9"
              aria-label="Search"
            />
          </div>

          <Select
            value={source}
            onChange={(e) => setParam("source", e.target.value)}
            className="w-[170px]"
            aria-label="Filter by form"
          >
            <option value="">Any form</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          <Select
            value={subscribed}
            onChange={(e) => setParam("subscribed", e.target.value)}
            className="w-[150px]"
            aria-label="Filter by subscription"
          >
            <option value="">Any subscription</option>
            <option value="yes">Subscribed</option>
            <option value="no">Not subscribed</option>
          </Select>

          <Select
            value={country}
            onChange={(e) => setParam("country", e.target.value)}
            className="w-[140px]"
            aria-label="Filter by country"
          >
            <option value="">All countries</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>

          {filtered && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setParams({}, { replace: true })}
            >
              Clear
            </Button>
          )}
        </Toolbar>

        {loading && !data ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={IconUsers}
            title={filtered ? "Nobody matches those filters" : "No audience yet"}
            body={
              filtered
                ? "Try clearing the search or the filters."
                : "When someone subscribes, gets in touch, registers or applies, they appear here."
            }
            action={
              filtered ? (
                <Button size="sm" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <Thead>
                <Th>Who</Th>
                <Th className="w-[150px]">Mobile</Th>
                <Th className="w-[210px]">Came from</Th>
                <Th className="w-[120px]">Newsletter</Th>
                <Th className="w-[110px]">Country</Th>
                <Th className="w-[110px]">Last seen</Th>
                <Th className="w-[52px] text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </Thead>
              <Tbody>
                {items.map((row) => (
                  <Tr key={row.id}>
                    <Td className="max-w-[280px]">
                      <button
                        type="button"
                        onClick={() => setOpen(row)}
                        className="block max-w-full text-left"
                      >
                        <span className="block truncate font-medium text-fg hover:text-accent">
                          {row.name || "Someone"}
                        </span>
                        <span className="block truncate text-[12px] text-fg-subtle">
                          {row.email}
                        </span>
                      </button>
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-fg-muted">
                        {row.mobile || "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        {row.sources.map((s) => (
                          <Badge key={s}>{SOURCE_LABEL[s] ?? s}</Badge>
                        ))}
                      </span>
                    </Td>
                    <Td>
                      {row.subscribed ? (
                        <Badge tone="success">Subscribed</Badge>
                      ) : (
                        <span className="text-fg-subtle">No</span>
                      )}
                    </Td>
                    <Td>
                      <CountryBadges codes={row.country ? [row.country] : []} />
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-fg-muted">
                        {formatWhen(row.lastSeenAt)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Remove ${row.name || row.email}`}
                          className={cx(
                            "rounded p-1.5 text-fg-subtle transition-colors",
                            "hover:bg-danger-soft hover:text-danger"
                          )}
                        >
                          <IconTrash size={15} stroke={1.8} />
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              onPage={(n) => setParam("page", String(n))}
            />
          </>
        )}
      </Panel>

      <AudienceDetail
        row={open}
        onClose={() => setOpen(null)}
        onChanged={() => {
          reload();
          stats.reload();
          setOpen(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        title="Remove this person?"
        name={pendingDelete?.name || pendingDelete?.email}
        body="This deletes them from the audience list, including any messages they sent. Their event registrations and applications are kept."
      />
    </>
  );
}
