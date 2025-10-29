// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Page components
import Home from './components/home';
import Form from './components/form';          
import RoutineManager from './components/RoutineManager'; // hope this is working 
import AboutUs from './components/AboutUs';

function App() {
  return (
    <Router>
      {/* Navigation Bar */}
      <nav className="navbar">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/form">Add Subject</Link></li>
          <li><Link to="/table">View Routine</Link></li> {/* URL stays same */}
          <li><Link to="/about">About Us</Link></li>
        </ul>
      </nav>

      {/* Main Content */}
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/form" element={<Form />} />
          <Route path="/table" element={<RoutineManager />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;