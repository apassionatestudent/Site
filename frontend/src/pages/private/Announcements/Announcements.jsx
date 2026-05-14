import React from 'react';

const Announcements = () => {
  const announcements = [
    {
      id: 1,
      title: 'Welcome to the Announcement Center',
      message: 'This is where important updates will appear for all users.',
      date: '2026-05-13',
    },
    {
      id: 2,
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur this weekend. Please save your work.',
      date: '2026-05-14',
    },
  ];

  return (
    <div className="announcements-page">
      <header>
        <h1>Announcements</h1>
        <p>Latest updates and news for the community.</p>
      </header>

      <section className="announcement-list">
        {announcements.length === 0 ? (
          <p>No announcements available.</p>
        ) : (
          announcements.map((announcement) => (
            <article key={announcement.id} className="announcement-item">
              <h2>{announcement.title}</h2>
              <p>{announcement.message}</p>
              <small>{announcement.date}</small>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default Announcements;
