import './Home.css';
import { Link } from 'react-router-dom';

// => Feature card icons, actual PNGs instead of emoji/text icons
import GraduationCapIcon from './../../../assets/icons/graduation-cap.png';
import ClipboardIcon from './../../../assets/icons/clipboard.png';
import HandshakeIcon from './../../../assets/icons/handshake.png';

export default function Home() {
  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-tag">Welcome</span>
          <h1>3A Prime Hospitality <br /><span>Training and Assessment Center </span> Inc.</h1>
          <p>Providing students with the finest hospitality training in the field of Culinary Arts & Food and Beverages.</p>
          <div className="home-hero-actions">
            <Link to="/courses" className="btn-primary">Explore Courses</Link> 
            <Link to="/about" className="btn-secondary">Learn More</Link>      
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="home-feature-card">
          {/* => actual PNG icon instead of emoji, alt left empty since h3 already labels the card */}
          <img src={GraduationCapIcon} alt="" className="feature-icon" />
          <h3>Expert Instructors</h3>
          <p>Learn from certified professionals with years of industry experience.</p>
        </div>
        <div className="home-feature-card">
          <img src={ClipboardIcon} alt="" className="feature-icon" />
          <h3>Accredited Programs</h3>
          <p>Nationally recognized certifications that open doors in the hospitality industry.</p>
        </div>
        <div className="home-feature-card">
          <img src={HandshakeIcon} alt="" className="feature-icon" />
          <h3>Career Support</h3>
          <p>Dedicated placement assistance and career guidance after graduation.</p>
        </div>
      </section>
    </main>
  );
}
