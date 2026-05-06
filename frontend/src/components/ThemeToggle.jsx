import { useTheme } from "./../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
      {isDark ? "☀️ Day" : "🌙 Night"}
    </button>
  );
}