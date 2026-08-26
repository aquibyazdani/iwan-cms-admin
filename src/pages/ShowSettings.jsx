import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useFetch } from "../lib/useFetch.js";
import { useToast } from "../ui/Toast.jsx";
import { Button } from "../ui/Button.jsx";
import { Field, Input, Textarea } from "../ui/form.jsx";
import { PageHeader, Panel, PanelBody, PanelHeader } from "../ui/Page.jsx";
import { ErrorState, Loading } from "../ui/feedback.jsx";

/* The podcast show. A singleton, so a plain form rather than a list — the API
   upserts it, which is why there is no "create the podcast" step. Episodes are
   the part that varies by country. */
export default function ShowSettings() {
  const toast = useToast();
  const { data, error, loading } = useFetch("/api/admin/podcast/show");

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (data)
      setForm({ title: data.title, description: data.description, cover: data.cover });
  }, [data]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const saved = await api.put("/api/admin/podcast/show", form);
      setForm({ title: saved.title, description: saved.description, cover: saved.cover });
      toast.success("Show settings saved");
    } catch (err) {
      setFieldErrors(err.fieldErrors ?? {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState error={error} />;
  if (loading || !form) return <Loading />;

  const set = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Show settings"
        description="The podcast's own title, blurb and artwork. Episodes are managed under Podcast."
        actions={
          <Button type="submit" variant="primary" loading={saving}>
            Save
          </Button>
        }
      />

      <Panel className="max-w-[720px]">
        <PanelHeader title="The show" />
        <PanelBody>
          <div className="flex flex-col gap-5">
            <Field label="Title" error={fieldErrors.title}>
              {(props) => <Input {...props} value={form.title} onChange={set("title")} />}
            </Field>

            <Field label="Description" error={fieldErrors.description}>
              {(props) => (
                <Textarea
                  {...props}
                  rows={4}
                  value={form.description}
                  onChange={set("description")}
                />
              )}
            </Field>

            <Field
              label="Cover URL"
              error={fieldErrors.cover}
              hint="A full https:// URL. Episodes without their own artwork fall back to this."
            >
              {(props) => (
                <Input
                  {...props}
                  type="url"
                  spellCheck={false}
                  value={form.cover}
                  placeholder="https://"
                  onChange={set("cover")}
                />
              )}
            </Field>

            {form.cover && (
              /* `contain`, not `cover` — the artwork is a wide wordmark and a
                 square crop cuts it in half. */
              <div className="grid aspect-[16/9] max-w-[280px] place-items-center overflow-hidden rounded-lg border border-line bg-muted px-6">
                <img
                  src={form.cover}
                  alt=""
                  className="max-h-[70%] w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </PanelBody>
      </Panel>
    </form>
  );
}
