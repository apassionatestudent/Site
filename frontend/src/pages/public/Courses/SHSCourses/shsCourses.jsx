import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './shsCourses.css';

// => Swap this for your existing axios instance if the public site already has one
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SHSCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // => Fetch the public, active SHS course catalog
    fetch(`${API_BASE}/api/public/shs-courses`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load courses');
        return res.json();
      })
      .then((data) => {
        // => Guards against courses.map crashing if the API ever returns
        // => something other than a plain array (e.g. an error object)
        setCourses(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // => Cuts a description down to a max word count, appending "..." if it was cut
  // => Used only on the list/grid view; the detail page still shows the full text
  const truncateWords = (text, wordLimit = 10) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  return (
    <main className="shs-courses">
      <section className="page-hero" data-watermark="SHS">
        <div className="page-hero-inner">
          <span className="page-hero-tag">SHS Courses</span>
          <h1>Senior High School Programs</h1>
          <p className="page-hero-sub">
            Browse our Senior High School clusters and the courses offered under each one.
          </p>
        </div>
        <div className="page-hero-rule" />
      </section>

      {loading && <p className="shs-courses-status">Loading courses...</p>}
      {error && <p className="shs-courses-status shs-courses-error">{error}</p>}

      {!loading && !error && (
        <section className="shs-courses-grid">
          {courses.map((course) => (
            <div key={course.course_id} className="course-card">
              <div className="course-card-header">
                {/* => Falls back to "Unclustered" if a course somehow has no cluster_id set */}
                <span className="course-cluster-tag">
                  {course.cluster_name || 'Unclustered'}
                </span>
              </div>
              {/* => Grade level appended to the title instead of a separate capsule -
                 => the outline tag read as visual clutter competing with the cluster tag */}
              <h3>{course.title} ({course.grade_level})</h3>
              <p>{truncateWords(course.description)}</p>
              {/* => encodeURIComponent turns spaces into %20 automatically */}
              <Link to={`/courses/shs/${encodeURIComponent(course.title)}`} className="course-enroll-btn">
                View Course
              </Link>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}