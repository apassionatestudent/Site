// routes/PublicSupportTicket/publicSupportTicketRoutes.js

import express from "express";
import { createPublicSupportTicket } from "../../controllers/PublicSupportTicket/publicSupportTicketController.js";

const router = express.Router();

// => POST /api/public/support-tickets - anonymous submission, no auth required
// => Validation happens inside the service layer, not here
router.post("/", createPublicSupportTicket);

export default router;