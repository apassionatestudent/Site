import { useEffect, useState } from "react";
import axios from "axios";
import "./legalPolicy.css";

// => Public, read-only page - fetches the admin-authored Privacy Policy
//    and renders the sanitized HTML
export default function PrivacyPolicy() {
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const CACHE_KEY = "privacy-policy-cache";

    async function fetchPage() {
      try {
        // => Check the cheap meta endpoint first - just the timestamp,
        //    no content or embedded images
        const metaRes = await axios.get("/api/public/pages/privacy-policy/meta");
        const latestUpdatedAt = metaRes.data.updatedAt;

        const cachedRaw = localStorage.getItem(CACHE_KEY);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

        // => Cache is still fresh - skip the full content fetch entirely
        if (cached && cached.updatedAt === latestUpdatedAt) {
          if (isMounted) {
            setContent(cached.content);
            setUpdatedAt(cached.updatedAt);
          }
          return;
        }

        // => Nothing cached, or the admin published a newer update - fetch
        //    the full content and refresh the cache
        const res = await axios.get("/api/public/pages/privacy-policy");
        if (isMounted) {
          setContent(res.data.content);
          setUpdatedAt(res.data.updatedAt);
        }

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ updatedAt: latestUpdatedAt, content: res.data.content })
        );
      } catch (err) {
        if (!isMounted) return;
        // => 404 means the admin hasn't saved this page yet, not a real error
        setError(
          err.response?.status === 404
            ? "This page has not been published yet."
            : "Unable to load the Privacy Policy right now."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPage();
    return () => { isMounted = false; };
  }, []);

  return (
    <>
      <section className="page-hero" data-watermark="PRIVACY">
        <div className="page-hero-inner">
          <span className="page-hero-tag">Legal</span>
          <h1>Privacy Policy</h1>
          <p className="page-hero-sub">
            How 3A Prime Hospitality Training and Assessment Center Inc. collects, uses, and protects your information.
          </p>
          {/* => Real timestamp pulled straight from cms_pages.updated_at -
                no manually typed date to fall out of sync */}
          {updatedAt && (
            <p className="page-hero-updated">
              Last updated: {new Date(updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <div className="page-hero-rule" />
        </div>
      </section>

      <section className="privacy-policy-body">
        {loading && <p className="privacy-policy-status">Loading...</p>}
        {!loading && error && <p className="privacy-policy-status">{error}</p>}
        {!loading && !error && (
          // => Trusted admin-authored HTML, sanitized twice (write + read) -
          //    dangerouslySetInnerHTML is the correct call here
          <div
            className="privacy-policy-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </section>
    </>
  );
}