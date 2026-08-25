import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import { MetaProvider } from "./lib/meta.jsx";
import { ToastProvider } from "./ui/Toast.jsx";
import { Loading } from "./ui/feedback.jsx";
import Shell from "./layout/Shell.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResourceList from "./pages/ResourceList.jsx";
import ResourceForm from "./pages/ResourceForm.jsx";
import ShowSettings from "./pages/ShowSettings.jsx";
import Users from "./pages/Users.jsx";
import Registrations from "./pages/Registrations.jsx";
import { RESOURCE_LIST } from "./resources.jsx";

/* Four content types, one list screen and one form screen.

   The routes are generated from RESOURCE_LIST rather than written out, for the
   same reason routes/crud.js exists on the API side: the types differ in their
   fields and in nothing else, so a fifth one should not mean four more lines
   here that can be forgotten.

   ⚠ Each resource gets its own LITERAL path (`/events`, `/blogs`, …) and the
   resource is handed to the screen as a prop. A single "/:resource" route would
   be shorter and wrong: it would also match /users and /podcast-show and render
   a broken list for them. */
function Signed() {
  const { user, ready } = useAuth();

  /* ⚠ `ready` is not the same as "no user". On the very first render the stored
     token is still being checked, and rendering the sign-in screen during that
     moment flashes it at someone who is already signed in. */
  if (!ready) return <Loading label="Signing in…" />;
  if (!user) return <Login />;

  return (
    <MetaProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />

          {RESOURCE_LIST.map((resource) => (
            <Route key={resource.key} path={resource.path}>
              <Route index element={<ResourceList resourceKey={resource.key} />} />
              <Route path=":id" element={<ResourceForm resourceKey={resource.key} />} />
            </Route>
          ))}

          {/* ⚠ The old /registrations path is kept as a redirect: it was in the nav
              for a while and may be bookmarked. */}
          <Route path="event-registrations" element={<Registrations />} />
          <Route
            path="registrations"
            element={<Navigate to="/event-registrations" replace />}
          />
          <Route path="podcast-show" element={<ShowSettings />} />
          <Route path="users" element={<Users />} />

          {/* Anything else is a mistyped URL, not a page — there is nothing
              useful to say about it, so it goes home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MetaProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Signed />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
