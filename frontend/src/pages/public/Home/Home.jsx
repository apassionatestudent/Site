import './Home.css';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-tag">Welcome</span>
          <h1>3A Prime Hospitality <br /><span>Training Center</span> Inc.</h1>
          <p>Empowering the next generation of hospitality professionals through world-class training and assessment programs.</p>
          <div className="home-hero-actions">
            <Link to="/courses" className="btn-primary">Explore Courses</Link> 
            <Link to="/about" className="btn-secondary">Learn More</Link>      
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="home-feature-card">
          <div className="feature-icon">🎓</div>
          <h3>Expert Instructors</h3>
          <p>Learn from certified professionals with years of industry experience.</p>
        </div>
        <div className="home-feature-card">
          <div className="feature-icon">📋</div>
          <h3>Accredited Programs</h3>
          <p>Nationally recognized certifications that open doors in the hospitality industry.</p>
        </div>
        <div className="home-feature-card">
          <div className="feature-icon">🤝</div>
          <h3>Career Support</h3>
          <p>Dedicated placement assistance and career guidance after graduation.</p>
        </div>
      </section>
    </main>
  );
}
