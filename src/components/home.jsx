// src/components/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';

function Home() {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Weekly Routine Builder</h1>
        <p className="subtitle">A simple two-step process to build and export your weekly schedule.</p>
      </div>
      
      <div className="workflow-steps">
        
        {/* STEP 1: Setup */}
        <div className="step-card setup-step">
          <h2>Step 1: Configure Data</h2>
          <p>Before building the timetable, you must define the building blocks: Subjects and the Teachers assigned to them.</p>
          <Link to="/form" className="btn-action">
            ✏️ Manage Subjects & Teachers
          </Link>
        </div>
        
        {/* Separator */}
        <div className="step-separator">↓</div>
        
        {/* STEP 2: Routine */}
        <div className="step-card routine-step">
          <h2>Step 2: Create Routine</h2>
          <p>Once data is configured, drag and drop (or select) entries onto the grid to compile the final weekly routine.</p>
          <Link to="/table" className="btn-action primary">
            🗓️ View & Edit Routine
          </Link>
        </div>

      </div>
      
      <div className="footer-note">
        <p>Note: You must complete Step 1 before Step 2 will show populated data.</p>
      </div>
    </div>
  );
}

export default Home;