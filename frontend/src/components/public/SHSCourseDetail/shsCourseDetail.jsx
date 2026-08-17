import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import layersIcon from '../../../assets/icons/layers.png';
import graduationCapIcon from '../../../assets/icons/graduation-cap.png';
import briefcaseIcon from '../../../assets/icons/briefcase.png';
import linkIcon from '../../../assets/icons/link.png';
import BackButton from '../BackButton/BackButton.jsx';
import ChatbotWidget from '../ChatbotWidget/chatbotWidget.jsx';
import './shsCourseDetail.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SHSCourseDetail() {
  const { title } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // => useParams already gives a decoded value, but decodeURIComponent is
    // => safe to run again since decoding plain text is a no-op
    const decodedTitle = decodeURIComponent(title);

    fetch(`${API_BASE}/api/public/shs-courses/${encodeURIComponent(decodedTitle)}`)
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
    return <main className="shs-course-detail"><p>Loading...</p></main>;
  }

  if (error) {
    return (
      <main className="shs-course-detail">
        <BackButton destination="SHS Courses" />
        <p className="shs-course-detail-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="shs-course-detail">
      {/* => Defaults to navigate(-1), so it returns to wherever the visitor came
         => from (the SHS list, a search result, etc.) rather than a fixed route */}
      <BackButton destination="SHS Courses" />
      <section className="shs-course-hero">
        <div className="shs-course-badges">
          {/* => Falls back to "Unclustered" if a course somehow has no cluster_id set */}
          <span className="shs-course-badge">
            <img src={layersIcon} alt="" className="shs-course-icon" /> {course.cluster_name || 'Unclustered'}
          </span>
          {/* => grade_level is already stored as "Grade 11" / "Grade 12", shown as-is */}
          <span className="shs-course-badge shs-course-badge-grade">
            <img src={graduationCapIcon} alt="" className="shs-course-icon" /> {course.grade_level}
          </span>
        </div>
        <h1>{course.title}</h1>
        {/* => course_link is optional (nullable in the schema) - only render this
           => line at all if a link was actually set for this course */}
        {course.course_link && (
          <p className="shs-course-meta">
            <img src={linkIcon} alt="" className="shs-course-icon" />
            <a href={course.course_link} target="_blank" rel="noopener noreferrer">
              View Curriculum Reference
            </a>
          </p>
        )}
        <p className="shs-course-desc">{course.description}</p>
      </section>

      {course.job_opportunities?.length > 0 && (
        <section className="shs-course-section">
          <h2><img src={briefcaseIcon} alt="" className="shs-course-icon" /> Job Opportunities</h2>
          <ul>
            {course.job_opportunities.map((j) => (
              <li key={j.job_id}>{j.job_title}</li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/enroll" className="shs-course-enroll-btn">Enroll Now</Link>

      {/* => Course-scoped chatbot, only renders a FAB if an admin has an
             active bot configured for this specific course */}
      <ChatbotWidget scope="shs_course" courseId={course.course_id} />
    </main>
  );
}