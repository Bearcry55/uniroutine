// src/components/RoutineManager.jsx
import React, { useState } from "react";
import RoutineTable from "./table";
import "./RoutineManager.css";

function RoutineManager() {
  const [routines, setRoutines] = useState([1]); // Start with one routine

  // Track teacher assignments across all routines
  // Format: { teacherId: { "dayIndex-timeSlot": [routineIds] } }
  const [teacherSchedules, setTeacherSchedules] = useState({});

  // ➕ Add a new routine
  const handleAddRoutine = () => {
    setRoutines((prev) => [...prev, prev.length + 1]);
  };

  // 🗑️ Delete a routine and clean its assignments
  const handleDeleteRoutine = (routineId) => {
    if (!window.confirm("Are you sure you want to delete this routine?")) return;

    // remove routine from list
    setRoutines((prev) => prev.filter((id) => id !== routineId));

    // clean teacherSchedules of this routine
    setTeacherSchedules((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((teacherId) => {
        Object.keys(updated[teacherId]).forEach((timeKey) => {
          updated[teacherId][timeKey] = updated[teacherId][timeKey].filter(
            (id) => id !== routineId
          );
          if (updated[teacherId][timeKey].length === 0)
            delete updated[teacherId][timeKey];
        });
        if (Object.keys(updated[teacherId]).length === 0)
          delete updated[teacherId];
      });
      return updated;
    });
  };

  // 🔄 Update teacher schedule when assigning/removing
  const updateTeacherSchedule = (
    routineId,
    dayIndex,
    timeSlot,
    teacherId,
    prevTeacherId = null
  ) => {
    setTeacherSchedules((prev) => {
      const updated = { ...prev };

      // remove previous teacher assignment if it exists
      if (prevTeacherId && updated[prevTeacherId]) {
        const key = `${dayIndex}-${timeSlot}`;
        if (updated[prevTeacherId][key]) {
          updated[prevTeacherId][key] = updated[prevTeacherId][key].filter(
            (id) => id !== routineId
          );
          if (updated[prevTeacherId][key].length === 0)
            delete updated[prevTeacherId][key];
          if (Object.keys(updated[prevTeacherId]).length === 0)
            delete updated[prevTeacherId];
        }
      }

      // add new assignment
      if (teacherId) {
        const key = `${dayIndex}-${timeSlot}`;
        if (!updated[teacherId]) updated[teacherId] = {};
        if (!updated[teacherId][key]) updated[teacherId][key] = [];
        if (!updated[teacherId][key].includes(routineId))
          updated[teacherId][key].push(routineId);
      }

      return updated;
    });
  };

  // ✅ Check teacher availability
  const isTeacherAvailable = (routineId, dayIndex, timeSlot, teacherId) => {
    if (!teacherSchedules[teacherId]) return true;
    const key = `${dayIndex}-${timeSlot}`;
    const assigned = teacherSchedules[teacherId][key] || [];
    return (
      assigned.length === 0 ||
      (assigned.length === 1 && assigned[0] === routineId)
    );
  };

  // ⚠️ Find conflicting routine for a teacher
  const getConflictingRoutine = (routineId, dayIndex, timeSlot, teacherId) => {
    if (!teacherSchedules[teacherId]) return null;
    const key = `${dayIndex}-${timeSlot}`;
    const assigned = teacherSchedules[teacherId][key] || [];
    const conflict = assigned.find((id) => id !== routineId);
    if (conflict) return routines.indexOf(conflict) + 1;
    return null;
  };

  return (
    <div className="routine-manager">
      <h1>Routine Manager</h1>
      <p>Use the tables below to add, view, edit, and delete routines.</p>

      <button className="add-routine-btn" onClick={handleAddRoutine}>
        Add New Routine
      </button>

      {routines.map((id, index) => (
        <div className="routine-block" key={id}>
          <div className="routine-header">
            <h2>Routine {index + 1}</h2>
            <button
              className="btn-delete-routine"
              onClick={() => handleDeleteRoutine(id)}
            >
              Delete
            </button>
          </div>

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