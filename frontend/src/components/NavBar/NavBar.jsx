import React, { useState } from 'react';
import { Link } from 'react-router-dom';  // 
import './NavBar.css';
import homeIcon from '../../assets/icons/home.png';
import aboutIcon from '../../assets/icons/about.png';
import coursesIcon from '../../assets/icons/courses.png';
import enrollIcon from '../../assets/icons/enroll.png';
import contactIcon from '../../assets/icons/contact.png';
import loginIcon from '../../assets/icons/login.png';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="logo"> 
          <img src="/logo_white_border.png" alt="Logo of 3A Prime Hospitality Training and Assessment Center Inc." className="logo-icon" />
          <span className="logo-text">3A Prime Hospitality Training Center</span>
        </Link>
      </div>
      <div className={`nav-right ${isOpen ? 'active' : ''}`}>
        <ul className="nav-links">
          <li><Link to="/home"><img src={homeIcon} alt="Home" className="logo-icon" /> Home</Link></li>
          <li><Link to="/about"><img src={aboutIcon} alt="About" /> About</Link></li>
          <li><Link to="/courses"><img src={coursesIcon} alt="Courses" /> Courses</Link></li>
          <li><Link to="/enroll"><img src={enrollIcon} alt="Enroll" /> Enroll</Link></li>
          <li><Link to="/contact"><img src={contactIcon} alt="Contact" /> Contact</Link></li>
          <li><Link to="/login"><img src={loginIcon} alt="Login" /> Login</Link></li>
        </ul>
      </div>
      <div className="hamburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </nav>
  );
};
export default NavBar;