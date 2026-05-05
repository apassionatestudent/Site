import './Courses.css';

const courses = [
  { id: 1, title: 'Food & Beverage Service', duration: '3 months', level: 'Beginner', desc: 'Master the fundamentals of professional food and beverage service.' },
  { id: 2, title: 'Housekeeping Operations', duration: '2 months', level: 'Beginner', desc: 'Learn industry-standard housekeeping procedures and management.' },
  { id: 3, title: 'Front Office Management', duration: '3 months', level: 'Intermediate', desc: 'Develop skills in reservations, guest relations, and front desk operations.' },
  { id: 4, title: 'Culinary Arts', duration: '6 months', level: 'Intermediate', desc: 'Hands-on training in professional kitchen operations and cuisine preparation.' },
  { id: 5, title: 'Hotel Management', duration: '6 months', level: 'Advanced', desc: 'Comprehensive training covering all aspects of hotel operations and leadership.' },
  { id: 6, title: 'Events Management', duration: '3 months', level: 'Intermediate', desc: 'Plan and execute professional events from corporate to social gatherings.' },
];

export default function Courses() {
  return (
    <main className="courses">
      <section className="courses-hero">
        <span className="courses-tag">Programs</span>
        <h1>Our Courses</h1>
        <p>Choose from a range of accredited hospitality programs designed for real-world success.</p>
      </section>

      <section className="courses-grid">
        {courses.map(course => (
          <div key={course.id} className="course-card">
            <div className="course-card-header">
              <span className={`course-level level-${course.level.toLowerCase()}`}>{course.level}</span>
              <span className="course-duration">{course.duration}</span>
            </div>
            <h3>{course.title}</h3>
            <p>{course.desc}</p>
            <a href="/enroll" className="course-enroll-btn">Enroll Now</a>
          </div>
        ))}
      </section>
    </main>
  );
}
