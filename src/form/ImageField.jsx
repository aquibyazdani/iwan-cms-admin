import { useRef, useState } from "react";
import { IconPhotoUp, IconX } from "@tabler/icons-react";
import { uploadImage } from "../lib/api.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/form.jsx";
import { cx } from "../lib/cx.js";

/* An image URL, with a way to make one.

   ⚠ The stored value is still just a URL STRING — the same field it always
   was. Uploading only fills it in: the file goes to R2 and the CDN URL it
   comes back with is typed into the box for you. So a pasted URL keeps
   working, the existing hotlinked images keep working, and no model,
   serialiser or page downstream can tell the difference.

   The preview is the real proof. It renders the URL in the box, whatever put
   it there, so a broken paste shows as broken here rather than on the site. */
export default function ImageField({ value, onChange, placeholder }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  /* Reset per URL, so a new value gets a fresh chance to load. */
  const [broken, setBroken] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    /* ⚠ Cleared straight away: picking the SAME file twice fires no change
       event otherwise, so a failed upload could not be retried. */
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setFailed("");
    try {
      const { url } = await uploadImage(file);
      setBroken(false);
      onChange(url);
    } catch (err) {
      setFailed(err.fieldErrors?.file ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          spellCheck={false}
          value={value ?? ""}
          placeholder={placeholder ?? "https://"}
          onChange={(e) => {
            setBroken(false);
            setFailed("");
            onChange(e.target.value);
          }}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          size="sm"
          loading={busy}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex-none"
        >
          <IconPhotoUp size={15} stroke={1.8} />
          Upload
        </Button>
        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Clear the image"
            onClick={() => {
              setBroken(false);
              setFailed("");
              onChange("");
            }}
            className="flex-none"
          >
            <IconX size={15} stroke={1.8} />
          </Button>
        )}
      </div>

      {/* Off-screen rather than hidden — a display:none input cannot be
          clicked open by every browser. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={pick}
        className="sr-only"
        tabIndex={-1}
      />

      {failed && (
        <p role="alert" className="text-[12px] font-medium text-danger">
          {failed}
        </p>
      )}

      {value && !failed && (
        <div className="flex items-center gap-3">
          {broken ? (
            <p className="text-[12px] text-fg-subtle">
              That URL does not load as an image.
            </p>
          ) : (
            <img
              src={value}
              alt=""
              onError={() => setBroken(true)}
              className={cx(
                "h-[72px] w-[128px] rounded border border-line object-cover",
                busy && "opacity-50"
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
