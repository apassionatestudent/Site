// controllers/PublicSupportTicket/publicSupportTicketController.js

import { submitPublicSupportTicket, ValidationError } from "../../services/PublicSupportTicket/publicSupportTicketService.js";

export async function createPublicSupportTicket(req, res) {
  try {
    const ticket = await submitPublicSupportTicket(req.body);
    res.status(201).json({
      message: "Support ticket submitted successfully.",
      publicId: ticket.public_id,
    });
  } catch (error) {
    // => Validation errors from the service map to 400, everything else is a 500
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error creating public support ticket:", error);
    res.status(500).json({ error: "Something went wrong while submitting your ticket." });
  }
}