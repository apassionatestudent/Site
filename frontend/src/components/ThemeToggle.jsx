import { useTheme } from "./../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      <button
        type="button"
        className="theme-switch"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >

        <span className={`theme-switch__track ${isDark ? "is-dark" : "is-light"}`} aria-hidden="true">
          <span className="theme-switch__thumb">
            {isDark ? "🌙" : "☀️"}
          </span>
        </span>

      </button>

      <style>{`
        .theme-switch {
          all: unset;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          flex-shrink: 0;
          user-select: none;
        }

        .nav-links li {
          display: flex;
          align-items: center;
        }

        .theme-switch:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 3px;
          border-radius: 999px;
        }

        .theme-switch__icon {
          font-size: 0.95rem;
          line-height: 1;
          width: 1rem;
          text-align: center;
          flex: 0 0 auto;
        }

        .theme-switch__track {
          width: 3.4rem;
          height: 1.9rem;
          border-radius: 999px;
          position: relative;
          padding: 0.18rem;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          transition: background 0.25s ease;
        }

        .theme-switch__track.is-light {
          background: #f6ff00;
        }

        .theme-switch__track.is-dark {
          background: #032162;
        }

        .theme-switch__thumb {
          width: 1.55rem;
          height: 1.55rem;
          border-radius: 50%;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          transform: translateX(${isDark ? "1.45rem" : "0"});
          transition: transform 0.25s ease;
        }
      `}</style>
    </>
  );
}