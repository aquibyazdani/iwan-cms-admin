import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { API_URL } from "../lib/api.js";
import { Button } from "../ui/Button.jsx";
import { Field, Input } from "../ui/form.jsx";
import { Alert } from "../ui/feedback.jsx";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      /* No navigate() — App renders the shell instead of this screen as soon as
         `user` is set, and the router lands on whatever route was asked for. */
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-fg text-[14px] font-bold text-fg-invert">
            i
          </span>
          <div>
            <h1 className="text-[16px] font-semibold leading-tight text-fg">Iwan CMS</h1>
            <p className="text-[12.5px] text-fg-subtle">Content for iwan.community</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6"
        >
          {error && <Alert>{error}</Alert>}

          {/* ⚠ `type="text"`, not `type="email"`. An account can sign in with a
              username as well as an email address, and the browser's own email
              validation would block "admin2026" before the form ever
              submitted. */}
          <Field label="Email or username">
            {(props) => (
              <Input
                {...props}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <Field label="Password">
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          <Button type="submit" variant="primary" loading={busy} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        {/* Which API this build talks to. On a laptop with dev and prod tabs
            open, this is the difference between editing a draft and editing the
            live site. */}
        <p className="mt-4 text-center font-mono text-[11.5px] text-fg-subtle">
          {API_URL}
        </p>
      </div>
    </div>
  );
}
