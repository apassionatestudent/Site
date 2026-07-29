import { countOpenTicketsForStudent } from '../../models/SupportTickets/supportTicketModel.js';

export const getOpenTicketCountForStudent = async (studentId) => {
  return await countOpenTicketsForStudent(studentId);
};
