import express from "express";
import { getPageBySlugController, getPageMetaController } from "../../controllers/Pages/cmsPageController.js";

const router = express.Router();

// => Public, read-only - no auth, no CSRF needed
// => Meta route defined first since it's the more specific path
router.get("/:slug/meta", getPageMetaController);
router.get("/:slug", getPageBySlugController);

export default router;