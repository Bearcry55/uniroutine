// src/components/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './home.css'; // We'll add optional styling

function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Let's Get Started!</h1>
        <p>Create your weekly class routine in just a few simple steps. Lets start your journey with just clicking the button   </p>
        <Link to="/form" className="btn-get-started">
          ➕ Add Your First Class
        </Link>
      </div>
    </div>
  );
}

export default Home;