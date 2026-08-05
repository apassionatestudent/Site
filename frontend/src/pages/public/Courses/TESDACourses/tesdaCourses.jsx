import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './tesdaCourses.css';
// => Shared loading/error UI, lives in components/public/LoadingState
// => Path goes up 4 folders (TESDACourses > Courses > public > pages) to reach src, then back down
import LoadingState from '../../../../components/public/LoadingState/loadingState';

// => Swap this for your existing axios instance if the public site already has one
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function TESDACourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // => Pulled out of useEffect so the Retry button inside LoadingState can
  // => re-run this exact fetch, instead of forcing a full page reload
  const loadCourses = () => {
    setLoading(true);
    setError(null);

    // => Fetch the public, active TESDA course catalog
    fetch(`${API_BASE}/api/public/tesda-courses`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load courses');
        return res.json();
      })
      .then((data) => {
        // => Temporary log so we can see the actual shape returned by the API
        console.log('tesda-courses response:', data);
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
    <main className="tesda-courses">
      <section className="page-hero" data-watermark="TESDA">
        <div className="page-hero-inner">
          <span className="page-hero-tag">TESDA Courses</span>
          <h1>Technical-Vocational Programs</h1>
          <p className="page-hero-sub">
            Browse our TESDA-accredited qualifications and their National Certification levels.
          </p>
        </div>
        <div className="page-hero-rule" />
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
        <section className="tesda-courses-grid">
          {courses.map((course) => (
            <div key={course.course_id} className="course-card">
              <div className="course-card-header">
                {/* => Falls back to "Unrated" when a course has no certification_id set yet */}
                {/* => Single maroon capsule style now, no per-level color coding */}
                <span className="course-level">
                  {course.nc_level || 'Unrated'}
                </span>
                <span className="course-duration">{course.hours} hrs</span>
              </div>
              <h3>{course.title}</h3>
              <p>{truncateWords(course.description)}</p>
              {/* => encodeURIComponent turns spaces into %20 automatically */}
              <Link to={`/courses/tesda/${encodeURIComponent(course.title)}`} className="course-enroll-btn">
                View Course
              </Link>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}