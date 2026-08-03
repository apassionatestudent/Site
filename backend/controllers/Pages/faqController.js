import { getPublicFaqs } from "../../services/Pages/faqService.js";

// => GET /api/public/faqs
export async function getPublicFaqsController(req, res) {
  try {
    const sections = await getPublicFaqs();
    res.status(200).json(sections);
  } catch (error) {
    console.error("Error fetching public FAQs:", error);
    res.status(500).json({ message: "Failed to load FAQs." });
  }
}