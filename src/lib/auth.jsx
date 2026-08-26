import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  readToken,
  setUnauthorizedHandler,
  writeRemember,
  writeToken,
} from "./api.js";

const AuthContext = createContext(null);

/* Who is signed in, and the two calls that change that. The token lives in
   local or session storage (whichever "remember me" chose) and the user is
   re-fetched from /api/auth/me on every boot rather than cached alongside it —
   which is what makes a stale token fail at startup rather than on whichever
   action the editor tried first. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  /* Distinct from "no user" — on the first render we do not yet KNOW, and
     rendering sign-in then flashes it at someone already signed in. */
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    writeToken(null);
    setUser(null);
  }, []);

  /* Any 401 anywhere ends the session — see setUnauthorizedHandler in api.js.
     In an effect so it is torn down with the provider. */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      writeToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!readToken()) {
      setReady(true);
      return () => {};
    }

    api
      .get("/api/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        /* A bad token or a dead API — either way there is no session, and the
           sign-in screen reports the real problem when it is used. */
        if (!cancelled) writeToken(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* `remember` decides how long the session outlives this visit — see
     writeToken. Defaults to true, which is how this behaved before the box
     existed. */
  const signIn = useCallback(async (email, password, remember = true) => {
    /* ⚠ `auth: false`, so a 401 here is "wrong password" and does not trip the
       global session-expired handler — a sign-out from the sign-in screen. */
    const data = await api.post("/api/auth/login", { email, password }, { auth: false });
    writeRemember(remember);
    writeToken(data.token, remember);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      signIn,
      signOut,
      setUser,
      isAdmin: user?.role === "admin",
      /* EMPTY means unscoped — every country — as everywhere else. */
      allowedCountries: user?.countries ?? [],
    }),
    [user, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export default AuthProvider;
