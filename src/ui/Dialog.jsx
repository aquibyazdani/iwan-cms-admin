import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { cx } from "../lib/cx.js";
import { Button } from "./Button.jsx";

/* A modal shell: backdrop, panel, Escape, body scroll lock, initial focus.

   ⚠ Initial focus goes to the PANEL, not the close button — landing it on Close
   draws a ring around the glyph the moment the dialog opens. */
export function Dialog({ open, onClose, title, description, children, footer, width }) {
  const panelRef = useRef(null);

  /* ⚠ `onClose` is held in a ref rather than named as a dependency, and this
     is the whole reason the dialog was unusable to type in: callers pass an
     inline arrow, so it is a new value every render, and the effect re-ran on
     every keystroke — calling `panelRef.current.focus()` and pulling focus out
     of the input mid-word. */
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

    /* Stops the page scrolling under the backdrop. The previous value is
       restored rather than assumed "visible", or the second of two dialogs
       unlocks it. */
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
      {/* Its own element, so a click inside the panel does not need
          stopPropagation to survive. */}
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

/* Where this app asks "are you sure". `name` is echoed back because the usual
   way to act on the wrong thing is to have opened the wrong row.

   Deleting is only the default: `confirmVariant` exists for an action that is
   irreversible without being destructive, like resending an email, where a red
   button would say something untrue about what is happening. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete this?",
  name,
  body,
  confirmLabel = "Delete",
  confirmVariant = "danger",
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
          <Button
            size="sm"
            variant={confirmVariant}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export default Dialog;
