import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axiosStudent from "../../../utils/axiosStudent";
import ConfirmModal from "../ConfirmModal/ConfirmModal.jsx";
import "./SideBar.css";

import AnnouncementsIcon from "../../../assets/icons/announcements.png";
import AccountIcon from "../../../assets/icons/account.png";
import DocumentsIcon from "../../../assets/icons/documents.png";
import EnrollmentIcon from "../../../assets/icons/enroll.png";  
import ClassesIcon from "../../../assets/icons/classes.png";
import SupportIcon from "../../../assets/icons/support.png";
import LogsIcon from "../../../assets/icons/logs.png";
import LogoutIcon from "../../../assets/icons/logout.png";
import DefaultAvatar from "../../../assets/icons/default-avatar.png";
import Payments from "../../../assets/icons/payments.png";
import Site from "../../../assets/icons/site.png";

/*
  Sidebar converted to use NavLink (React Router v6+).
  - Each nav item uses NavLink so routing and active state come from react-router.
  - className is a function that applies active/hover classes.
  - onNavClick is still called for analytics or app state updates.
  - Logout remains a button because it's an action (not navigation).
*/

// => "end" controls exact-path matching per nav item
// => announcements and back-to-site need end:true since their paths are prefixes of every other route
// => classes/enrollment/documents/payments must stay unmarked (prefix match) so nested detail routes keep the parent highlighted
const NAV_ITEMS = [
  { id: "announcements", label: "Announcements", icon: AnnouncementsIcon, to: "dashboard/", end: true },
  { id: "account",       label: "Account",       icon: AccountIcon,       to: "dashboard/account" },
  { id: "enrollment",    label: "Enrollment",    icon: EnrollmentIcon,    to: "dashboard/enrollment" },
  { id: "documents",     label: "Documents",     icon: DocumentsIcon,     to: "dashboard/documents" },
  { id: "classes",       label: "Classes",       icon: ClassesIcon,       to: "dashboard/classes" },
  { id: "support",       label: "Support Tickets", icon: SupportIcon,     to: "dashboard/supporttickets" },
  { id: "payments",      label: "Payments",      icon: Payments,          to: "dashboard/payments" },
  { id: "logs",          label: "Logs",          icon: LogsIcon,          to: "dashboard/logs" },
  { id: "back to site",  label: "Back to Site",  icon: Site,              to: "/", end: true }
];

const Sidebar = ({
  profilePicture = DefaultAvatar,
  profileName    = "Student Name",
  onNavClick     = () => {},
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  // => Controls whether the logout confirmation modal is visible
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const navigate = useNavigate();

  // => Clears the localStorage flag, calls the backend to clear the httpOnly cookie,
  // => then redirects to /login. Only ever called after the student confirms.
  const handleLogout = async () => {
    try {
      await axiosStudent.post('/student-auth/logout', {});
    } catch (error) {
      // => Even if the backend call fails, still clear the frontend state
      console.error('Logout error:', error);
    } finally {
      // => Clear both storages on logout regardless of which one was used on login
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('isLoggedIn');
      setIsLogoutConfirmOpen(false);
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
          {NAV_ITEMS.map(({ id, label, icon, to, end }) => (
            <li key={id}>
              <NavLink
                to={to}
                className={navLinkClass(id)}
                onClick={() => onNavClick(id)}
                onMouseEnter={() => setHoveredItem(id)}
                onMouseLeave={() => setHoveredItem(null)}
                end={!!end}
              >
                <img src={icon} alt={`${label} icon`} className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">{label}</span>
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
          onClick={() => setIsLogoutConfirmOpen(true)}
        >
          <img src={LogoutIcon} alt="Logout icon" className="sidebar-nav-icon" />
          <span className="sidebar-nav-label">Logout</span>
        </button>
      </div>

      {/* => Confirms intent before clearing the session, avoids accidental logout from a misclick */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        message="Are you sure you want to log out?"
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;