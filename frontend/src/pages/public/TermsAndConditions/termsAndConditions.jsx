import { useEffect, useState } from "react";
import axios from "axios";
import "./termsAndConditions.css";
// => Shared loading/error UI, same component Privacy Policy uses
import LoadingState from "../../../components/public/LoadingState/loadingState";

// => Public, read-only page - fetches the admin-authored Terms and Conditions
//    and renders the sanitized HTML. Mirrors legalPolicy.jsx's fetch/cache
//    pattern exactly, just pointed at a different slug and cache key.
export default function TermsAndConditions() {
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPage = async (isMounted = { current: true }) => {
    const CACHE_KEY = "terms-conditions-cache";
    setLoading(true);
    setError(null);

    try {
      // => Cheap meta endpoint first - just the timestamp
      const metaRes = await axios.get("/api/public/pages/terms-and-conditions/meta");
      const latestUpdatedAt = metaRes.data.updatedAt;

      const cachedRaw = localStorage.getItem(CACHE_KEY);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

      // => Cache is still fresh, skip the full content fetch entirely
      if (cached && cached.updatedAt === latestUpdatedAt) {
        if (isMounted.current) {
          setContent(cached.content);
          setUpdatedAt(cached.updatedAt);
        }
        return;
      }

      // => Nothing cached, or admin published a newer update
      const res = await axios.get("/api/public/pages/terms-and-conditions");
      if (isMounted.current) {
        setContent(res.data.content);
        setUpdatedAt(res.data.updatedAt);
      }

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ updatedAt: latestUpdatedAt, content: res.data.content })
      );
    } catch (err) {
      if (!isMounted.current) return;
      // => 404 means the admin hasn't saved this page yet, not a real error
      setError(
        err.response?.status === 404
          ? "This page has not been published yet."
          : "Unable to load the Terms and Conditions right now."
      );
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    loadPage(isMounted);
    return () => { isMounted.current = false; };
  }, []);

  return (
    <>
      <section className="page-hero" data-watermark="TERMS">
        <div className="page-hero-inner">
          <span className="page-hero-tag">Legal</span>
          <h1>Terms and Conditions</h1>
          <p className="page-hero-sub">
            The rules and agreements that govern your use of 3A Prime Hospitality Training and Assessment Center Inc.'s services.
          </p>
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

      <section className="terms-conditions-body">
        {loading && <LoadingState message="Loading..." />}

        {!loading && error && (
          <LoadingState
            variant="error"
            message={error}
            onRetry={() => loadPage()}
          />
        )}

        {!loading && !error && (
          // => Trusted admin-authored HTML, sanitized twice (write + read)
          <div
            className="terms-conditions-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </section>
    </>
  );
}