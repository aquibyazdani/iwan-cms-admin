import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";
import { cx } from "../lib/cx.js";

/* Confirmation that something happened, without stealing focus.

   Saving is the most common action in this tool and it happens without the
   screen changing, so an editor needs to be told it worked. A dialog would
   interrupt; a line of text under the button would be missed. */

const ToastContext = createContext(null);

const ICONS = { success: IconCheck, error: IconX, warn: IconAlertTriangle };

const TONES = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
  warn: "border-warn/30 bg-warn-soft text-warn",
};

const DURATION = { success: 3000, warn: 5000, error: 7000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  /* An incrementing id rather than a timestamp: two toasts raised in the same
     millisecond would collide on a key and React would reuse the wrong node. */
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, tone = "success") => {
      const id = (nextId.current += 1);
      setToasts((list) => [...list, { id, message, tone }]);
      setTimeout(() => dismiss(id), DURATION[tone] ?? 4000);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
      warn: (m) => toast(m, "warn"),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* `aria-live="polite"` announces a toast after whatever the user is
          doing, rather than interrupting them mid-sentence. The region stays
          mounted and empty so a screen reader is already watching it — one
          added later is not announced at all. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICONS[tone] ?? IconCheck;
          return (
            <div
              key={id}
              className={cx(
                "pointer-events-auto flex animate-pop items-start gap-2.5",
                "rounded-lg border px-3.5 py-3 text-[13px] shadow-pop",
                TONES[tone]
              )}
            >
              <Icon size={16} stroke={2} className="mt-px shrink-0" />
              <span className="min-w-0 flex-1 break-words">{message}</span>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss"
                className="-m-1 shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <IconX size={14} stroke={2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export default ToastProvider;
