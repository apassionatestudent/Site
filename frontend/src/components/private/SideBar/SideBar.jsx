import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import "./SideBar.css";

import AnnouncementsIcon from "../../../assets/icons/announcements.png";
import AccountIcon from "../../../assets/icons/account.png";
import DocumentsIcon from "../../../assets/icons/documents.png";
import EnrollmentIcon from "../../../assets/icons/enroll.png";
import SupportIcon from "../../../assets/icons/support.png";
import LogoutIcon from "../../../assets/icons/logout.png";
import DefaultAvatar from "../../../assets/icons/default-avatar.png";
import Site from "../../../assets/icons/site.png";

/*
  Sidebar converted to use NavLink (React Router v6+).
  - Each nav item uses NavLink so routing and active state come from react-router.
  - className is a function that applies active/hover classes.
  - onNavClick is still called for analytics or app state updates.
  - Logout remains a button because it's an action (not navigation).
*/

const NAV_ITEMS = [
  { id: "announcements", label: "Announcements", icon: AnnouncementsIcon, to: "dashboard/" },
  { id: "account",       label: "Account",       icon: AccountIcon,       to: "dashboard/account" },
  { id: "documents",     label: "Documents",     icon: DocumentsIcon,     to: "dashboard/documents" },
  { id: "enrollment",    label: "Enrollment",    icon: EnrollmentIcon,    to: "dashboard/enrollment" },
  { id: "support",       label: "Support Tickets", icon: SupportIcon,     to: "dashboard/supporttickets" },
  {id: "back to site",   label: "Back to Site",  icon: Site,              to: "/"}
];

const Sidebar = ({
  profilePicture = DefaultAvatar,
  profileName    = "Student Name",
  onNavClick     = () => {},
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  // => Clears the localStorage flag, calls the backend to clear the httpOnly cookie,
  // => then redirects to /login
  const handleLogout = async () => {
    try {
      await axios.post(
        'http://localhost:5000/api/student-auth/logout',
        {},
        { withCredentials: true } // => required so the backend can clear the httpOnly cookie
      );
    } catch (error) {
      // => Even if the backend call fails, still clear the frontend state
      console.error('Logout error:', error);
    } finally {
      // => Clear both storages on logout regardless of which one was used on login
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('isLoggedIn');
      navigate('/login');
    }
  };

  const navLinkClass = (id) => ({ isActive }) =>
    [
      "sidebar-nav-item",
      isActive ? "sidebar-nav-item--active" : "",
      hoveredItem === id ? "sidebar-nav-item--hovered" : "",
    ].join(" ").trim();

  return (
    <aside className="sidebar">
      <div className="sidebar-profile">
        <div className="sidebar-avatar-ring">
          <img
            src={profilePicture}
            alt={`${profileName}'s profile`}
            className="sidebar-avatar"
            onError={(e) => { e.target.src = DefaultAvatar; }}
          />
        </div>
        <p className="sidebar-profile-name">{profileName}</p>
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav" aria-label="Main navigation">
        <ul className="sidebar-nav-list">
          {NAV_ITEMS.map(({ id, label, icon, to }) => (
            <li key={id}>
              <NavLink
                to={to}
                className={navLinkClass(id)}
                onClick={() => onNavClick(id)}
                onMouseEnter={() => setHoveredItem(id)}
                onMouseLeave={() => setHoveredItem(null)}
                end
              >
                <img src={icon} alt={`${label} icon`} className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">{label}</span>

                {/* Optional: render DOM active bar via children prop instead of CSS-only:
                    children={({ isActive }) => (
                      <>
                        <img ... />
                        <span ...>{label}</span>
                        {isActive && <span className="sidebar-active-bar" aria-hidden="true" />}
                      </>
                    )}
                    If you prefer that pattern, replace img/span above with the children render-prop.
                */}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-logout-wrapper">
        <div className="sidebar-divider" />
        <button
          className="sidebar-nav-item sidebar-nav-item--logout"
          onClick={handleLogout}
        >
          <img src={LogoutIcon} alt="Logout icon" className="sidebar-nav-icon" />
          <span className="sidebar-nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;