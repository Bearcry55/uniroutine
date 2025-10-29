// src/components/RoutineManager.jsx
import React, { useState } from 'react';
import RoutineTable from './table';
import './RoutineManager.css'; // Optional styling file

function RoutineManager() {
  const [routines, setRoutines] = useState([1]); // Start with one routine

  // Handler to add a new routine
  const handleAddRoutine = () => {
    setRoutines(prev => [...prev, prev.length + 1]); // Add new ID
  };

  return (
    <div className="routine-manager">
      <h1>Routine Manager</h1>
      <p>Use the table(s) below to view, edit, and download routines.</p>

      {/* Add Routine Button */}
      <button className="add-routine-btn" onClick={handleAddRoutine}>
        ➕ Add New Routine
      </button>

      {/* 👇 Render one RoutineTable per routine (with index as ID) */}
      {routines.map((id, index) => (
        <div className="routine-block" key={id}>
          <h2>Routine {index + 1}</h2>
          <RoutineTable />
        </div>
      ))}
    </div>
  );
}

export default RoutineManager;