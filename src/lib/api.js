/* The only place this app talks to the network. Everything goes through
   `request`, so the bearer token, the JSON headers, the error shape and the
   "session expired" behaviour are decided once. */

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  ""
);

const TOKEN_KEY = "iwan-cms.token";
/* The "remember me" answer, so the box comes back as it was left. In
   localStorage even when the answer is "no" — it is a preference, not the
   session it describes. */
const REMEMBER_KEY = "iwan-cms.remember";

/* ⚠ Storage rather than a cookie: the API is a different origin and reads an
   Authorization header, which leaves no CSRF surface. The trade is that a token
   is readable by script here, so an XSS is a session compromise — which is why
   this app renders no user-supplied HTML anywhere.

   WHICH storage is the "remember me" answer: localStorage outlives a restart,
   sessionStorage dies with the tab. Both are read, since only one holds it. */
export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    /* Safari private browsing throws rather than returning null. */
    return null;
  }
};

export const writeToken = (token, remember = true) => {
  try {
    /* ⚠ Clear BOTH first, or signing in with the box unticked leaves the old
       localStorage copy in place and the session outlives the browser anyway —
       the one failure this option exists to prevent. It is also what makes
       writeToken(null) a complete sign-out. */
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    /* nothing to do — the session lives in memory for this tab only */
  }
};

/* Defaults to true, which is what this app did before the checkbox existed. */
export const readRemember = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
};

export const writeRemember = (remember) => {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* the box simply comes back at its default next time */
  }
};

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    /* [{ field, message }] when the API rejected specific fields, so a form
       can show each against its own input rather than as one banner. */
    this.details = payload?.details ?? null;
  }

  /* The shape a form's error state uses. */
  get fieldErrors() {
    if (!this.details) return {};
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

/* Called on any 401: the token is stale and every screen has to drop back to
   sign-in at once. AuthProvider registers itself here on mount; without it a
   401 surfaces as an error banner on whichever screen made the call. */
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
    /* An abort is the caller changing its mind, not a failure — it propagates
       untouched so the caller can ignore it. */
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
    /* ⚠ A 401 on sign-in is "wrong password", not "session expired" — bouncing
       to the login screen from the login screen swallows the message. */
    if (res.status === 401 && auth) onUnauthorized();
    throw new ApiError(res.status, payload);
  }

  return payload;
}

/* Drops empty values, or a blank filter becomes `?country=` — which the API
   reads as an invalid code rather than "no filter". */
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
