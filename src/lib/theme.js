import { useCallback, useEffect, useState } from "react";

const KEY = "iwan-cms.theme";

/* Light or dark, remembered per browser.

   ⚠ The FIRST application happens in index.html, inline, before first paint — a
   module import runs a frame too late and a dark session flashes white. This
   hook only changes it afterwards. */
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
      /* Private browsing throws. The choice holds for this tab. */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}

export default useTheme;
