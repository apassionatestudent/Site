import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css'

// => Icons for the mobile hamburger toggle button
import MenuIcon from './assets/icons/menu.png';
import CloseIcon from './assets/icons/close.png';

import { Toaster } from "react-hot-toast";
// => reuses the same axios instance Sidebar already uses for logout
import axiosStudent from './utils/axiosStudent';

// => import public components
import NavBar from './components/public/Navbar/NavBar.jsx';
import Footer from './components/public/Footer/Footer.jsx';
import NotFound from './components/NotFound.jsx';

// => import private components
import Sidebar from './components/private/SideBar/SideBar.jsx';
// import EnrollmentDetail from './components/private/EnrollmentDetail/EnrollmentDetail.jsx';
import TESDAEnrollmentDetail from './components/private/TESDAEnrollmentDetail/tesdaEnrollmentDetail.jsx';
import SHSEnrollmentDetail   from './components/private/SHSEnrollmentDetail/shsEnrollmentDetail.jsx';
import DocumentDetail from './components/private/DocumentDetail/DocumentDetail.jsx';
import TESDAClassDetail from './components/private/TESDAClassDetail/tesdaClassDetail.jsx';
import SHSClassDetail from './components/private/SHSClassDetail/shsClassDetail.jsx';

// => import public pages
import Home from './pages/public/Home/Home.jsx';
import About from './pages/public/About/About.jsx';

import Courses from './pages/public/Courses/Courses.jsx';
import TESDACourses from './pages/public/Courses/TESDACourses/tesdaCourses.jsx';
import TESDACourseDetail from './components/public/TESDACourseDetail/tesdaCourseDetail.jsx';

import SHSCourses from './pages/public/Courses/SHSCourses/shsCourses.jsx';
import SHSCourseDetail from './components/public/SHSCourseDetail/shsCourseDetail.jsx';

import Enroll from './pages/public/Enroll/Enroll.jsx';
import Contact from './pages/public/Contact/Contact.jsx';
import Login from './pages/public/Login/Login.jsx';
import ForgotPassword from './pages/public/ForgotPassword/forgotPassword.jsx';
import SetPassword from './pages/public/SetPassword/setPassword.jsx';
import PrivacyPolicy from './pages/public/LegalPolicy/legalPolicy.jsx';
import FAQs from './pages/public/FAQs/faqs.jsx';

// => import private (dashboard) pages
import Dashboard from './pages/private/Dashboard/Dashboard.jsx';
import Account from './pages/private/Account/account.jsx';
import Documents from './pages/private/Documents/Documents.jsx';
import Enrollment from './pages/private/Enrollment/Enrollment.jsx';
import SupportTickets from './pages/private/SupportTickets/supportTickets.jsx';
import SupportTicketDetail from './components/private/SupportTicketDetail/supportTicketDetail.jsx';
import Announcements from './pages/private/Announcements/Announcements.jsx';
import Classes from './pages/private/Classes/classes.jsx';
import Payments from './pages/private/Payments/payments.jsx';
import PaymentDetail from './components/private/Payments/PaymentDetail/paymentDetail.jsx';
import RefundDetail from './components/private/Payments/RefundDetail/refundDetail.jsx';
import Logs from './pages/private/Logs/logs.jsx';

// => all routes that belong to the student dashboard
const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/account',
  '/dashboard/documents',
  '/dashboard/enrollment',
  '/dashboard/support',
  '/dashboard/announcements',
  '/dashboard/classes',
  '/dashboard/payments',
  '/dashboard/logs',
];

function App() {
  const location = useLocation();
  // => true when the user is on any dashboard route
  const isDashboard = DASHBOARD_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );
  // => true on Login, ForgotPassword, and SetPassword - all three share the
  // => same full-card layout that fills the viewport on its own, so the
  // => Footer below any of them just adds unwanted scroll
  const isLogin = ['/login', '/forgot-password', '/set-password'].includes(location.pathname);

  // => checks both storage types so this matches the dashboard route's login check
const isLoggedIn =
  localStorage.getItem('isLoggedIn') === 'true' ||
  sessionStorage.getItem('isLoggedIn') === 'true';

  // => Holds the logged-in student's display name for the Sidebar
  const [studentName, setStudentName] = useState('Student Name');

  // => Controls the mobile slide-in sidebar, only relevant below 768px
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // => Auto-closes the mobile menu whenever the route changes,
  // => covers cases like browser back/forward that skip the NavLink onClick
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // => Fetches the student's own profile once per login session
  // => Runs only when logged in, since /me is a protected route
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchStudentName = async () => {
      try {
        const res = await axiosStudent.get('/student-auth/me');
        // => Falls back to the default if full_name comes back null
        if (res.data?.student?.full_name) {
          setStudentName(res.data.student.full_name);
        }
      } catch (error) {
        console.error('Failed to fetch student profile for Sidebar:', error);
      }
    };

    fetchStudentName();
  }, [isLoggedIn]);

  return (
    <div className="app-shell">
      {/* => show public NavBar only on public pages */}
      {!isDashboard && <NavBar isLoggedIn={isLoggedIn} />}
      {/* => show Sidebar only on dashboard pages */}
      {isDashboard && (
        <Sidebar
          profileName={studentName}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      {/* => hamburger button, only rendered on dashboard pages, hidden above 768px via CSS */}
      {isDashboard && (
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          <img
            src={isSidebarOpen ? CloseIcon : MenuIcon}
            alt=""
            className="sidebar-toggle-icon"
          />
        </button>
      )}

      {/* => dark overlay behind the open sidebar, tapping it closes the menu */}
      {isDashboard && (
        <div
          className={`sidebar-overlay ${isSidebarOpen ? "sidebar-overlay--visible" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <main className={isDashboard ? 'app-main app-main-dashboard' : 'app-main'}>
        <Routes>
          {/* => public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/tesda" element={<TESDACourses />} />
          <Route path="/courses/tesda/:title" element={<TESDACourseDetail />} />

          <Route path="/courses/shs" element={<SHSCourses />} />
          <Route path="/courses/shs/:title" element={<SHSCourseDetail />} />

          {/* => Enroll page is for new applicants only, already-enrolled students get redirected to their dashboard */}
          <Route
            path="/enroll"
            element={
              isLoggedIn
                ? <Navigate to="/dashboard/enrollment" replace />
                : <Enroll />
            }
          />
          {/* => Contact page is for guests only, logged-in students get redirected to their Support Tickets tab instead */}
          <Route
            path="/contact"
            element={
              isLoggedIn
                ? <Navigate to="/dashboard/supporttickets" replace />
                : <Contact />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/faqs" element={<FAQs />} />
          {/* => private / dashboard routes */}
          {/* => checks localStorage before rendering any dashboard route */}
          {/* => if not logged in, redirects to /login without rendering the page at all */}
          <Route
            path="/dashboard/*"
            element={
              localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true'
                ? (
                  <Routes>
                    <Route index element={<Announcements />} />
                    <Route path="account" element={<Account />} />
                    <Route path="documents" element={<Documents />} />
                    <Route path="documents/:publicId" element={<DocumentDetail />} />

                    <Route path="enrollment" element={<Enrollment />} />
                    {/* => Detail view - :publicId is the UUID */}
                    {/* <Route path="enrollment/:publicId" element={<EnrollmentDetail />} /> */}
                    <Route path="enrollment/tesda/:publicId" element={<TESDAEnrollmentDetail />} />
                    <Route path="enrollment/shs/:publicId" element={<SHSEnrollmentDetail />} />

                    {/* => Classes list shows only Approved enrollments' batches, unified across tracks */}
                    <Route path="classes" element={<Classes />} />
                    {/* => Detail routes split by track since TESDA and SHS batches differ in structure */}
                    <Route path="classes/tesda/:publicId" element={<TESDAClassDetail />} />
                    <Route path="classes/shs/:publicId" element={<SHSClassDetail />} />

                    <Route path="supporttickets" element={<SupportTickets />} />
                    <Route path="supporttickets/:publicId" element={<SupportTicketDetail />} />

                    <Route path="payments" element={<Payments />} />
                    <Route path="payments/refunds/:publicId" element={<RefundDetail />} />
                    <Route path="payments/:publicId" element={<PaymentDetail />} />

                    <Route path="logs" element={<Logs />} />
                  </Routes>
                )
                : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster /> {/* For toast notifications */}
      </main>
      {/* => show Footer only on public pages, and never on the Login page */}
      {!isDashboard && !isLogin && <Footer />}
    </div>
  )
}
export default App;