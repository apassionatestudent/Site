import { getActiveAnnouncementCount } from '../../services/Announcements/announcementService.js';
import { getOpenTicketCountForStudent } from '../../services/SupportTickets/supportTicketService.js';

// => Single endpoint the Sidebar calls once on mount, combines both counts
// => to avoid firing two separate requests for one small piece of UI
export const getDashboardBadges = async (req, res) => {
  try {
    // => req.student is guaranteed here since this route sits behind protectStudent
    const studentId = req.student.student_id;

    const [activeAnnouncements, openTickets] = await Promise.all([
      getActiveAnnouncementCount(),
      getOpenTicketCountForStudent(studentId),
    ]);

    res.status(200).json({ activeAnnouncements, openTickets });
  } catch (error) {
    console.error('Error fetching dashboard badges:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard badges.' });
  }
};
