import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './shsCourses.css';
// => Shared loading/error UI, lives in components/public/LoadingState
// => Path goes up 4 folders (SHSCourses > Courses > public > pages) to reach src, then back down
import LoadingState from '../../../../components/public/LoadingState/loadingState';
import BackButton from '../../../../components/public/BackButton/BackButton.jsx';

// => Swap this for your existing axios instance if the public site already has one
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SHSCourses() {
  const navigate = useNavigate(); // => explicit route target, so Back always lands on /courses regardless of browser history
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // => Pulled out of useEffect so the Retry button inside LoadingState can
  // => re-run this exact fetch, instead of forcing a full page reload
  const loadCourses = () => {
    setLoading(true);
    setError(null);

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
  };

  useEffect(() => {
    loadCourses();
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
        {/* => centered under the hero rule, points back to the Courses picker page instead of the browser history default */}
        <div className="shs-courses-back-wrap">
          <BackButton destination="Courses" onClick={() => navigate('/courses')} />
        </div>
      </section>

      {/* => Shared spinner while the fetch is in flight */}
      {loading && <LoadingState message="Loading courses..." />}

      {/* => Shared error block, Retry re-runs loadCourses instead of reloading the page */}
      {error && (
        <LoadingState
          variant="error"
          message={error}
          onRetry={loadCourses}
        />
      )}

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