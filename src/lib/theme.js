import { useCallback, useEffect, useState } from "react";

const KEY = "iwan-cms.theme";

/* Light or dark, remembered per browser.

   ⚠ The FIRST application happens in index.html, in an inline script that runs
   before the first paint — a module import would run a frame too late and a
   dark-mode session would flash white on every load. This hook only handles
   changing it afterwards, and reads back whatever that script decided. */
const current = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export function useTheme() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");

    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* Private browsing throws. The choice holds for this tab and no longer. */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}

export default useTheme;
