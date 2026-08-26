import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconDownload,
  IconInbox,
  IconMailForward,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { api, query, API_URL, readToken } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useToast } from "../ui/Toast.jsx";
import { COUNTRIES } from "../lib/countries.js";
import { formatWhen, formatDay } from "../lib/format.js";
import { Button } from "../ui/Button.jsx";
import { Badge, CountryBadges } from "../ui/Badge.jsx";
import { Input, Select, Textarea } from "../ui/form.jsx";
import { PageHeader, Panel, Toolbar } from "../ui/Page.jsx";
import { Table, Thead, Tbody, Tr, Th, Td, Pagination } from "../ui/Table.jsx";
import { EmptyState, ErrorState, TableSkeleton } from "../ui/feedback.jsx";
import { Dialog, ConfirmDialog } from "../ui/Dialog.jsx";
import { ColumnPicker } from "../ui/ColumnPicker.jsx";
import { cx } from "../lib/cx.js";

const PER_PAGE = 25;

const STATUS_TONE = {
  new: "accent",
  confirmed: "success",
  waitlist: "warn",
  cancelled: "neutral",
};

const STATUSES = ["new", "confirmed", "waitlist", "cancelled"];

/* ⚠ An answer's shape follows its question's type — see the API's
   models/Registration.js. Rendering them all as strings would print
   "[object Object]" for a name and "true" for an agreement. */
function answerText(answer) {
  const { type, value } = answer;
  if (value === null || value === undefined || value === "") return null;

  if (type === "name") {
    return [value.first, value.last].filter(Boolean).join(" ") || null;
  }
  if (type === "consent") return value ? "Agreed" : "Not agreed";
  if (type === "checkboxes") return value.length ? value.join(", ") : null;
  if (type === "date") return formatDay(value);
  return String(value);
}

/* What is known about the confirmation email for one registration.

   ⚠ Three states, not two. Null means NO RECORD, which is not the same as
   "never sent": every registration taken before the send was recorded has no
   stamp, and claiming those people were never written to would send an
   organiser off to re-contact a whole event. */
function sentSummary(row) {
  if (!row.confirmationSentAt) {
    return row.confirmationSentCount
      ? "Sent, but not dated"
      : "No record of a confirmation being sent";
  }
  const times =
    row.confirmationSentCount > 1 ? ` · ${row.confirmationSentCount} times` : "";
  return `Confirmation sent ${formatWhen(row.confirmationSentAt)}${times}`;
}

function Detail({ row, onClose, onChanged, onResend }) {
  const toast = useToast();
  const [note, setNote] = useState(row?.note ?? "");
  const [saving, setSaving] = useState(false);

  if (!row) return null;

  const setStatus = async (status) => {
    try {
      await api.patch(`/api/admin/registrations/${row.id}`, { status });
      toast.success(`Marked ${status}`);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/registrations/${row.id}`, { note });
      toast.success("Note saved");
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={row.name || "Registration"}
      description={`${row.eventTitle || row.eventSlug} · ${formatWhen(row.submittedAt)}`}
      width="max-w-[640px]"
      footer={
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cx(
                "rounded-full border px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                row.status === s
                  ? "border-fg bg-fg text-fg-invert"
                  : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ⚠ Every answer, with the question as it was ASKED — not as the form
            reads today. The API snapshots the label with the answer precisely
            so this cannot drift. */}
        <dl className="divide-y divide-line rounded-lg border border-line">
          {row.answers.map((a) => {
            const text = answerText(a);
            return (
              <div key={a.key} className="px-3.5 py-2.5">
                <dt className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-fg-subtle">
                  {a.label}
                </dt>
                <dd
                  className={cx(
                    "mt-0.5 text-[13.5px]",
                    text ? "whitespace-pre-wrap text-fg" : "italic text-fg-subtle"
                  )}
                >
                  {text ?? "Not answered"}
                </dd>
              </div>
            );
          })}
        </dl>

        {/* The confirmation email, and the one button that sends it again.
            Placed here rather than only in the table because this is the view
            that shows the address it would go to. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-fg">{sentSummary(row)}</p>
            <p className="mt-0.5 truncate text-[12px] text-fg-subtle">
              {row.email || "This form never asked for an email address"}
            </p>
          </div>
          <Button size="sm" onClick={() => onResend(row)} disabled={!row.email}>
            <IconMailForward size={15} stroke={1.8} />
            Resend
          </Button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg">
            Private note
            <span className="ml-2 font-normal text-fg-subtle">Only ever seen here</span>
          </span>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Called — bringing two children"
          />
          <div>
            <Button size="sm" onClick={saveNote} loading={saving}>
              Save note
            </Button>
          </div>
        </label>
      </div>
    </Dialog>
  );
}

/* The question columns for the rows on screen — the union of every question
   ANSWERED, in the order first seen.

   ⚠ Driven by the answers rather than by the event's current form, for the same
   reason the answers snapshot their own label: a question deleted from the form
   since still has answers, and those answers are the record. It also means
   picking one event gives exactly that event's form as columns, while "All
   events" gives every column with blanks where a form did not ask. */
function questionColumns(rows) {
  const seen = [];
  for (const row of rows) {
    for (const a of row.answers ?? []) {
      if (!seen.some((q) => q.key === a.key)) seen.push({ key: a.key, label: a.label });
    }
  }
  return seen;
}

/* ⚠ Which questions are worth a column BY DEFAULT.

   Short answers first — a radio, a number, a one-line text — because those read
   in a narrow cell. A `textarea` is excluded however useful: a paragraph in a
   table cell is a truncated string with a tooltip, which helps nobody scanning.
   Name and email are already the "Who" column, so they would only repeat it.

   Three, because that is what fits beside the fixed columns without scrolling
   at a normal window width. */
const AUTO_COLUMN_TYPES = ["radio", "select", "number", "checkboxes", "date", "text"];
const AUTO_COLUMN_LIMIT = 3;

const defaultColumns = (columns, rows) => {
  const typeOf = {};
  for (const row of rows) {
    for (const a of row.answers ?? []) typeOf[a.key] = a.type;
  }
  return columns
    .filter((c) => AUTO_COLUMN_TYPES.includes(typeOf[c.key]))
    .slice(0, AUTO_COLUMN_LIMIT)
    .map((c) => c.key);
};

/* Remembered per event, per browser. ⚠ localStorage rather than the URL: this
   is a viewer's own preference for how they read the table, not part of what
   the page is showing — putting it in the URL would mean sharing a filtered
   link also imposed your column choice on the person you sent it to. */
const STORE_KEY = "iwan-cms.reg-columns";

const readStored = (event) => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}")[event || "*"] ?? null;
  } catch {
    return null;
  }
};

const writeStored = (event, keys) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    all[event || "*"] = keys;
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    /* Private browsing throws. The choice holds for this view only. */
  }
};

export default function Registrations() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const event = params.get("event") ?? "";
  const status = params.get("status") ?? "";
  const country = params.get("country") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [open, setOpen] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingResend, setPendingResend] = useState(null);
  const [resending, setResending] = useState(false);

  const setParam = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const path = useMemo(
    () =>
      `/api/admin/registrations${query({ event, status, country, q, page, limit: PER_PAGE })}`,
    [event, status, country, q, page]
  );

  const { data, error, loading, reload } = useFetch(path);
  /* Which events have sign-ups at all — the filter's options, and a count
     against each event's capacity. */
  const events = useFetch("/api/admin/registrations/events");

  const items = data?.items ?? [];
  /* Every question these rows answered — the full menu the picker offers. */
  const allColumns = useMemo(() => questionColumns(items), [items]);

  /* Which of them are actually shown. Null until decided, so a stored choice
     and the automatic default can be told apart from "the editor chose none". */
  const [shown, setShown] = useState(null);

  /* ⚠ Re-decided when the EVENT changes, not on every data change: a different
     event has different questions, and carrying the last event's choice over
     would show a table of empty columns. */
  useEffect(() => {
    if (allColumns.length === 0) return;
    const stored = readStored(event);
    const valid = stored?.filter((k) => allColumns.some((c) => c.key === k));
    setShown(valid?.length ? valid : defaultColumns(allColumns, items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, allColumns.length]);

  const setShownColumns = (keys) => {
    setShown(keys);
    writeStored(event, keys);
  };

  /* In the table's own order, not the order they were ticked. */
  const columns = useMemo(
    () => allColumns.filter((c) => (shown ?? []).includes(c.key)),
    [allColumns, shown]
  );
  const filtered = Boolean(event || status || country || q);

  const remove = async () => {
    try {
      await api.del(`/api/admin/registrations/${pendingDelete.id}`);
      toast.success("Registration deleted");
      setPendingDelete(null);
      reload();
      events.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ⚠ Confirmed first, every time, and deliberately not a one-click action.
     Everything else on this screen moves a row about in a database and can be
     put back; this one puts a message in a member of the public's inbox, where
     nothing can be undone. The dialog names the recipient because the usual way
     to mail the wrong person is to have opened the wrong row.

     The row is re-read afterwards rather than patched in place, so the "sent"
     line reflects what the server actually recorded. */
  const resend = async () => {
    setResending(true);
    try {
      await api.post(`/api/admin/registrations/${pendingResend.id}/resend`);
      toast.success(`Confirmation sent to ${pendingResend.email}`);
      setPendingResend(null);
      setOpen(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  /* ⚠ The export is an authenticated GET, so it cannot be a plain <a href> —
     the browser would send no Authorization header. Fetched with the token,
     then handed to the browser as a blob. */
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/registrations/export${query({ event, status, country, q })}`,
        { headers: { authorization: `Bearer ${readToken()}` } }
      );
      if (!res.ok) throw new Error(`The server said ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = event ? `registrations-${event}.csv` : "registrations.csv";
      a.click();
      /* Revoked on the next tick — immediately would cancel the download in
         Safari before it starts. */
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const eventRows = events.data?.items ?? [];
  const current = eventRows.find((e) => e.slug === event);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            Event registrations
            {data && (
              <Badge className="!text-[12px]">
                {data.total}
                {filtered && " matching"}
              </Badge>
            )}
          </span>
        }
        description="Everyone who has signed up, with every answer they gave. Pick an event to see its own questions as columns."
        actions={
          /* ⚠ Exports exactly what the filters currently select — the same
             query, so the spreadsheet matches the table rather than being a
             dump of everything. The count says so, because "Export" alone
             leaves an editor guessing whether their filter applied.
             ⚠ A plain block comment, not {/* … *​/} — that form is only valid
             among JSX children, never inside an expression attribute. */
          <>
            <ColumnPicker
              columns={allColumns}
              selected={shown ?? []}
              onChange={setShownColumns}
            />
            <Button onClick={exportCsv} loading={exporting} disabled={!items.length}>
              <IconDownload size={15} stroke={1.8} />
              {data ? `Export ${data.total}` : "Export"}
            </Button>
          </>
        }
      />

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
              placeholder="Search name or email…"
              className="pl-9"
              aria-label="Search"
            />
          </div>

          <Select
            value={event}
            onChange={(e) => setParam("event", e.target.value)}
            className="w-[240px]"
            aria-label="Filter by event"
          >
            <option value="">All events</option>
            {eventRows.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title} ({e.total})
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
            className="w-[140px]"
            aria-label="Filter by status"
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
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

        {/* When one event is picked, say how full it is — the number an
            organiser actually wants. */}
        {current && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-canvas px-4 py-2.5 text-[12.5px]">
            <span className="font-medium text-fg">{current.title}</span>
            {current.date && (
              <span className="text-fg-muted">{formatDay(current.date)}</span>
            )}
            <span className="text-fg-muted">
              {current.taken} signed up
              {current.spots ? ` of ${current.spots} places` : ""}
              {current.spots && current.taken >= current.spots && (
                <span className="ml-2 font-medium text-danger">Full</span>
              )}
            </span>
          </div>
        )}

        {loading && !data ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={IconInbox}
            title={filtered ? "Nothing matches those filters" : "No sign-ups yet"}
            body={
              filtered
                ? "Try clearing the search or the filters."
                : "When someone registers for an event, they appear here with every answer they gave."
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
                {/* ⚠ The event column is pointless when the list is already
                    filtered to one event — that column would repeat the same
                    title on every row, using width the answers need. */}
                {!event && <Th className="w-[200px]">Event</Th>}
                <Th className="w-[120px]">Status</Th>
                {/* One line each. A question is a sentence, so a few of these
                    push the table past the window — which is what the wrapper's
                    horizontal scroll is for. */}
                {columns.map((c) => (
                  <Th key={c.key} className="whitespace-nowrap">
                    {c.label}
                  </Th>
                ))}
                <Th className="w-[130px]">Country</Th>
                <Th className="w-[110px]">Signed up</Th>
                <Th className="w-[88px] text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </Thead>
              <Tbody>
                {items.map((row) => (
                  <Tr
                    key={row.id}
                    className={row.status === "cancelled" ? "opacity-55" : undefined}
                  >
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
                          {row.email || `${row.answers.length} answers`}
                        </span>
                      </button>
                    </Td>
                    {!event && (
                      <Td className="max-w-[200px]">
                        <span className="block truncate text-fg-muted">
                          {row.eventTitle || row.eventSlug}
                        </span>
                      </Td>
                    )}
                    <Td>
                      <Badge tone={STATUS_TONE[row.status]}>
                        <span className="capitalize">{row.status}</span>
                      </Badge>
                    </Td>
                    {columns.map((c) => {
                      const answer = (row.answers ?? []).find((a) => a.key === c.key);
                      const text = answer ? answerText(answer) : null;
                      return (
                        <Td key={c.key} className="max-w-[240px]">
                          <span
                            title={text ?? undefined}
                            className={cx(
                              "block truncate",
                              text ? "text-fg" : "text-fg-subtle"
                            )}
                          >
                            {/* A row whose form never asked this shows a dash,
                                not the word "Not answered" — across events most
                                cells would otherwise be that phrase. */}
                            {text ?? "—"}
                          </span>
                        </Td>
                      );
                    })}
                    <Td>
                      <CountryBadges codes={[row.country]} />
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-fg-muted">
                        {formatWhen(row.submittedAt)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      {/* ⚠ Disabled with a REASON in the tooltip rather than
                          hidden. A button that is simply absent on some rows
                          reads as a bug; one that says why it cannot be used
                          answers the question instead. */}
                      <button
                        type="button"
                        onClick={() => setPendingResend(row)}
                        disabled={!row.email || row.status === "cancelled"}
                        title={
                          !row.email
                            ? "No email address was given"
                            : row.status === "cancelled"
                              ? "Cancelled — the confirmation says a place is booked"
                              : sentSummary(row)
                        }
                        aria-label={`Resend the confirmation to ${row.name || "this person"}`}
                        className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg-subtle"
                      >
                        <IconMailForward size={15} stroke={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(row)}
                        aria-label={`Delete the registration from ${row.name || "someone"}`}
                        className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <IconTrash size={15} stroke={1.8} />
                      </button>
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

      <Detail
        row={open}
        onClose={() => setOpen(null)}
        onResend={setPendingResend}
        onChanged={() => {
          reload();
          events.reload();
          setOpen(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingResend)}
        onClose={() => setPendingResend(null)}
        onConfirm={resend}
        loading={resending}
        title="Resend the confirmation?"
        confirmLabel="Send it"
        /* ⚠ Not `variant="danger"`. Sending cannot be undone, but it destroys
           nothing, and a red button here would misdescribe the action. */
        confirmVariant="primary"
        body={`A fresh confirmation for “${pendingResend?.eventTitle || pendingResend?.eventSlug}” will be emailed to ${pendingResend?.email}. It carries the event's details as they stand now, so a corrected date or venue goes out with it.`}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        title="Delete this registration?"
        name={pendingDelete?.name || pendingDelete?.email}
        body="This removes the person's answers permanently. If they simply are not coming, mark them cancelled instead."
      />
    </>
  );
}
