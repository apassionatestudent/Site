import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clockIcon from '../../../assets/icons/clock.png';
import awardIcon from '../../../assets/icons/award.png';
import briefcaseIcon from '../../../assets/icons/briefcase.png';
import listIcon from '../../../assets/icons/list.png';
import BackButton from '../BackButton/BackButton.jsx';
import ChatbotWidget from '../ChatbotWidget/chatbotWidget.jsx';
import './tesdaCourseDetail.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function TESDACourseDetail() {
  const { title } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // => useParams already gives a decoded value, but decodeURIComponent is
    // => safe to run again since decoding plain text is a no-op
    const decodedTitle = decodeURIComponent(title);

    fetch(`${API_BASE}/api/public/tesda-courses/${encodeURIComponent(decodedTitle)}`)
      .then((res) => {
        if (res.status === 404) throw new Error('Course not found');
        if (!res.ok) throw new Error('Failed to load course');
        return res.json();
      })
      .then((data) => setCourse(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [title]);

  if (loading) {
    return <main className="tesda-course-detail"><p>Loading...</p></main>;
  }

  if (error) {
    return (
      <main className="tesda-course-detail">
        <BackButton destination="TESDA Courses" />
        <p className="tesda-course-detail-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="tesda-course-detail">
      {/* => Defaults to navigate(-1), so it returns to wherever the visitor came
         => from (the TESDA list, a search result, etc.) rather than a fixed route */}
      <BackButton destination="TESDA Courses" />
      <section className="tesda-course-hero">
        <span className="tesda-course-badge">
          <img src={awardIcon} alt="" className="tesda-course-icon" /> {course.nc_level || 'Unrated'}
        </span>
        <h1>{course.title}</h1>
        <p className="tesda-course-meta">
          <img src={clockIcon} alt="" className="tesda-course-icon" /> {course.hours} hours &nbsp;|&nbsp; Sector: {course.sector || 'N/A'}
        </p>
        <p className="tesda-course-desc">{course.description}</p>
      </section>

      {course.basic_competencies?.length > 0 && (
        <section className="tesda-course-section">
          <h2><img src={listIcon} alt="" className="tesda-course-icon" /> Basic Competencies</h2>
          <ul>
            {course.basic_competencies.map((c) => (
              <li key={c.basic_id}>{c.code} - {c.competency}</li>
            ))}
          </ul>
        </section>
      )}

      {course.common_competencies?.length > 0 && (
        <section className="tesda-course-section">
          <h2><img src={listIcon} alt="" className="tesda-course-icon" /> Common Competencies</h2>
          <ul>
            {course.common_competencies.map((c) => (
              <li key={c.common_id}>{c.code} - {c.competency}</li>
            ))}
          </ul>
        </section>
      )}

      {course.core_competencies?.length > 0 && (
        <section className="tesda-course-section">
          <h2><img src={listIcon} alt="" className="tesda-course-icon" /> Core Competencies</h2>
          <ul>
            {course.core_competencies.map((c) => (
              <li key={c.core_id}>{c.code} - {c.competency}</li>
            ))}
          </ul>
        </section>
      )}

      {course.job_opportunities?.length > 0 && (
        <section className="tesda-course-section">
          <h2><img src={briefcaseIcon} alt="" className="tesda-course-icon" /> Job Opportunities</h2>
          <ul>
            {course.job_opportunities.map((j) => (
              <li key={j.job_id}>{j.job_title}</li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/enroll" className="tesda-course-enroll-btn">Enroll Now</Link>

      {/* => Course-scoped chatbot, only renders a FAB if an admin has an
             active bot configured for this specific course */}
      <ChatbotWidget scope="tesda_course" courseId={course.course_id} />
    </main>
  );
}