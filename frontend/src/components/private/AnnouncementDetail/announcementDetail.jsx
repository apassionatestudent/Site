import './announcementDetail.css';

// => Reused across dashboard cards - same icon Enrollment.jsx uses for
// => its "Submitted {date}" meta line
import dateIcon from '../../../assets/icons/calendar.png';

// => Formats the raw created_at timestamp into a readable date string,
// => kept local since this is the only place that needs it right now
const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const AnnouncementDetail = ({ announcement, index = 0 }) => {
  const { title, message, created_at } = announcement;

  return (
    <article
      className="announcement-card"
      // => Staggered fade-in, same pattern as enroll-card in Enrollment.jsx
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* => Left accent bar, static accent color since announcements have
          => no status concept the way enrollments do */}
      <div className="announcement-card-bar" />

      <div className="announcement-card-body">
        <div className="announcement-card-top">
          <h2 className="announcement-title">{title}</h2>
          <div className="announcement-meta">
            <img src={dateIcon} alt="" className="announcement-meta-icon" />
            <span>{formatDate(created_at)}</span>
          </div>
        </div>

        {/* => message is pre-sanitized server-side in announcementService.js
            => before it ever reaches this component */}
        <div
          className="announcement-message"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    </article>
  );
};

export default AnnouncementDetail;