
// => This sets day/night mode for the webapp

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

function isNightTime() {
  const hour = new Date().getHours();
  return (hour >= 18 && hour < 24) || (hour >= 0 && hour < 6);
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => isNightTime());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);