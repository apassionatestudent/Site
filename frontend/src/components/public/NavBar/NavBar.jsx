import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import ThemeToggle from "../../ThemeToggle"; // => day/night mode toggle button
import './NavBar.css';
import homeIcon from '../../../assets/icons/home.png';
import aboutIcon from '../../../assets/icons/about.png';
import coursesIcon from '../../../assets/icons/courses.png';
import enrollIcon from '../../../assets/icons/enroll.png';
import contactIcon from '../../../assets/icons/contact.png';
import loginIcon from '../../../assets/icons/login.png';
import dashboardIcon from '../../../assets/icons/dashboard.png';

// => receives isLoggedIn from App.jsx to conditionally render login or dashboard link || {isLoggedIn }
const NavBar = (  ) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const location = useLocation(); // => needed to also treat root path "/" as the Home link

  // => scrolls window to top whenever the route changes
  // => only fires for public pages since NavBar is not rendered on dashboard routes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isLoggedIn = 
  localStorage.getItem('isLoggedIn') === 'true' || 
  sessionStorage.getItem('isLoggedIn') === 'true';

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="logo">
          <img src="/logo_white_border.png" alt="Logo" className="logo-icon" />
          <span className="logo-text">PrimeEnroll Digital</span>
        </Link>
      </div>
      <div className={`nav-right ${isOpen ? 'active' : ''}`}>
        <ul className="nav-links">
          {/* => className overrides NavLink's default matching so root path "/" also counts as Home being active */}
          <li>
            <NavLink
              to="/home"
              className={({ isActive }) => (isActive || location.pathname === '/') ? 'active' : ''}
            >
              <img src={homeIcon} alt="Home" className="nav-icon" /> Home
            </NavLink>
          </li>
          <li><NavLink to="/about"><img src={aboutIcon} alt="About" className="nav-icon" /> About</NavLink></li>
          <li><NavLink to="/courses"><img src={coursesIcon} alt="Courses" className="nav-icon" /> Courses</NavLink></li>
          {/* => only show Enroll link to visitors who are not logged in yet */}
          {!isLoggedIn && (
            <li><NavLink to="/enroll"><img src={enrollIcon} alt="Enroll" className="nav-icon" /> Enroll</NavLink></li>
          )}
          {/* => only show Contact link to visitors who are not logged in yet, logged-in students use Support Tickets instead */}
          {!isLoggedIn && (
            <li><NavLink to="/contact"><img src={contactIcon} alt="Contact" className="nav-icon" /> Contact</NavLink></li>
          )}
          <li>
            {/* => swap login link to dashboard when student is already logged in */}
            {/* <NavLink to={isLoggedIn ? '/dashboard' : '/login'}>
              <img src={loginIcon} alt="Login" className="nav-icon" />
              {isLoggedIn ? 'Dashboard' : 'Login'}
            </NavLink> */}
            {isLoggedIn 
              ? <NavLink to="/dashboard"><img src={dashboardIcon} alt="Dashboard" className="nav-icon" /> Dashboard</NavLink>
              : <NavLink to="/login"><img src={loginIcon} alt="Login" className="nav-icon" /> Login</NavLink>
            }
          </li>
          <li className="theme-item">
            <ThemeToggle />
          </li>
        </ul>
      </div>
      <div className="hamburger" onClick={toggleMenu}>
        <span></span><span></span><span></span>
      </div>
    </nav>
  );
};

export default NavBar;