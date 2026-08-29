import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import { api } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Field, Input, Textarea } from "../ui/form.jsx";
import { CountryPicker } from "../ui/CountryPicker.jsx";
import { PageHeader, Panel, PanelBody, PanelHeader } from "../ui/Page.jsx";
import { Alert, ErrorState, Loading } from "../ui/feedback.jsx";
import { ConfirmDialog } from "../ui/Dialog.jsx";
import { FormBuilder } from "../form/FormBuilder.jsx";

/* Every word this screen edits. One list, so the empty state, the load and the
   save payload cannot drift apart. */
const WORDS = [
  ["eyebrow", "Eyebrow", "The small line above the heading"],
  ["heading", "Heading", "The plain first part"],
  ["mark", "Highlighted tail", "The part drawn in the brand colour"],
  ["formHeading", "Above the questions", ""],
  ["submitLabel", "Submit button", ""],
  ["subscribeLabel", "Newsletter checkbox", ""],
  ["doneHeading", "Thank-you heading", ""],
];

const empty = (kind) => ({
  kind,
  name: "",
  countries: [],
  ...Object.fromEntries(WORDS.map(([key]) => [key, ""])),
  intro: "",
  doneBody: "",
  fields: [],
});

const shape = (doc) => ({
  kind: doc.kind,
  name: doc.name ?? "",
  countries: doc.countries ?? [],
  ...Object.fromEntries(WORDS.map(([key]) => [key, doc[key] ?? ""])),
  intro: doc.intro ?? "",
  doneBody: doc.doneBody ?? "",
  fields: doc.fields ?? [],
});

/* One form. ⚠ Everything here is what the page renders — there is no site copy
   underneath it any more, so a heading left empty is an empty heading on the
   page. That is the point: what an editor sees here is what a visitor gets. */
export default function ApplyFormEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite, allowedCountries } = useAuth();

  const kindFromUrl = params.get("kind") === "career" ? "career" : "volunteer";

  /* ⚠ `enabled`, not a null path — useFetch would otherwise request the literal
     string "null" against the API. A new form has nothing to load. */
  const { data, error, loading } = useFetch(`/api/admin/apply-forms/${id}`, {
    enabled: !isNew,
  });

  const [form, setForm] = useState(isNew ? empty(kindFromUrl) : null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    if (data) setForm(shape(data));
  }, [data]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    setConfirmSave(true);
  };

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (isNew) await api.post("/api/admin/apply-forms", form);
      else await api.put(`/api/admin/apply-forms/${id}`, form);

      toast.success("Form saved");
      /* Back to the list, where the live one is visible beside this. */
      navigate(`/apply-forms?kind=${form.kind}`, { replace: true });
    } catch (err) {
      const errors = err.fieldErrors ?? {};
      setFieldErrors(errors);
      setFormError(Object.keys(errors).length ? null : err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
      setConfirmSave(false);
    }
  };

  if (error) return <ErrorState error={error} />;
  if (loading || !form) return <Loading />;

  return (
    <form onSubmit={submit}>
      <fieldset disabled={!canWrite} className="contents">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              {isNew ? "New form" : form.name || "Untitled form"}
              {data?.active && <Badge tone="success">Live</Badge>}
              {data?.isDefault && <Badge>Default</Badge>}
            </span>
          }
          description={
            data?.isDefault
              ? "The default form. It can be edited and turned off, but not deleted — it is what the page falls back to when nothing custom is live."
              : data?.active
                ? "This form is live. Saving changes the page straight away."
                : "Not live yet — turn it on from the list when it is ready."
          }
          actions={
            <>
              <Button onClick={() => navigate(`/apply-forms?kind=${form.kind}`)}>
                <IconArrowLeft size={15} stroke={2} />
                Back
              </Button>
              {canWrite ? (
                <Button type="submit" variant="primary" loading={saving}>
                  Save
                </Button>
              ) : (
                <span className="text-[13px] text-fg-muted">Read-only</span>
              )}
            </>
          }
        />

        {formError && <Alert>{formError}</Alert>}

        <Panel className="max-w-[900px]">
          <PanelHeader
            title="This form"
            description="The name is only for this list — visitors never see it."
          />
          <PanelBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={fieldErrors.name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.name}
                  placeholder="Volunteer form 2026"
                  onChange={(e) => set("name")(e.target.value)}
                />
              )}
            </Field>

            <Field
              label="Where it applies"
              className="sm:col-span-2"
              hint="A form for specific countries is used there; the everywhere one covers the rest."
              error={fieldErrors.countries}
            >
              {() => (
                <CountryPicker
                  value={form.countries}
                  onChange={set("countries")}
                  allowed={allowedCountries}
                />
              )}
            </Field>
          </PanelBody>

          <PanelHeader
            title="Words"
            description="⚠ Exactly what the page shows. Anything left empty is empty on the site."
          />
          <PanelBody className="grid gap-4 sm:grid-cols-2">
            {WORDS.map(([key, label, hint]) => (
              <Field key={key} label={label} hint={hint} error={fieldErrors[key]}>
                {(props) => (
                  <Input
                    {...props}
                    value={form[key]}
                    onChange={(e) => set(key)(e.target.value)}
                  />
                )}
              </Field>
            ))}

            <Field
              label="Intro"
              className="sm:col-span-2"
              hint="The paragraph under the heading."
              error={fieldErrors.intro}
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  value={form.intro}
                  onChange={(e) => set("intro")(e.target.value)}
                />
              )}
            </Field>

            <Field
              label="Thank-you message"
              className="sm:col-span-2"
              hint="Shown after someone submits."
              error={fieldErrors.doneBody}
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={form.doneBody}
                  onChange={(e) => set("doneBody")(e.target.value)}
                />
              )}
            </Field>
          </PanelBody>

          <PanelHeader
            title="Questions"
            description="⚠ A form must ask for an email before it can go live — every reply, and the link to the audience list, depends on it."
          />
          <PanelBody>
            <FormBuilder
              value={form.fields}
              onChange={set("fields")}
              error={fieldErrors.fields}
              emptyTitle="No questions yet"
              emptyBody="Add the questions people answer when they apply. An email question is required before this form can go live."
            />
          </PanelBody>
        </Panel>

        <ConfirmDialog
          open={confirmSave}
          onClose={() => setConfirmSave(false)}
          onConfirm={save}
          loading={saving}
          title={isNew ? "Create this form?" : "Save changes?"}
          confirmLabel={isNew ? "Create" : "Save"}
          confirmVariant="primary"
          body={
            data?.active
              ? "This form is live, so the page changes as soon as this is saved."
              : "This form is not live, so nothing on the site changes yet."
          }
        />
      </fieldset>
    </form>
  );
}
