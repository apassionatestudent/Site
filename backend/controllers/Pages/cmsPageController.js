import { getPublicPage, getPublicPageMeta } from "../../services/Pages/cmsPageService.js";

// => GET /api/public/pages/:slug
export async function getPageBySlugController(req, res) {
  try {
    const { slug } = req.params;
    const page = await getPublicPage(slug);

    if (!page) {
      // => The row only exists once the admin has saved this slug at least
      //    once - treat a missing row as "not published yet", not an error
      return res.status(404).json({ message: "This page has not been published yet." });
    }

    res.status(200).json(page);
  } catch (error) {
    console.error("Error fetching public page:", error);
    res.status(500).json({ message: "Failed to load page." });
  }
}

// => GET /api/public/pages/:slug/meta
export async function getPageMetaController(req, res) {
  try {
    const { slug } = req.params;
    const meta = await getPublicPageMeta(slug);

    if (!meta) {
      return res.status(404).json({ message: "This page has not been published yet." });
    }

    res.status(200).json(meta);
  } catch (error) {
    console.error("Error fetching page meta:", error);
    res.status(500).json({ message: "Failed to check page update status." });
  }
}