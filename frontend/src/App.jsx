import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css'
// => import public components
import NavBar from './components/public/Navbar/NavBar.jsx';
import Footer from './components/public/Footer/Footer.jsx';
import NotFound from './components/NotFound.jsx';
// => import private components
import Sidebar from './components/private/SideBar/SideBar.jsx';
// => import public pages
import Home from './pages/public/Home/Home.jsx';
import About from './pages/public/About/About.jsx';
import Courses from './pages/public/Courses/Courses.jsx';
import Enroll from './pages/public/Enroll/Enroll.jsx';
import Contact from './pages/public/Contact/Contact.jsx';
import Login from './pages/public/Login/Login.jsx';
// => import private (dashboard) pages
import Dashboard from './pages/private/Dashboard/Dashboard.jsx';
import Account from './pages/private/Account/Account.jsx';
import Documents from './pages/private/Documents/Documents.jsx';
import Enrollment from './pages/private/Enrollment/Enrollment.jsx';
import SupportTickets from './pages/private/SupportTickets/SupportTickets.jsx';
import Announcements from './pages/private/Announcements/Announcements.jsx';
// => all routes that belong to the student dashboard
const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/account',
  '/dashboard/documents',
  '/dashboard/enrollment',
  '/dashboard/support',
  '/dashboard/announcements',
];
function App() {
  const location = useLocation();
  // => true when the user is on any dashboard route
  const isDashboard = DASHBOARD_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  return (
    <div className="app-shell">
      {/* => show public NavBar only on public pages */}
      {!isDashboard && <NavBar isLoggedIn={isLoggedIn} />}
      {/* => show Sidebar only on dashboard pages */}
      {isDashboard && <Sidebar />}
      <main className={isDashboard ? 'app-main app-main--dashboard' : 'app-main'}>
        <Routes>
          {/* => public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
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
                    <Route path="enrollment" element={<Enrollment />} />
                    <Route path="supporttickets" element={<SupportTickets />} />
                  </Routes>
                )
                : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {/* => show Footer only on public pages */}
      {!isDashboard && <Footer />}
    </div>
  )
}
export default App;