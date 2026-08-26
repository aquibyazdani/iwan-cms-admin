import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";

/* GET a path and keep the result: a loading flag, an error, and a refetch.

   Deliberately not a cache — one editor per screen, and the data changes
   because THEY changed it, so stale-while-revalidate would only add a window
   where the list still shows the row they just deleted. */
export function useFetch(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);

  /* A counter, not a boolean — that would not re-trigger on a second reload
     while the first was in flight. */
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /* ⚠ Out-of-order responses: type "ram" quickly and the request for "ra" can
     land after it. Aborting means the newest request sets state. */
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
        /* An abort is this hook replacing its own request. */
        if (err.name === "AbortError" || controller.signal.aborted) return;
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [path, enabled, nonce]);

  return { data, error, loading, reload, setData };
}

export default useFetch;
