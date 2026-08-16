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
import menuIcon from '../../../assets/icons/menu.png'; // => hamburger icon, closed state
import closeIcon from '../../../assets/icons/close.png'; // => hamburger icon, open state

// => receives isLoggedIn from App.jsx to conditionally render login or dashboard link || {isLoggedIn }
const NavBar = (  ) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false); // => closes the drawer after a nav link is tapped, same pattern as onClose in the dashboard SideBar
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
              onClick={closeMenu}
            >
              <img src={homeIcon} alt="Home" className="nav-icon" /> Home
            </NavLink>
          </li>
          <li><NavLink to="/about" onClick={closeMenu}><img src={aboutIcon} alt="About" className="nav-icon" /> About</NavLink></li>
          <li><NavLink to="/courses" onClick={closeMenu}><img src={coursesIcon} alt="Courses" className="nav-icon" /> Courses</NavLink></li>
          {/* => only show Enroll link to visitors who are not logged in yet */}
          {!isLoggedIn && (
            <li><NavLink to="/enroll" onClick={closeMenu}><img src={enrollIcon} alt="Enroll" className="nav-icon" /> Enroll</NavLink></li>
          )}
          {/* => only show Contact link to visitors who are not logged in yet, logged-in students use Support Tickets instead */}
          {!isLoggedIn && (
            <li><NavLink to="/contact" onClick={closeMenu}><img src={contactIcon} alt="Contact" className="nav-icon" /> Contact</NavLink></li>
          )}
          <li>
            {/* => swap login link to dashboard when student is already logged in */}
            {/* <NavLink to={isLoggedIn ? '/dashboard' : '/login'}>
              <img src={loginIcon} alt="Login" className="nav-icon" />
              {isLoggedIn ? 'Dashboard' : 'Login'}
            </NavLink> */}
            {isLoggedIn 
              ? <NavLink to="/dashboard" onClick={closeMenu}><img src={dashboardIcon} alt="Dashboard" className="nav-icon" /> Dashboard</NavLink>
              : <NavLink to="/login" onClick={closeMenu}><img src={loginIcon} alt="Login" className="nav-icon" /> Login</NavLink>
            }
          </li>
          <li className="theme-item">
            <ThemeToggle />
          </li>
        </ul>
      </div>
      {/* => dark backdrop behind the open drawer, tapping it closes the menu, same pattern as the dashboard's sidebar-overlay */}
      <div
        className={`nav-overlay ${isOpen ? 'nav-overlay--visible' : ''}`}
        onClick={closeMenu}
      />
      {/* => second instance for mobile, floats bottom-left outside .nav-right so it is not clipped by that container's overflow-y: auto.
         => desktop keeps using the original instance inside nav-links, this one is hidden above 768px via CSS */}
      {/* => "active" class only added while the drawer is open, so this no longer floats over page content when the menu is closed */}
      <div className={`theme-toggle-fixed ${isOpen ? 'active' : ''}`}>
        <ThemeToggle />
      </div>
      <div className="hamburger" onClick={toggleMenu}>
        {/* => swaps icon based on menu state, same pattern as the dashboard's sidebar-toggle-btn in App.jsx */}
        <img
          src={isOpen ? closeIcon : menuIcon}
          alt={isOpen ? 'Close menu' : 'Open menu'}
          className="hamburger-icon"
        />
      </div>
    </nav>
  );
};

export default NavBar;