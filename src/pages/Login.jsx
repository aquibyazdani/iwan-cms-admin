import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { useTheme } from "../lib/theme.js";
import logoDark from "../assests/brand-logo-trimmed.webp";
import logoLight from "../assests/brand-logo-light-trimmed.webp";
import { Button } from "../ui/Button.jsx";
import { Field, Input } from "../ui/form.jsx";
import { Alert } from "../ui/feedback.jsx";

export default function Login() {
  const { signIn } = useAuth();
  const { theme } = useTheme();
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
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          {/* The wordmark is drawn in the brand's dark blue, which vanishes on
              the dark ground — hence the two files. */}
          <img
            src={theme === "dark" ? logoLight : logoDark}
            alt="Iwan"
            className="h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-fg">
              Content management
            </h1>
            <p className="text-[12.5px] text-fg-subtle">Sign in to edit iwan.community</p>
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
      </div>
    </div>
  );
}
