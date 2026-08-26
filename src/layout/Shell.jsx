import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  IconLayoutDashboard,
  IconSettings,
  IconUsers,
  IconInbox,
  IconAddressBook,
  IconBriefcase,
  IconLogout,
  IconMenu2,
  IconX,
  IconSun,
  IconMoon,
  IconExternalLink,
} from "@tabler/icons-react";
import { RESOURCE_LIST } from "../resources.jsx";
import { useAuth } from "../lib/auth.jsx";
import { useTheme } from "../lib/theme.js";
import { COUNTRIES } from "../lib/countries.js";
import { cx } from "../lib/cx.js";
/* ⚠ The TRIMMED copies, not the originals beside them: the source exports carry
   ~47% empty canvas, so `h-8` drew a 30px mark in a 48px box with the wordmark
   illegible. The originals are kept as the masters. */
import logoDark from "../assests/brand-logo-trimmed.webp";
import logoLight from "../assests/brand-logo-light-trimmed.webp";

const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://iwan.community";

const NAV_ITEM = cx(
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium",
  "transition-colors duration-150"
);

const NAV_IDLE = "text-fg-muted hover:bg-muted hover:text-fg";
const NAV_ACTIVE = "bg-muted text-fg";

const roleLine = (user) => {
  if (user?.role === "admin") return "Admin";

  const label = user?.role === "viewer" ? "Viewer" : "Editor";
  const where = user?.countries?.length
    ? user.countries
        .map((c) => COUNTRIES.find((x) => x.code === c)?.label ?? c)
        .join(", ")
    : "all countries";

  return `${label} · ${where}`;
};

/* The frame every signed-in screen renders inside. */
export default function Shell() {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  /* Without this, tapping a link on a phone navigates behind a drawer that
     stays open over the new page. */
  useEffect(() => setDrawer(false), [location.pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      <div className="flex flex-col gap-0.5">
        <NavLink
          to="/"
          end
          className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
        >
          <IconLayoutDashboard size={16} stroke={1.8} />
          Overview
        </NavLink>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
          Content
        </p>
        {RESOURCE_LIST.map((resource) => (
          <NavLink
            key={resource.key}
            to={`/${resource.path}`}
            className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
          >
            <resource.icon size={16} stroke={1.8} />
            {resource.label}
          </NavLink>
        ))}
        <NavLink
          to="/podcast-show"
          className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
        >
          <IconSettings size={16} stroke={1.8} />
          Show settings
        </NavLink>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
          Sign-ups
        </p>
        <NavLink
          to="/event-registrations"
          className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
        >
          <IconInbox size={16} stroke={1.8} />
          Event registrations
        </NavLink>
        <NavLink
          to="/audience"
          className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
        >
          <IconAddressBook size={16} stroke={1.8} />
          Audience
        </NavLink>
        <NavLink
          to="/applications"
          className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
        >
          <IconBriefcase size={16} stroke={1.8} />
          Volunteer &amp; career
        </NavLink>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
            Admin
          </p>
          <NavLink
            to="/users"
            className={({ isActive }) => cx(NAV_ITEM, isActive ? NAV_ACTIVE : NAV_IDLE)}
          >
            <IconUsers size={16} stroke={1.8} />
            People
          </NavLink>
        </div>
      )}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <a
        href={SITE_URL}
        target="_blank"
        rel="noreferrer noopener"
        className={cx(NAV_ITEM, NAV_IDLE, "w-full")}
      >
        <IconExternalLink size={16} stroke={1.8} />
        View the site
      </a>

      <div className="mt-2 flex items-center gap-2 rounded-lg border border-line p-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fg text-[11px] font-semibold text-fg-invert">
          {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-fg">
            {user?.name || user?.email}
          </p>
          <p className="truncate text-[11.5px] text-fg-subtle">{roleLine(user)}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg"
        >
          {theme === "dark" ? (
            <IconSun size={15} stroke={1.8} />
          ) : (
            <IconMoon size={15} stroke={1.8} />
          )}
        </button>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="rounded p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg"
        >
          <IconLogout size={15} stroke={1.8} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex">
        <Brand theme={theme} />
        {nav}
        {footer}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 animate-in bg-black/40"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-[264px] animate-in flex-col border-r border-line bg-surface">
            <Brand theme={theme} onClose={() => setDrawer(false)} />
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="rounded p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
          >
            <IconMenu2 size={18} stroke={1.8} />
          </button>
          <span className="text-[14px] font-semibold text-fg">Iwan CMS</span>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ⚠ `theme` is passed in rather than read with `useTheme()` — that hook owns
   state and writes localStorage, so a second call is a second source of
   truth. */
function Brand({ theme, onClose }) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-line px-4 py-3.5">
      {/* Dark blue, so it disappears on the dark ground — hence two files.
          `object-contain`, or a `cover` crop clips the arch. */}
      <img
        src={theme === "dark" ? logoLight : logoDark}
        alt="Iwan"
        className="h-12 w-auto shrink-0 object-contain object-left"
      />

      {/* ⚠ The wordmark says "iwan.community", which is the SITE. This label is
          what stops someone believing they are looking at it. */}
      <span className="flex-1 text-[14px] font-bold uppercase tracking-[0.14em] text-fg-subtle">
        CMS
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded p-1 text-fg-subtle transition-colors hover:bg-muted hover:text-fg lg:hidden"
        >
          <IconX size={16} stroke={2} />
        </button>
      )}
    </div>
  );
}
