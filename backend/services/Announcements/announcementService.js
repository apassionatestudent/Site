import { countActiveAnnouncements } from '../../models/Announcements/announcementModel.js';

// => Service layer is a pass-through for now, but exists so future logic
// => (e.g. caching, filtering by audience) has a home without touching the controller
export const getActiveAnnouncementCount = async () => {
  return await countActiveAnnouncements();
};
