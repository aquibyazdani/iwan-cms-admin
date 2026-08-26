import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
import { RESOURCES } from "../resources.jsx";
import { api } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useAuth } from "../lib/auth.jsx";
import { useMeta } from "../lib/meta.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Button } from "../ui/Button.jsx";
import { PageHeader, Panel, PanelBody, PanelHeader } from "../ui/Page.jsx";
import { Alert, ErrorState, Loading } from "../ui/feedback.jsx";
import { ConfirmDialog } from "../ui/Dialog.jsx";
import { StatusBadge } from "../ui/Badge.jsx";
import { renderField, widthClass } from "../form/fields.jsx";
import { PostPreview } from "../ui/PostPreview.jsx";
import { SegmentedControl } from "../ui/form.jsx";
import { cx } from "../lib/cx.js";

/* One form for every content type, driven by the `sections` spec in
   resources.jsx. Create and edit are the same screen. */
export default function ResourceForm({ resourceKey }) {
  const { id } = useParams();
  const resource = RESOURCES[resourceKey];
  const isNew = id === "new";

  const navigate = useNavigate();
  const toast = useToast();
  const meta = useMeta();
  const { allowedCountries } = useAuth();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /* Here rather than in the section, so it survives a re-render. */
  const [bodyView, setBodyView] = useState("write");
  /* What the "unsaved changes" guard below compares against. */
  const [saved, setSaved] = useState(null);

  const { data, error, loading } = useFetch(`/api/admin/${resource?.path}/${id}`, {
    enabled: Boolean(resource) && !isNew,
  });

  /* From the resource's `empty()`, so every field is present on the first
     render — a form that grows inputs as data arrives reflows under the
     cursor. */
  useEffect(() => {
    if (!resource) return;
    if (isNew) {
      const blank = resource.empty();
      setForm(blank);
      setSaved(blank);
    } else if (data) {
      setForm(data);
      setSaved(data);
    }
  }, [resource, isNew, data]);

  const dirty = useMemo(
    () => Boolean(form && saved) && JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved]
  );

  /* Covers closing the tab and external links only; in-app navigation is
     handled by the guard on the back button below. */
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      /* Required by older browsers; the message itself is ignored. */
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setValue = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    /* Cleared as soon as the field is touched — leaving it there while the
       editor fixes it reads as "still wrong". */
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const save = async (event) => {
    event?.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const saved_ = isNew
        ? await api.post(`/api/admin/${resource.path}`, form)
        : await api.put(`/api/admin/${resource.path}/${id}`, form);

      setForm(saved_);
      setSaved(saved_);
      toast.success(`${resource.singular} saved`);

      /* ⚠ The URL has to become the edit URL, or a second save creates a
         duplicate. `replace`, so Back does not return to an empty form. */
      if (isNew) navigate(`/${resource.path}/${saved_.id}`, { replace: true });
    } catch (err) {
      const errors = err.fieldErrors ?? {};
      setFieldErrors(errors);
      /* Field failures show against their field; anything else needs a banner,
         or the form appears to do nothing. */
      setFormError(Object.keys(errors).length ? null : err.message);
      if (Object.keys(errors).length) {
        toast.error("Some fields need fixing");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/api/admin/${resource.path}/${id}`);
      toast.success(`${resource.singular} deleted`);
      navigate(`/${resource.path}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
      setConfirmDelete(false);
    }
  };

  const leave = () => {
    if (dirty && !window.confirm("Leave without saving? Your changes will be lost.")) {
      return;
    }
    navigate(`/${resource.path}`);
  };

  if (!resource) {
    return <ErrorState error={{ message: `There is no "${resourceKey}" section.` }} />;
  }
  if (error) return <ErrorState error={error} />;
  if (loading || !form) return <Loading />;

  return (
    <form onSubmit={save}>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {isNew
              ? `New ${resource.singular.toLowerCase()}`
              : resource.titleOf(form) || "Untitled"}
            {!isNew && <StatusBadge status={form.status} />}
          </span>
        }
        actions={
          <>
            <Button onClick={leave}>
              <IconArrowLeft size={15} stroke={2} />
              Back
            </Button>
            {!isNew && (
              <Button
                variant="danger-quiet"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete"
              >
                <IconTrash size={15} stroke={1.8} />
              </Button>
            )}
            <Button type="submit" variant="primary" loading={saving}>
              Save
            </Button>
          </>
        }
      />

      {formError && (
        <Alert title="That did not save" className="mb-4">
          {formError}
        </Alert>
      )}

      <div className="flex flex-col gap-4 pb-24">
        {resource.sections.map((section) => {
          /* ⚠ Only the section owning `html` — a preview toggle on "When" would
             show an empty page. */
          const previewable = section.fields.some((f) => f.kind === "html");
          const showPreview = previewable && bodyView === "preview";

          return (
            <Panel key={section.title}>
              <PanelHeader
                title={section.title}
                description={showPreview ? undefined : section.description}
                actions={
                  previewable ? (
                    <SegmentedControl
                      value={bodyView}
                      onChange={setBodyView}
                      options={[
                        { value: "write", label: "Write" },
                        { value: "preview", label: "Preview" },
                      ]}
                    />
                  ) : undefined
                }
              />
              <PanelBody>
                {showPreview ? (
                  <PostPreview post={form} />
                ) : (
                  <>
                    {/* Six columns, so a field can be full, half or a third without
                  each section inventing a layout. One column below `sm`, where
                  three in a row are 90px each. */}
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6">
                      {section.fields.map((field) => (
                        <div
                          key={field.name}
                          className={cx("min-w-0", widthClass(field.width))}
                        >
                          {renderField({
                            field,
                            value: form[field.name],
                            onChange: (value) => setValue(field.name, value),
                            error: fieldErrors[field.name],
                            form,
                            isNew,
                            meta,
                            allowedCountries,
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </PanelBody>
            </Panel>
          );
        })}
      </div>

      {/* Pinned, so a long form never scrolls back to the top to commit. Only
          when there is something to save, or it covers the last field. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-in border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-6 py-3">
            <p className="text-[13px] text-fg-muted">You have unsaved changes.</p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setForm(saved)} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" type="submit" variant="primary" loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={`Delete this ${resource.singular.toLowerCase()}?`}
        name={resource.titleOf(form)}
      />
    </form>
  );
}
