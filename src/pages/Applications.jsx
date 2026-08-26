import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconDownload, IconBriefcase, IconSearch, IconTrash } from "@tabler/icons-react";
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

const KINDS = [
  { value: "volunteer", label: "Volunteer" },
  { value: "career", label: "Career" },
];

const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

const STATUSES = ["new", "reviewing", "accepted", "declined"];

const STATUS_TONE = {
  new: "accent",
  reviewing: "warn",
  accepted: "success",
  declined: "neutral",
};

/* Every question either form asks, in the order first seen across the rows on
   screen — so both kinds' columns are present and the table does not change
   shape as the filter moves.

   ⚠ Driven by the answers rather than by a copy of the API's question lists.
   The API records a question even when it was left blank, which is what lets a
   row tell "asked, unanswered" from "never asked". */
function questionColumns(rows) {
  const seen = [];
  for (const row of rows) {
    for (const a of row.answers ?? []) {
      if (!seen.some((q) => q.key === a.key)) seen.push({ key: a.key, label: a.label });
    }
  }
  return seen;
}

/* ⚠ Two different absences, and the point of showing them differently: NA means
   this kind of application never asks the question, so nothing is missing. The
   dash means it was asked and left blank, which is a real gap. */
function answerCell(row, key) {
  const answer = (row.answers ?? []).find((a) => a.key === key);
  if (!answer) return { text: "NA", missing: true };

  const { value } = answer;
  const text =
    value === null || value === undefined || value === ""
      ? "—"
      : Array.isArray(value)
        ? value.join(", ")
        : typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : String(value);

  return { text, missing: text === "—" };
}

/* A field every row has, so empty is a dash rather than NA. */
const plain = (value) => (value === "" || value == null ? "—" : String(value));

function Detail({ row, onClose, onChanged }) {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [note, setNote] = useState(row?.note ?? "");
  const [saving, setSaving] = useState(false);

  if (!row) return null;

  const patch = async (body, said) => {
    try {
      await api.patch(`/api/admin/applications/${row.id}`, body);
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
      description={`${KIND_LABEL[row.kind] ?? row.kind}${row.role ? ` · ${row.role}` : ""} · ${formatWhen(row.submittedAt)}`}
      width="max-w-[640px]"
      footer={
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ status: s }, `Marked ${s}`)}
                className={cx(
                  "rounded-full border px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                  row.status === s
                    ? "border-fg bg-fg text-fg-invert"
                    : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
                )}
              >
                {s}
              </button>
            ))
          ) : (
            <Badge tone={STATUS_TONE[row.status]}>
              <span className="capitalize">{row.status}</span>
            </Badge>
          )}
        </div>

        <dl className="divide-y divide-line rounded-lg border border-line">
          {[
            ["Email", row.email],
            ["Mobile", row.mobile || "Not given"],
            ...row.answers.map((a) => [a.label, String(a.value ?? "") || "Not answered"]),
          ].map(([label, value]) => (
            <div key={label} className="px-3.5 py-2.5">
              <dt className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-fg-subtle">
                {label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-fg">
                {value}
              </dd>
            </div>
          ))}
        </dl>

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

export default function Applications() {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [params, setParams] = useSearchParams();

  const kind = params.get("kind") ?? "";
  const status = params.get("status") ?? "";
  const country = params.get("country") ?? "";
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
      `/api/admin/applications${query({ kind, status, country, q, page, limit: PER_PAGE })}`,
    [kind, status, country, q, page]
  );

  const { data, error, loading, reload } = useFetch(path);
  const items = data?.items ?? [];
  const columns = useMemo(() => questionColumns(items), [items]);
  const filtered = Boolean(kind || status || country || q);

  const remove = async () => {
    try {
      await api.del(`/api/admin/applications/${pendingDelete.id}`);
      toast.success("Application deleted");
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/applications/export${query({ kind, status, country, q })}`,
        { headers: { authorization: `Bearer ${readToken()}` } }
      );
      if (!res.ok) throw new Error(`The server said ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = kind ? `${kind}-applications.csv` : "applications.csv";
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
            Volunteer &amp; career
            {data && (
              <Badge className="!text-[12px]">
                {data.total}
                {filtered && " matching"}
              </Badge>
            )}
          </span>
        }
        description="Everyone who has applied to volunteer or to work at Iwan, with the answers they gave. They are on the Audience list too."
        actions={
          <Button onClick={exportCsv} loading={exporting} disabled={!items.length}>
            <IconDownload size={15} stroke={1.8} />
            {data ? `Export ${data.total}` : "Export"}
          </Button>
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
              placeholder="Search name, email or mobile…"
              className="pl-9"
              aria-label="Search"
            />
          </div>

          <Select
            value={kind}
            onChange={(e) => setParam("kind", e.target.value)}
            className="w-[150px]"
            aria-label="Filter by kind"
          >
            <option value="">Both kinds</option>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
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

        {loading && !data ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={IconBriefcase}
            title={filtered ? "Nothing matches those filters" : "No applications yet"}
            body={
              filtered
                ? "Try clearing the search or the filters."
                : "When someone applies to volunteer or to work with Iwan, they appear here."
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
                <Th className="w-[110px]">Kind</Th>
                <Th className="w-[150px]">Mobile</Th>
                <Th className="w-[180px]">Role</Th>
                {columns.map((c) => (
                  <Th key={c.key} className="whitespace-nowrap">
                    {c.label}
                  </Th>
                ))}
                <Th className="w-[120px]">Status</Th>
                <Th className="w-[110px]">Country</Th>
                <Th className="w-[110px]">Applied</Th>
                <Th className="w-[130px]">Note</Th>
                <Th className="w-[52px] text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </Thead>
              <Tbody>
                {items.map((row) => (
                  <Tr key={row.id}>
                    <Td className="max-w-[260px]">
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
                      <Badge>{KIND_LABEL[row.kind] ?? row.kind}</Badge>
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-fg-muted">
                        {plain(row.mobile)}
                      </span>
                    </Td>
                    <Td className="max-w-[180px]">
                      <span className="block truncate text-fg-muted">
                        {plain(row.role)}
                      </span>
                    </Td>
                    {columns.map((c) => {
                      const { text, missing } = answerCell(row, c.key);
                      return (
                        <Td key={c.key} className="max-w-[240px]">
                          <span
                            title={missing ? undefined : text}
                            className={cx(
                              "block truncate",
                              missing ? "text-fg-subtle" : "text-fg"
                            )}
                          >
                            {text}
                          </span>
                        </Td>
                      );
                    })}
                    <Td>
                      <Badge tone={STATUS_TONE[row.status]}>
                        <span className="capitalize">{row.status}</span>
                      </Badge>
                    </Td>
                    <Td>
                      <CountryBadges codes={[row.country]} />
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-fg-muted">
                        {formatWhen(row.submittedAt)}
                      </span>
                    </Td>
                    <Td className="max-w-[130px]">
                      <span
                        title={row.note || undefined}
                        className={cx(
                          "block truncate",
                          row.note ? "text-fg" : "text-fg-subtle"
                        )}
                      >
                        {plain(row.note)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete the application from ${row.name || row.email}`}
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

      <Detail
        row={open}
        onClose={() => setOpen(null)}
        onChanged={() => {
          reload();
          setOpen(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        title="Delete this application?"
        name={pendingDelete?.name || pendingDelete?.email}
        body="This removes their answers permanently. They stay on the Audience list."
      />
    </>
  );
}
