// src/components/RoutineManager.jsx
import React, { useState } from 'react';
import RoutineTable from './table';
import './RoutineManager.css';

function RoutineManager() {
  const [routines, setRoutines] = useState([1]); // Start with one routine
  
  // Track teacher assignments across all routines
  // Format: { "teacherId": { "time": ["routine1", "routine2"] } }
  const [teacherSchedules, setTeacherSchedules] = useState({});

  // Handler to add a new routine
  const handleAddRoutine = () => {
    setRoutines(prev => [...prev, prev.length + 1]);
  };

  // Update teacher schedule when a teacher is assigned/removed
  const updateTeacherSchedule = (routineId, dayIndex, timeSlot, teacherId, prevTeacherId = null) => {
    setTeacherSchedules(prev => {
      const updated = { ...prev };
      
      // Remove previous teacher assignment if exists
      if (prevTeacherId && updated[prevTeacherId]) {
        const key = `${dayIndex}-${timeSlot}`;
        if (updated[prevTeacherId][key]) {
          updated[prevTeacherId][key] = updated[prevTeacherId][key].filter(
            id => id !== routineId
          );
          // Clean up empty arrays
          if (updated[prevTeacherId][key].length === 0) {
            delete updated[prevTeacherId][key];
          }
          // Clean up empty teacher objects
          if (Object.keys(updated[prevTeacherId]).length === 0) {
            delete updated[prevTeacherId];
          }
        }
      }
      
      // Add new teacher assignment
      if (teacherId) {
        const key = `${dayIndex}-${timeSlot}`;
        if (!updated[teacherId]) {
          updated[teacherId] = {};
        }
        if (!updated[teacherId][key]) {
          updated[teacherId][key] = [];
        }
        if (!updated[teacherId][key].includes(routineId)) {
          updated[teacherId][key].push(routineId);
        }
      }
      
      return updated;
    });
  };

  // Check if a teacher is available for a specific time slot
  const isTeacherAvailable = (routineId, dayIndex, timeSlot, teacherId) => {
    if (!teacherSchedules[teacherId]) return true;
    
    const key = `${dayIndex}-${timeSlot}`;
    const assignments = teacherSchedules[teacherId][key] || [];
    
    // Teacher is available if not assigned anywhere or only assigned to current routine
    return assignments.length === 0 || 
           (assignments.length === 1 && assignments[0] === routineId);
  };

  // Get conflicting routine for a teacher at a specific time
  const getConflictingRoutine = (routineId, dayIndex, timeSlot, teacherId) => {
    if (!teacherSchedules[teacherId]) return null;
    
    const key = `${dayIndex}-${timeSlot}`;
    const assignments = teacherSchedules[teacherId][key] || [];
    
    const conflictingRoutineId = assignments.find(id => id !== routineId);
    if (conflictingRoutineId) {
      return routines.indexOf(conflictingRoutineId) + 1; // Return routine number (1-based)
    }
    return null;
  };

  return (
    <div className="routine-manager">
      <h1>Routine Manager</h1>
      <p>Use the table(s) below to view, edit, and download routines.</p>

      {/* Add Routine Button */}
      <button className="add-routine-btn" onClick={handleAddRoutine}>
        ➕ Add New Routine
      </button>

      {/* Render one RoutineTable per routine */}
      {routines.map((id, index) => (
        <div className="routine-block" key={id}>
          <h2>Routine {index + 1}</h2>
          <RoutineTable 
            routineId={id}
            routineNumber={index + 1}
            updateTeacherSchedule={updateTeacherSchedule}
            isTeacherAvailable={isTeacherAvailable}
            getConflictingRoutine={getConflictingRoutine}
          />
        </div>
      ))}
    </div>
  );
}

export default RoutineManager;