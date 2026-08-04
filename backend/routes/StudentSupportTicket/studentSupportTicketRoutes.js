// routes/StudentSupportTicket/studentSupportTicketRoutes.js

import express from "express";
import { protectStudent } from "../../middleware/studentAuth.js";
import { floodLimiter, readLimiter, submissionLimiter } from "../../middleware/rateLimiters.js";
import {
  createSupportTicket,
  listMySupportTickets,
  getMySupportTicketDetail,
} from "../../controllers/StudentSupportTicket/studentSupportTicketController.js";

const router = express.Router();

// => floodLimiter first (IP-based, pre-auth), then protectStudent, matching
// => the project's standard middleware ordering for authenticated routes
router.use(floodLimiter);
router.use(protectStudent);

router.get("/", readLimiter, listMySupportTickets);
router.get("/:publicId", readLimiter, getMySupportTicketDetail);
router.post("/", submissionLimiter, createSupportTicket);

export default router;