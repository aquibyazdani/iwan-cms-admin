import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, readToken, setUnauthorizedHandler, writeToken } from "./api.js";

const AuthContext = createContext(null);

/* Who is signed in, and the two calls that change that.

   The token lives in localStorage and the user is re-fetched from /api/auth/me
   on every boot rather than being cached alongside it. That one request is what
   makes a revoked or expired token fail at startup — landing on the sign-in
   screen — instead of failing on whichever action the editor tried first. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  /* Distinct from "no user": on the very first render we do not yet KNOW, and
     rendering the sign-in screen during that moment would flash it at someone
     who is already signed in. */
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    writeToken(null);
    setUser(null);
  }, []);

  /* Any 401 from anywhere in the app ends the session, not just one from this
     module — see setUnauthorizedHandler in api.js. Registered in an effect so
     it is torn down with the provider. */
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
        /* A bad token, or an API that is down. Either way there is no session;
           the sign-in screen will report the real problem when it is used. */
        if (!cancelled) writeToken(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    /* `auth: false` so a 401 here is "wrong password" and does not trip the
       global session-expired handler — which would be a sign-out from the
       sign-in screen. */
    const data = await api.post("/api/auth/login", { email, password }, { auth: false });
    writeToken(data.token);
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
      /* The countries this account may write to. EMPTY means unscoped — every
         country — which is the same convention the content documents use, and
         what CountryPicker reads to decide what to disable. */
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
