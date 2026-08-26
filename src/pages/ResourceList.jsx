import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IconPlus, IconSearch, IconPencil, IconTrash } from "@tabler/icons-react";
import { RESOURCES } from "../resources.jsx";
import { api, query } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useToast } from "../ui/Toast.jsx";
import { COUNTRIES } from "../lib/countries.js";
import { useMeta, NO_PROGRAMME } from "../lib/meta.jsx";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Input, Select } from "../ui/form.jsx";
import { PageHeader, Panel, Toolbar } from "../ui/Page.jsx";
import { Table, Thead, Tbody, Tr, Th, Td, Pagination } from "../ui/Table.jsx";
import { EmptyState, ErrorState, TableSkeleton } from "../ui/feedback.jsx";
import { ConfirmDialog } from "../ui/Dialog.jsx";
import { cx } from "../lib/cx.js";

const PER_PAGE = 25;

/* One list screen for every content type, driven by resources.jsx.

   ⚠ The filters live in the URL, not component state — which makes a filtered
   list shareable and, more usefully, makes Back from an opened row return to
   the list the editor was looking at rather than an unfiltered page one. */
export default function ResourceList({ resourceKey }) {
  const resource = RESOURCES[resourceKey];

  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const meta = useMeta();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const country = params.get("country") ?? "";
  const status = params.get("status") ?? "";
  const programme = params.get("programme") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const setParam = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    /* Back to page one — page 4 of a search matching two rows is an empty
       screen with no obvious way out. */
    if (name !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const path = useMemo(
    () =>
      `/api/admin/${resource?.path}${query({
        country,
        status,
        programme,
        q,
        page,
        limit: PER_PAGE,
      })}`,
    [resource?.path, country, status, programme, q, page]
  );

  const { data, error, loading, reload } = useFetch(path, { enabled: Boolean(resource) });

  if (!resource) {
    return <ErrorState error={{ message: `There is no "${resourceKey}" section.` }} />;
  }

  const items = data?.items ?? [];
  const filtered = Boolean(country || status || programme || q);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/admin/${resource.path}/${pendingDelete.id}`);
      toast.success(`${resource.singular} deleted`);
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {resource.label}
            {/* ⚠ Only once the first response lands — "0" while loading is
                false, and it is the number an editor acts on. */}
            {data && (
              <Badge tone="neutral" className="!text-[12px]">
                {data.total}
                {/* Saying "matching" is the difference between "we lost your
                    posts" and "the filter is working". */}
                {filtered && " matching"}
              </Badge>
            )}
          </span>
        }
        description={resource.description}
        actions={
          <Button variant="primary" to={`/${resource.path}/new`}>
            <IconPlus size={15} stroke={2} />
            New {resource.singular.toLowerCase()}
          </Button>
        }
      />

      <Panel>
        <Toolbar>
          <div className="relative min-w-[200px] flex-1">
            <IconSearch
              size={15}
              stroke={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <Input
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder={`Search ${resource.label.toLowerCase()}…`}
              className="pl-9"
              aria-label="Search"
            />
          </div>

          <Select
            value={country}
            onChange={(e) => setParam("country", e.target.value)}
            className="w-[150px]"
            aria-label="Filter by country"
          >
            <option value="">All countries</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>

          {/* Only for types with a programme — one that can never match is
              worse than none. */}
          {resource.hasProgramme && (
            <Select
              value={programme}
              onChange={(e) => setParam("programme", e.target.value)}
              className="w-[170px]"
              aria-label="Filter by programme"
            >
              <option value="">All programmes</option>
              {meta.programmes.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
              {/* ⚠ A sentinel, not "" — empty is indistinguishable from "no
                  filter" by the time it reaches the API. */}
              <option value={NO_PROGRAMME}>Open to all</option>
            </Select>
          )}

          <Select
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
            className="w-[140px]"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
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
            icon={resource.icon}
            title={
              filtered
                ? `No ${resource.label.toLowerCase()} match those filters`
                : `No ${resource.label.toLowerCase()} yet`
            }
            body={
              filtered ? "Try clearing the search or the filters." : resource.emptyBody
            }
            action={
              filtered ? (
                <Button size="sm" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" variant="primary" to={`/${resource.path}/new`}>
                  <IconPlus size={14} stroke={2} />
                  New {resource.singular.toLowerCase()}
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <Thead>
                {resource.columns.map((col) => (
                  <Th key={col.header} className={col.width}>
                    {col.header}
                  </Th>
                ))}
                <Th className="w-[92px] text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </Thead>
              <Tbody>
                {items.map((row) => (
                  <Tr
                    key={row.id}
                    /* Dimmed as well as badged — the eye finds faded rows
                       before it reads a label. */
                    className={cx(row.status === "draft" && "bg-canvas/60")}
                  >
                    {resource.columns.map((col, i) => (
                      <Td key={col.header} className={cx(i === 0 && "max-w-[340px]")}>
                        {i === 0 ? (
                          /* The whole cell is the link — a bigger target than
                             the title text alone. */
                          <Link
                            to={`/${resource.path}/${row.id}`}
                            className="block rounded transition-opacity hover:opacity-80"
                          >
                            {col.cell(row)}
                          </Link>
                        ) : (
                          col.cell(row)
                        )}
                      </Td>
                    ))}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/${resource.path}/${row.id}`}
                          aria-label={`Edit ${resource.titleOf(row) ?? "item"}`}
                          className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg"
                        >
                          <IconPencil size={15} stroke={1.8} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete ${resource.titleOf(row) ?? "item"}`}
                          className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <IconTrash size={15} stroke={1.8} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              onPage={(next) => setParam("page", String(next))}
            />
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete this ${resource.singular.toLowerCase()}?`}
        name={pendingDelete ? resource.titleOf(pendingDelete) : null}
      />
    </>
  );
}
