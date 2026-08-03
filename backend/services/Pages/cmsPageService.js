import sanitizeHtml from "sanitize-html";
import { findPageBySlug, findPageMetaBySlug } from "../../models/Pages/cmsPageModel.js";

// => Same whitelist used on the admin write side, applied again here as
//    defense in depth before this HTML reaches dangerouslySetInnerHTML
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
  // => Same fix as faqService.js - data: URIs need explicit allow-listing,
  //    scoped only to img, since content is base64 inline images
  allowedSchemes: ["http", "https", "data"],
  allowedSchemesByTag: {
    img: ["data", "http", "https"],
  },
};

export async function getPublicPage(slug) {
  const page = await findPageBySlug(slug);
  if (!page) return null;

  return {
    slug: page.slug,
    content: sanitizeHtml(page.content, SANITIZE_OPTIONS),
    updatedAt: page.updated_at,
  };
}

// => No sanitization needed here since no content is returned
export async function getPublicPageMeta(slug) {
  const page = await findPageMetaBySlug(slug);
  if (!page) return null;

  return {
    slug: page.slug,
    updatedAt: page.updated_at,
  };
}