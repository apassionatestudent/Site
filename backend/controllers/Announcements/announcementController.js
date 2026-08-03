import { getAnnouncements } from '../../services/Announcements/announcementService.js';

// => GET /api/announcements - returns all active announcements for the
// => Student Dashboard, newest first. Read-only, no filtering yet.
export const listAnnouncements = async (req, res) => {
  try {
    const announcements = await getAnnouncements();
    res.status(200).json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
};