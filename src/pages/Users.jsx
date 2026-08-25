import { useState } from "react";
import { IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import { api } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../ui/Toast.jsx";
import { COUNTRIES } from "../lib/countries.js";
import { Button } from "../ui/Button.jsx";
import { Field, Input, Select, Checkbox } from "../ui/form.jsx";
import { PageHeader, Panel } from "../ui/Page.jsx";
import { Table, Thead, Tbody, Tr, Th, Td } from "../ui/Table.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Dialog, ConfirmDialog } from "../ui/Dialog.jsx";
import { EmptyState, ErrorState, TableSkeleton, Alert } from "../ui/feedback.jsx";
import { formatWhen } from "../lib/format.js";

/* Admin-only. Kept a deliberately thin screen: create an account, scope it,
   deactivate it, delete it. Anything more (password reset flows, invitations)
   would need email, which this service does not have. */
export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useFetch("/api/admin/users");

  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const items = data?.items ?? [];

  const setActive = async (row, active) => {
    try {
      await api.patch(`/api/admin/users/${row.id}`, { active });
      toast.success(active ? "Account reactivated" : "Account deactivated");
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/api/admin/users/${pendingDelete.id}`);
      toast.success("Account deleted");
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="People"
        description="Who can sign in and edit. An editor scoped to a country can only publish there — and cannot publish to every country, since that would include the ones they do not have."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <IconPlus size={15} stroke={2} />
            Add someone
          </Button>
        }
      />

      <Panel>
        {loading && !data ? (
          <TableSkeleton rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState icon={IconUsers} title="No accounts yet" />
        ) : (
          <Table>
            <Thead>
              <Th>Person</Th>
              <Th className="w-[110px]">Role</Th>
              <Th className="w-[190px]">Can publish to</Th>
              <Th className="w-[120px]">Last signed in</Th>
              <Th className="w-[150px] text-right">
                <span className="sr-only">Actions</span>
              </Th>
            </Thead>
            <Tbody>
              {items.map((row) => {
                const isMe = row.id === me?.id;
                return (
                  <Tr key={row.id} className={!row.active ? "opacity-55" : undefined}>
                    <Td>
                      <p className="font-medium text-fg">
                        {row.name || "—"}
                        {isMe && (
                          <span className="ml-2 text-[12px] text-fg-subtle">(you)</span>
                        )}
                      </p>
                      <p className="text-[12px] text-fg-subtle">{row.email}</p>
                    </Td>
                    <Td>
                      <Badge tone={row.role === "admin" ? "accent" : "neutral"}>
                        {row.role === "admin" ? "Admin" : "Editor"}
                      </Badge>
                    </Td>
                    <Td>
                      {row.role === "admin" || row.countries.length === 0 ? (
                        <span className="text-fg-muted">Everywhere</span>
                      ) : (
                        <span className="text-fg-muted">
                          {row.countries
                            .map((c) => COUNTRIES.find((x) => x.code === c)?.label ?? c)
                            .join(", ")}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-fg-muted">{formatWhen(row.lastLoginAt)}</span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isMe}
                          onClick={() => setActive(row, !row.active)}
                        >
                          {row.active ? "Deactivate" : "Reactivate"}
                        </Button>
                        <button
                          type="button"
                          disabled={isMe}
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete ${row.email}`}
                          className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                        >
                          <IconTrash size={15} stroke={1.8} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Panel>

      <NewUserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        title="Delete this account?"
        name={pendingDelete?.email}
      />
    </>
  );
}

const BLANK = {
  name: "",
  email: "",
  password: "",
  role: "editor",
  countries: [],
};

function NewUserDialog({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setForm(BLANK);
    setErrors({});
    setBanner(null);
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setErrors({});
    setBanner(null);
    try {
      await api.post("/api/admin/users", form);
      toast.success(`${form.email} can now sign in`);
      setForm(BLANK);
      onCreated();
    } catch (err) {
      const fieldErrors = err.fieldErrors ?? {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setBanner(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  const toggleCountry = (code, on) =>
    setForm({
      ...form,
      countries: on
        ? [...form.countries, code]
        : form.countries.filter((c) => c !== code),
    });

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add someone"
      description="They sign in with this email and password. There is no invitation email — tell them the password yourself, over something other than email."
      width="max-w-[520px]"
      footer={
        <>
          <Button size="sm" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" loading={busy} onClick={submit}>
            Create account
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {banner && <Alert>{banner}</Alert>}

        <Field label="Name" error={errors.name}>
          {(props) => <Input {...props} value={form.name} onChange={set("name")} />}
        </Field>

        <Field label="Email" required error={errors.email}>
          {(props) => (
            <Input {...props} type="email" value={form.email} onChange={set("email")} />
          )}
        </Field>

        <Field
          label="Password"
          required
          error={errors.password}
          hint="At least 10 characters. They cannot change it themselves from this screen — they change it after signing in."
        >
          {(props) => (
            <Input
              {...props}
              type="text"
              /* Deliberately not a password field: whoever is creating the
                 account has to read this back to hand it over, and a masked
                 box they cannot see is how a typo becomes a support request. */
              spellCheck={false}
              value={form.password}
              onChange={set("password")}
              className="font-mono"
            />
          )}
        </Field>

        <Field label="Role" error={errors.role}>
          {(props) => (
            <Select {...props} value={form.role} onChange={set("role")}>
              <option value="editor">Editor — content only</option>
              <option value="admin">Admin — content and accounts</option>
            </Select>
          )}
        </Field>

        {form.role === "editor" && (
          <Field
            label="Country scope"
            hint="Leave both unticked for an editor who can publish anywhere."
          >
            {() => (
              <div className="grid gap-2 sm:grid-cols-2">
                {COUNTRIES.map((country) => (
                  <Checkbox
                    key={country.code}
                    checked={form.countries.includes(country.code)}
                    onChange={(on) => toggleCountry(country.code, on)}
                    label={
                      <>
                        <span aria-hidden="true" className="mr-1.5">
                          {country.flag}
                        </span>
                        {country.label}
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Field>
        )}
      </div>
    </Dialog>
  );
}
