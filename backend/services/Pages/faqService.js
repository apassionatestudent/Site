import sanitizeHtml from "sanitize-html";
import { findAllPublicFaqs } from "../../models/Pages/faqModel.js";

// => Same whitelist as cmsPageService - kept duplicated on purpose,
//    per the project's "duplication over abstraction" convention
const SANITIZE_OPTIONS = {
  allowedTags: ["strong", "em", "u", "ol", "ul", "li", "p", "div", "br", "img"],
  allowedAttributes: {
    img: ["src", "style", "alt"],
  },
  allowedStyles: {
    img: {
      width: [/^\d+(?:px|%)$/],
      "max-width": [/^\d+(?:px|%)$/],
    },
  },
  // => sanitize-html strips data: URIs by default for security. Since
  //    images are stored as inline base64 (no R2 upload for this module),
  //    data: must be explicitly allowed on img src, scoped only to img
  allowedSchemes: ["http", "https", "data"],
  allowedSchemesByTag: {
    img: ["data", "http", "https"],
  },
};

export async function getPublicFaqs() {
  const rows = await findAllPublicFaqs();

  // => Group the flat, joined rows into sections[], each holding its own faqs[]
  const sectionsMap = new Map();

  for (const row of rows) {
    if (!sectionsMap.has(row.section_public_id)) {
      sectionsMap.set(row.section_public_id, {
        sectionId: row.section_public_id,
        name: row.section_name,
        faqs: [],
      });
    }

    // => LEFT JOIN means an empty section still comes through once with
    //    every faq_* column NULL - skip pushing a phantom FAQ entry
    if (row.faq_public_id) {
      sectionsMap.get(row.section_public_id).faqs.push({
        faqId: row.faq_public_id,
        question: row.question,
        answer: sanitizeHtml(row.answer, SANITIZE_OPTIONS),
      });
    }
  }

  return Array.from(sectionsMap.values());
}