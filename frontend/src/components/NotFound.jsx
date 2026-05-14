import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="notfound-root" role="main" aria-labelledby="notfound-title">
      <section
        className="notfound-panel"
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="image-section">
            <img src="/logo_white_border.png" alt="Company Logo" />
        </div>

        <h1 id="notfound-title" className="notfound-code">Error 404</h1>
        <h2 className="notfound-heading">Page not found</h2>
        <p className="notfound-text">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="notfound-actions">
          <Link to="/" className="btn primary">Return to homepage</Link>
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            Go back
          </button>
        </div>

        <p className="notfound-suggestion">
          Try checking the URL for errors, or use the site navigation above to find what you need.
        </p>
      </section>
    </main>
  );
}