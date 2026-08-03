import express from "express";
import { getPublicFaqsController } from "../../controllers/Pages/faqController.js";

const router = express.Router();

router.get("/", getPublicFaqsController);

export default router;