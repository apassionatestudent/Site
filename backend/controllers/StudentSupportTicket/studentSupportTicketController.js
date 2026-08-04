// controllers/StudentSupportTicket/studentSupportTicketController.js

import {
  submitStudentSupportTicket,
  listStudentSupportTickets,
  getStudentSupportTicketDetail,
  ValidationError,
} from "../../services/StudentSupportTicket/studentSupportTicketService.js";

export async function createSupportTicket(req, res) {
  try {
    const ticket = await submitStudentSupportTicket(req.student.student_id, req.body);
    res.status(201).json({
      message: "Support ticket submitted successfully.",
      publicId: ticket.public_id,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error creating student support ticket:", error);
    res.status(500).json({ error: "Something went wrong while submitting your ticket." });
  }
}

export async function listMySupportTickets(req, res) {
  try {
    const tickets = await listStudentSupportTickets(req.student.student_id);
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching student support tickets:", error);
    res.status(500).json({ error: "Something went wrong while fetching your tickets." });
  }
}

export async function getMySupportTicketDetail(req, res) {
  try {
    const ticket = await getStudentSupportTicketDetail(req.student.student_id, req.params.publicId);
    if (!ticket) {
      return res.status(404).json({ error: "Support ticket not found." });
    }
    res.json(ticket);
  } catch (error) {
    console.error("Error fetching student support ticket detail:", error);
    res.status(500).json({ error: "Something went wrong while fetching this ticket." });
  }
}