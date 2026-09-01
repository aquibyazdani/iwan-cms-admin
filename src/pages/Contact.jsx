import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconDownload, IconMail, IconSearch } from "@tabler/icons-react";
import { query, API_URL, readToken } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useToast } from "../ui/Toast.jsx";
import { COUNTRIES } from "../lib/countries.js";
import { formatWhen } from "../lib/format.js";
import { Button } from "../ui/Button.jsx";
import { Badge, CountryBadges } from "../ui/Badge.jsx";
import { Input, Select } from "../ui/form.jsx";
import { PageHeader, Panel, Toolbar } from "../ui/Page.jsx";
import { Table, Thead, Tbody, Tr, Th, Td, Pagination } from "../ui/Table.jsx";
import { EmptyState, ErrorState, TableSkeleton } from "../ui/feedback.jsx";
import { AudienceDetail } from "./Audience.jsx";

const PER_PAGE = 25;

/* The audience narrowed to the contact form — the people who wrote in, with
   their messages front and centre. Same rows, same detail dialog; `source` is
   PINNED in the query rather than offered as a filter, which is the whole
   difference between this and the Audience page. Deleting someone stays on
   Audience: it removes the whole person, not just their messages. */
export default function ContactInbox() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const country = params.get("country") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [open, setOpen] = useState(null);

  const setParam = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const path = useMemo(
    () =>
      `/api/admin/audience${query({ source: "contact", country, q, page, limit: PER_PAGE })}`,
    [country, q, page]
  );

  const { data, error, loading, reload } = useFetch(path);
  const items = data?.items ?? [];
  const filtered = Boolean(country || q);

  /* Messages are appended in the order they arrive, so the last is the latest. */
  const latest = (row) => row.messages?.[row.messages.length - 1] ?? null;

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      /* ⚠ Message COUNTS, not bodies — the export deliberately matches the
         audience one. The CMS is where a message is read. */
      const res = await fetch(
        `${API_URL}/api/admin/audience/export${query({ source: "contact", country, q })}`,
        { headers: { authorization: `Bearer ${readToken()}` } }
      );
      if (!res.ok) throw new Error(`The server said ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "contact.csv";
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
            Contact
            {data && (
              <Badge className="!text-[12px]">
                {data.total}
                {filtered && " matching"}
              </Badge>
            )}
          </span>
        }
        description="Everyone who has written in through the contact form, with what they sent. Nobody is emailed when a message arrives — this is where they are read."
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
            icon={IconMail}
            title={filtered ? "Nobody matches those filters" : "No messages yet"}
            body={
              filtered
                ? "Try clearing the search or the filters."
                : "When someone sends the contact form, they and their message appear here."
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
                <Th>Last message</Th>
                <Th className="w-[100px]">Messages</Th>
                <Th className="w-[120px]">Newsletter</Th>
                <Th className="w-[110px]">Country</Th>
                <Th className="w-[110px]">Last seen</Th>
              </Thead>
              <Tbody>
                {items.map((row) => {
                  const message = latest(row);
                  return (
                    <Tr key={row.id}>
                      <Td className="max-w-[240px]">
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
                      <Td className="max-w-[320px]">
                        {message ? (
                          <>
                            <span className="block truncate text-fg">
                              {message.subject || "No subject"}
                            </span>
                            <span className="block truncate text-[12px] text-fg-subtle">
                              {formatWhen(message.at)}
                            </span>
                          </>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </Td>
                      <Td>
                        <Badge>{row.messages?.length ?? 0}</Badge>
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
                    </Tr>
                  );
                })}
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
          setOpen(null);
        }}
      />
    </>
  );
}
