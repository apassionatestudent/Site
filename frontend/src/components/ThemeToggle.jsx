import './ThemeToggle.css';
import { useTheme } from "../context/ThemeContext.jsx";


export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-switch`}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      onClick={toggleTheme}
      title='Switch to day/night mode?'
    >
      <span className={`theme-switch-track ${isDark ? "is-dark" : "is-light"}`} aria-hidden="true">
        <span className="theme-switch-thumb">
          {isDark ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );
}