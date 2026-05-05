import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
          <img src="/logo_white_border.png" alt="Logo" className="logo-icon" />
          <span className="logo-text">3A Prime Hospitality Training Center</span>
        </Link>
      </div>
      <div className={`nav-right ${isOpen ? 'active' : ''}`}>
        <ul className="nav-links">
          <li><NavLink to="/home"><img src={homeIcon} alt="Home" className="nav-icon" /> Home</NavLink></li>
          <li><NavLink to="/about"><img src={aboutIcon} alt="About" className="nav-icon" /> About</NavLink></li>
          <li><NavLink to="/courses"><img src={coursesIcon} alt="Courses" className="nav-icon" /> Courses</NavLink></li>
          <li><NavLink to="/enroll"><img src={enrollIcon} alt="Enroll" className="nav-icon" /> Enroll</NavLink></li>
          <li><NavLink to="/contact"><img src={contactIcon} alt="Contact" className="nav-icon" /> Contact</NavLink></li>
          <li><NavLink to="/login"><img src={loginIcon} alt="Login" className="nav-icon" /> Login</NavLink></li>
        </ul>
      </div>
      <div className="hamburger" onClick={toggleMenu}>
        <span></span><span></span><span></span>
      </div>
    </nav>
  );
};

export default NavBar;