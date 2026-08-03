import { useEffect, useState } from "react";
import axios from "axios";
import ChevronDown from "./../../../assets/icons/chevron-down.png";
import "./faqs.css";

// => Public, read-only FAQs page - grouped by admin-managed sections,
//    one FAQ open at a time
export default function FAQs() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openFaqId, setOpenFaqId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchFaqs() {
      try {
        const res = await axios.get("/api/public/faqs");
        if (isMounted) setSections(res.data);
      } catch (err) {
        if (isMounted) setError("Unable to load FAQs right now.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFaqs();
    return () => { isMounted = false; };
  }, []);

  const toggleFaq = (faqId) => {
    setOpenFaqId((current) => (current === faqId ? null : faqId));
  };

  return (
    <>
      <section className="page-hero" data-watermark="FAQS">
        <div className="page-hero-inner">
          <span className="page-hero-tag">Help Center</span>
          <h1>Frequently Asked Questions</h1>
          <p className="page-hero-sub">
            Answers to common questions about enrollment, courses, and requirements.
          </p>
          <div className="page-hero-rule" />
        </div>
      </section>

      <section className="faqs-body">
        {loading && <p className="faqs-status">Loading...</p>}
        {!loading && error && <p className="faqs-status">{error}</p>}
        {!loading && !error && sections.length === 0 && (
          <p className="faqs-status">No FAQs have been published yet.</p>
        )}

        {!loading && !error && sections.map((section) => (
          <div key={section.sectionId} className="faqs-section">
            <h2 className="faqs-section-title">{section.name}</h2>

            {section.faqs.length === 0 ? (
              <p className="faqs-empty">No questions in this section yet.</p>
            ) : (
              section.faqs.map((faq) => {
                const isOpen = openFaqId === faq.faqId;
                return (
                  <div key={faq.faqId} className="faq-item">
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(faq.faqId)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <img
                        src={ChevronDown}
                        alt=""
                        className={`faq-chevron ${isOpen ? "faq-chevron-open" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        className="faq-answer"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </section>
    </>
  );
}