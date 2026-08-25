/* The only place this app talks to the network.

   Every call goes through `request`, which means the bearer token, the JSON
   headers, the error shape and the "your session expired" behaviour are decided
   once rather than in each of a dozen screens. */

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  ""
);

const TOKEN_KEY = "iwan-cms.token";

/* localStorage rather than a cookie: the API is on a different origin and takes
   its token from an Authorization header, which is what keeps it free of any
   CSRF surface. The trade is that a token is readable by script on this origin,
   so an XSS here is a session compromise — worth knowing, and the reason this
   app renders no user-supplied HTML anywhere. */
export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    /* Safari private browsing throws rather than returning null. The session
       simply will not survive a reload. */
    return null;
  }
};

export const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to do — the session lives in memory for this tab only */
  }
};

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    /* [{ field, message }] when the API rejected specific fields, so a form can
       show each message against its own input instead of one banner. */
    this.details = payload?.details ?? null;
  }

  /* Turns the details into the shape a form's error state uses. */
  get fieldErrors() {
    if (!this.details) return {};
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

/* Called with no arguments when a request comes back 401 — the token is stale,
   and every screen has to drop back to the sign-in page at once. AuthProvider
   registers itself here on mount; without it a 401 would only surface as an
   error banner on whichever screen happened to make the call. */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, path, { body, signal, auth = true } = {}) {
  const token = auth ? readToken() : null;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    /* An aborted request is the caller changing its mind, not a failure — it
       has to propagate untouched so the caller can ignore it. */
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, {
      error: `Cannot reach the API at ${API_URL}. Is it running?`,
    });
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    /* 401 on the sign-in call itself is "wrong password", not "session
       expired" — bouncing to the login screen from the login screen would
       swallow the message. */
    if (res.status === 401 && auth) onUnauthorized();
    throw new ApiError(res.status, payload);
  }

  return payload;
}

/* Drops empty values so a blank filter does not become `?country=` — which the
   API would read as a real (invalid) code rather than as "no filter". */
export const query = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const api = {
  get: (path, opts) => request("GET", path, opts),
  post: (path, body, opts) => request("POST", path, { ...opts, body }),
  put: (path, body, opts) => request("PUT", path, { ...opts, body }),
  patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
  del: (path, opts) => request("DELETE", path, opts),
};

export default api;
