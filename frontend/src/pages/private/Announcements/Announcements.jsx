import { useEffect, useState } from 'react';
import axiosStudent from '../../../utils/axiosStudent.js';
import AnnouncementDetail from '../../../components/private/AnnouncementDetail/announcementDetail.jsx';
import toast from 'react-hot-toast';
import './Announcements.css';
import LoadingState from '../../../components/private/LoadingState/loadingState.jsx';

// => Reusing the same icon set as Enrollment.jsx for visual consistency
// => across dashboard pages, rather than sourcing new icons per page
import errorIcon from '../../../assets/icons/warning.png';
import emptyIcon from '../../../assets/icons/empty-classes.png';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // => AbortController guards against setting state after unmount,
    // => matters extra here since StrictMode double-invokes effects in dev
    const controller = new AbortController();

    const fetchAnnouncements = async () => {
      try {
        const response = await axiosStudent.get('/announcements', {
          signal: controller.signal,
        });
        setAnnouncements(response.data);
      } catch (error) {
        if (error.name !== 'CanceledError') {
          console.error('Error fetching announcements:', error);
          toast.error('Failed to load announcements');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
    return () => controller.abort();
  }, []);

  return (
    <div className="announcements-page">
      <header className="announcements-header">
        <h1 className="announcements-title">Announcements</h1>
        <p className="announcements-subtitle">Latest updates and news from 3A Prime Hospitality Training and Assessment Center Inc.</p>
      </header>

      {/* => shared spinner, keeps loading UI consistent with any other page using LoadingState */}
      {loading && <LoadingState message="Loading Announcements..." />}

      {!loading && announcements.length === 0 && (
        <div className="announcement-empty">
          <img src={emptyIcon} alt="" className="announcement-empty-icon" />
          <p>No announcements yet.</p>
        </div>
      )}

      {!loading && announcements.length > 0 && (
        <section className="announcement-feed">
          {/* => No click-to-expand, every announcement renders in full,
              => students just scroll the feed. Index feeds the staggered
              => fade-in animation, same pattern as Enrollment.jsx cards */}
          {announcements.map((announcement, index) => (
            <AnnouncementDetail
              key={announcement.public_id}
              announcement={announcement}
              index={index}
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default Announcements;