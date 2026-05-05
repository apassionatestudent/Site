
import { Routes, Route } from 'react-router-dom';
import './App.css'

// => import components
import NavBar from './components/Navbar/NavBar.jsx';
import Footer from './components/Footer/Footer.jsx';

// => import pages
import Home    from './pages/public/Home/Home.jsx';
import About   from './pages/public/About/About.jsx';
import Courses from './pages/public/Courses/Courses.jsx';
import Enroll  from './pages/public/Enroll/Enroll.jsx';
import Contact from './pages/public/Contact/Contact.jsx';
import Login   from './pages/public/Login/Login.jsx';

function App() {

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/home"    element={<Home />} />
        <Route path="/about"   element={<About />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/enroll"  element={<Enroll />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login"   element={<Login />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App
