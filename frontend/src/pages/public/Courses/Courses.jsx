import { Link } from 'react-router-dom';
import './Courses.css';

// => Landing page for course browsing - visitor picks a track first,
// => then drills into that track's dedicated course list page
export default function Courses() {
  return (
    <main className="courses">
      <section className="page-hero" data-watermark="COURSES">
        <div className="page-hero-inner">
          <span className="page-hero-tag">Courses</span>
          <h1>Master Your Craft</h1>
          <p className="page-hero-sub">
            Enroll in one of our programs designed to prepare you for National Certification and opportunities.
          </p>
        </div>
        <div className="page-hero-rule" />
      </section>

      <section className="courses-picker">
        <p className="courses-picker-label">Which program are you interested in?</p>

        <div className="courses-picker-grid">
          {/* => Senior High School track - build-out for this comes later */}
          <Link to="/courses/shs" className="courses-picker-card">
            <h3>Senior High School</h3>
            <p>Grade 11 and 12, Academic and Technical-Vocational tracks</p>
            <span className="courses-picker-cta">View SHS Courses</span>
          </Link>

          {/* => TESDA track */}
          <Link to="/courses/tesda" className="courses-picker-card">
            <h3>TESDA Course</h3>
            <p>Technical-Vocational training, NC I to NC III</p>
            <span className="courses-picker-cta">View TESDA Courses</span>
          </Link>
        </div>
      </section>
    </main>
  );
}