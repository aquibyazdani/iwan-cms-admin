import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { cx } from "../lib/cx.js";
import { Button } from "./Button.jsx";

/* A modal shell: backdrop, panel, Escape, a body scroll lock and initial focus.
   Wrap feature content in it — same contract as the public site's Modal.

   ⚠ Initial focus goes to the PANEL, not to the close button. The dialog still
   receives focus, but landing it on Close draws a focus ring around the glyph
   the moment the dialog opens, which reads as a background rather than a
   focused control. */
export function Dialog({ open, onClose, title, description, children, footer, width }) {
  const panelRef = useRef(null);

  /* ⚠ `onClose` is held in a ref rather than named as a dependency, and this is
     the whole reason the dialog was unusable to type in.

     A caller almost always passes an inline arrow or a function defined in its
     own body, so `onClose` is a NEW value on every render. Depending on it made
     this effect tear down and re-run on every keystroke — and re-running it
     calls `panelRef.current.focus()`, which pulled focus out of the input mid
     word. The effect now runs exactly when `open` changes, while the handler
     stays current through the ref. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);

    /* Locking the body is what stops the page behind scrolling under the
       backdrop. The previous value is restored rather than assumed to be
       "visible" — two dialogs and the second one would otherwise unlock. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Only on OPEN — see the note above. */
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* The backdrop is its own element so a click on it closes, while a click
          inside the panel does not have to stopPropagation to survive. */}
      <div
        className="absolute inset-0 animate-in bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          "relative z-[1] flex max-h-[calc(100vh-2rem)] w-full flex-col",
          "animate-pop rounded-xl border border-line bg-surface shadow-dialog outline-none",
          width ?? "max-w-[480px]"
        )}
      >
        <div className="flex items-start gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {description && (
              <p className="mt-1 text-[13px] leading-[1.55] text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg"
          >
            <IconX size={16} stroke={2} />
          </button>
        </div>

        {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}

        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* The delete confirmation, which is the only place this app asks "are you
   sure". `name` is echoed back so an editor can see WHICH row they are about to
   remove — the most common way to delete the wrong thing is to have opened the
   wrong row's menu. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete this?",
  name,
  body,
  confirmLabel = "Delete",
  loading = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={
        body ??
        (name
          ? `“${name}” will be removed permanently. This cannot be undone.`
          : "This cannot be undone.")
      }
      footer={
        <>
          <Button size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export default Dialog;
