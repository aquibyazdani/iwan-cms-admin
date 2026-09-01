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
import Audience from "./pages/Audience.jsx";
import ContactInbox from "./pages/Contact.jsx";
import Applications from "./pages/Applications.jsx";
import ApplyForms from "./pages/ApplyForms.jsx";
import ApplyFormEdit from "./pages/ApplyFormEdit.jsx";
import { RESOURCE_LIST } from "./resources.jsx";

/* Routes generated from RESOURCE_LIST rather than written out, for the same
   reason routes/crud.js exists on the API side.

   ⚠ Each resource gets its own LITERAL path. A single "/:resource" route would
   be shorter and wrong — it would also match /users and /podcast-show and
   render a broken list for them. */
function Signed() {
  const { user, ready, isAdmin } = useAuth();

  /* ⚠ `ready` is not "no user" — on the first render the stored token is still
     being checked, and sign-in then flashes at someone already signed in. */
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

          {/* The old path was in the nav for a while and may be bookmarked. */}
          <Route path="event-registrations" element={<Registrations />} />
          <Route path="audience" element={<Audience />} />
          <Route path="contact" element={<ContactInbox />} />
          <Route path="applications" element={<Applications />} />
          <Route path="apply-forms">
            <Route index element={<ApplyForms />} />
            <Route path=":id" element={<ApplyFormEdit />} />
          </Route>
          <Route
            path="registrations"
            element={<Navigate to="/event-registrations" replace />}
          />
          <Route path="podcast-show" element={<ShowSettings />} />

          <Route
            path="users"
            element={isAdmin ? <Users /> : <Navigate to="/" replace />}
          />

          {/* A mistyped URL, not a page — nothing useful to say, so home. */}
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
