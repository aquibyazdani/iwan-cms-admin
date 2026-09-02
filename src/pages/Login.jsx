import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useAuth } from "../lib/auth.jsx";
import { readRemember } from "../lib/api.js";
import { cx } from "../lib/cx.js";
import { useTheme } from "../lib/theme.js";
import logoDark from "../assests/brand-logo-trimmed.webp";
import logoLight from "../assests/brand-logo-light-trimmed.webp";
import { Button } from "../ui/Button.jsx";
import { Field, Input } from "../ui/form.jsx";
import { Alert } from "../ui/feedback.jsx";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  /* Seeded from the last sign-in, so someone who unticked it on a shared
     machine does not find it ticked again. */
  const [remember, setRemember] = useState(readRemember);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, remember);
      /* ⚠ Home, not wherever the URL happened to point. Signing in usually
         follows a session ending, and landing back on the half-filled form
         that expired mid-edit is a worse start than the dashboard. */
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          {/* The wordmark is dark blue and vanishes on the dark ground. */}
          <img
            src={theme === "dark" ? logoLight : logoDark}
            alt="Iwan"
            className="h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-fg">ADMIN</h1>
            <p className="text-[12.5px] text-fg-subtle">Sign in to edit iwan.community</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6"
        >
          {error && <Alert>{error}</Alert>}

          {/* ⚠ `type="text"`, not `type="email"`: an account can sign in with a
              username, and the browser's email validation would block
              "admin2026" before the form ever submitted. */}
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
                /* BOTH, since the field accepts either — an email-only
                   placeholder suggests the username does not work. */
                placeholder="username or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <Field label="Password">
            {(props) => (
              <div className="relative">
                <Input
                  {...props}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  /* ⚠ A placeholder that reads like a value gets typed over,
                     or mistaken for a filled field. */
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  /* Keeps a long password from running under the eye button. */
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  /* ⚠ `type="button"`: a bare <button> in a <form> defaults to
                     submit, so peeking at the password would submit it. The
                     label names what the NEXT click does, since the icon says
                     nothing to a screen reader; aria-pressed carries state. */
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className={cx(
                    "absolute right-0 top-0 grid h-9 w-10 place-items-center rounded-r",
                    "text-fg-subtle transition-colors duration-150 hover:text-fg"
                  )}
                >
                  {showPassword ? (
                    <IconEyeOff size={16} stroke={1.8} />
                  ) : (
                    <IconEye size={16} stroke={1.8} />
                  )}
                </button>
              </div>
            )}
          </Field>

          {/* Inline rather than the ui/form Checkbox, which is a bordered card
              for settings screens and would outweigh the button below it. */}
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-fg-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              /* `accent-fg`, not the app's `accent` blue — it sits above the
                 black/white Sign in button, where a lone blue tick reads as a
                 stray. ⚠ The brand navy and gold are NOT options: the `site-`
                 prefix exists so the admin never dresses up as the site. */
              className="h-3.5 w-3.5 cursor-pointer accent-fg"
            />
            Remember me
          </label>

          <Button type="submit" variant="primary" loading={busy} className="mt-1 w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
