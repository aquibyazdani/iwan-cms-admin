import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IconPlus, IconForms, IconTrash } from "@tabler/icons-react";
import { api, query } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../ui/Toast.jsx";
import { formatWhen, formatCountries } from "../lib/format.js";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { SegmentedControl } from "../ui/form.jsx";
import { PageHeader, Panel, Toolbar } from "../ui/Page.jsx";
import { Table, Thead, Tbody, Tr, Th, Td } from "../ui/Table.jsx";
import { EmptyState, ErrorState, TableSkeleton } from "../ui/feedback.jsx";
import { ConfirmDialog } from "../ui/Dialog.jsx";
import { cx } from "../lib/cx.js";

const KINDS = [
  { value: "volunteer", label: "Volunteer" },
  { value: "career", label: "Career" },
];

/* Every form written for the /volunteer and /careers pages, with one of them
   live. Writing a new one never disturbs the live one — turning it on is a
   separate, deliberate step. */
export default function ApplyForms() {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [params, setParams] = useSearchParams();

  const kind = KINDS.some((k) => k.value === params.get("kind"))
    ? params.get("kind")
    : "volunteer";

  const { data, error, loading, reload } = useFetch(
    `/api/admin/apply-forms${query({ kind })}`
  );

  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(null);

  const items = data?.items ?? [];

  const act = async (row, path, said) => {
    setBusy(row.id);
    try {
      await api.post(`/api/admin/apply-forms/${row.id}/${path}`);
      toast.success(said);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/api/admin/apply-forms/${pendingDelete.id}`);
      toast.success("Form deleted");
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Application forms"
        description="The words and questions on the Volunteer and Careers pages. One form is live at a time, and the site shows exactly what it says."
        actions={
          canWrite ? (
            <Button variant="primary" to={`/apply-forms/new?kind=${kind}`}>
              <IconPlus size={15} stroke={2} />
              New form
            </Button>
          ) : undefined
        }
      />

      <Panel>
        <Toolbar>
          <SegmentedControl
            value={kind}
            options={KINDS}
            onChange={(next) => setParams({ kind: next }, { replace: true })}
          />
        </Toolbar>

        {loading && !data ? (
          <TableSkeleton rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={IconForms}
            title="No forms yet"
            body="Write one and turn it on, and the page starts asking those questions."
            action={
              canWrite ? (
                <Button size="sm" variant="primary" to={`/apply-forms/new?kind=${kind}`}>
                  <IconPlus size={14} stroke={2} />
                  New form
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <Thead>
              <Th>Form</Th>
              <Th className="w-[150px]">Where</Th>
              <Th className="w-[100px]">Questions</Th>
              <Th className="w-[110px]">Updated</Th>
              <Th className="w-[190px] text-right">
                <span className="sr-only">Actions</span>
              </Th>
            </Thead>
            <Tbody>
              {items.map((row) => (
                <Tr key={row.id}>
                  <Td className="max-w-[320px]">
                    <Link
                      to={`/apply-forms/${row.id}`}
                      className="block max-w-full text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-fg hover:text-accent">
                          {row.name}
                        </span>
                        {row.active && <Badge tone="success">Live</Badge>}
                        {row.isDefault && <Badge>Default</Badge>}
                      </span>
                      <span className="block truncate text-[12px] text-fg-subtle">
                        {row.heading || "No heading yet"}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="text-fg-muted">
                      {formatCountries(row.countries)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-fg-muted">{row.fields.length}</span>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-fg-muted">
                      {formatWhen(row.updatedAt)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      {canWrite &&
                        (row.active ? (
                          <Button
                            size="sm"
                            loading={busy === row.id}
                            onClick={() => act(row, "deactivate", "Form turned off")}
                          >
                            Turn off
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={busy === row.id}
                            onClick={() =>
                              act(
                                row,
                                "activate",
                                "Now live — any other form for the same countries was turned off"
                              )
                            }
                          >
                            Make live
                          </Button>
                        ))}
                      {/* ⚠ Neither a live form nor the default can be deleted —
                          the API refuses both, and offering the button anyway
                          is just a click that fails. */}
                      {canWrite && !row.active && !row.isDefault && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete ${row.name}`}
                          className={cx(
                            "rounded p-1.5 text-fg-subtle transition-colors",
                            "hover:bg-danger-soft hover:text-danger"
                          )}
                        >
                          <IconTrash size={15} stroke={1.8} />
                        </button>
                      )}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        title="Delete this form?"
        name={pendingDelete?.name}
        body="Applications already sent through it keep the questions they were given under."
      />
    </>
  );
}
