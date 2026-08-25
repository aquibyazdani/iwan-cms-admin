import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";

/* GET a path and keep the result, with the three things every screen doing that
   needs: a loading flag, an error, and a way to refetch after a write.

   Deliberately not a cache. There is one editor per screen and the data changes
   because THEY changed it, so a stale-while-revalidate layer would only add a
   window in which a list shows the row someone just deleted. */
export function useFetch(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);

  /* Bumped by reload() to re-run the effect. A boolean would not re-trigger on
     a second reload while the first was still in flight. */
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /* Guards against the classic out-of-order response: type "ram" quickly and
     the request for "ra" can land after the one for "ram". Aborting the old one
     means the newest request is always the one that sets state. */
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return () => {};
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    api
      .get(path, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        /* An abort is this hook replacing its own request, not a failure. */
        if (err.name === "AbortError" || controller.signal.aborted) return;
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [path, enabled, nonce]);

  return { data, error, loading, reload, setData };
}

export default useFetch;
