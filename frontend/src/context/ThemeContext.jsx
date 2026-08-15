// => This sets day/night mode for the webapp
// => Persistence rules:
// => Guests (not logged in) - stored in localStorage only, per-browser
// => Logged-in students - stored in student_accounts.is_night_mode via
// => GET/PATCH /api/account, so it follows the account across devices,
// => same as admins.is_night_mode

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import axiosStudent from "../utils/axiosStudent.js";

const ThemeContext = createContext();

// => localStorage key holding the last-known theme, guest or logged-in
const THEME_STORAGE_KEY = "themeIsDark";

function isNightTime() {
  const hour = new Date().getHours();
  return (hour >= 18 && hour < 24) || (hour >= 0 && hour < 6);
}

// => Reads localStorage first so there's no flash of the wrong theme
// => before a logged-in student's DB value has a chance to load
function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return isNightTime();
}

function getIsLoggedIn() {
  return (
    localStorage.getItem("isLoggedIn") === "true" ||
    sessionStorage.getItem("isLoggedIn") === "true"
  );
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => getInitialTheme());
  const location = useLocation();

  // => Tracks the last login state seen, so the DB theme is fetched once
  // => on mount (already logged in, page refreshed) and again right when
  // => isLoggedIn flips false to true (just logged in, no full reload)
  const prevLoggedInRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const loggedIn = getIsLoggedIn();
    if (loggedIn && !prevLoggedInRef.current) {
      axiosStudent
        .get("/account")
        .then((res) => {
          const dbValue = res.data?.account?.is_night_mode;
          // => Only trust the DB value if it actually came back, otherwise
          // => keep whatever localStorage/time-based value was already showing
          if (typeof dbValue === "boolean") {
            setIsDark(dbValue);
            localStorage.setItem(THEME_STORAGE_KEY, String(dbValue));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch saved theme preference:", err);
        });
    }
    prevLoggedInRef.current = loggedIn;
  }, [location.pathname]);

  const toggleTheme = () => {
    // => Side effects moved out of the setState updater. StrictMode
    // => double-invokes updater functions in dev to catch impurities like
    // => localStorage writes or network calls living inside them
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(THEME_STORAGE_KEY, String(next));

    if (getIsLoggedIn()) {
      axiosStudent
        .patch("/account/theme", { isNightMode: next })
        .catch((err) => console.error("Failed to save theme preference:", err));
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);