// src/components/RoutineManager.jsx
import React, { useState } from "react";
import RoutineTable from "./table";
import "./RoutineManager.css";

function RoutineManager() {
  // Start with one routine
  const [routines, setRoutines] = useState([1]);

  // Track all teacher assignments across routines
  // Format: { teacherId: { "dayIndex-timeSlot": [routineIds] } }
  const [teacherSchedules, setTeacherSchedules] = useState({});

  // ➕ Add a new routine
  const handleAddRoutine = () => {
    setRoutines((prev) => [...prev, prev.length + 1]);
  };

  // 🗑️ Delete a routine and clean its assignments
  const handleDeleteRoutine = (routineId) => {
    if (!window.confirm("Are you sure you want to delete this routine?")) return;

    // Remove from list
    setRoutines((prev) => prev.filter((id) => id !== routineId));

    // Clean teacherSchedules of this routine
    setTeacherSchedules((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((teacherId) => {
        Object.keys(updated[teacherId]).forEach((key) => {
          updated[teacherId][key] = updated[teacherId][key].filter(
            (id) => id !== routineId
          );
          if (updated[teacherId][key].length === 0) {
            delete updated[teacherId][key];
          }
        });
        if (Object.keys(updated[teacherId]).length === 0) {
          delete updated[teacherId];
        }
      });

      return updated;
    });
  };

  // 🔄 Update teacher schedule when a teacher is assigned or removed
  const updateTeacherSchedule = (
    routineId,
    dayIndex,
    timeSlot,
    teacherId,
    prevTeacherId = null
  ) => {
    setTeacherSchedules((prev) => {
      const updated = { ...prev };

      // Remove previous teacher assignment if exists
      if (prevTeacherId && updated[prevTeacherId]) {
        const key = `${dayIndex}-${timeSlot}`;
        if (updated[prevTeacherId][key]) {
          updated[prevTeacherId][key] = updated[prevTeacherId][key].filter(
            (id) => id !== routineId
          );
          if (updated[prevTeacherId][key].length === 0) {
            delete updated[prevTeacherId][key];
          }
          if (Object.keys(updated[prevTeacherId]).length === 0) {
            delete updated[prevTeacherId];
          }
        }
      }

      // Add new teacher assignment
      if (teacherId) {
        const key = `${dayIndex}-${timeSlot}`;
        if (!updated[teacherId]) updated[teacherId] = {};
        if (!updated[teacherId][key]) updated[teacherId][key] = [];
        if (!updated[teacherId][key].includes(routineId)) {
          updated[teacherId][key].push(routineId);
        }
      }

      return updated;
    });
  };

  // ✅ Check if a teacher is available for a given slot
  const isTeacherAvailable = (routineId, dayIndex, timeSlot, teacherId) => {
    if (!teacherSchedules[teacherId]) return true;
    const key = `${dayIndex}-${timeSlot}`;
    const list = teacherSchedules[teacherId][key] || [];
    return (
      list.length === 0 || (list.length === 1 && list[0] === routineId)
    );
  };

  // ⚠️ Identify if another routine conflicts with this teacher/time
  const getConflictingRoutine = (routineId, dayIndex, timeSlot, teacherId) => {
    if (!teacherSchedules[teacherId]) return null;
    const key = `${dayIndex}-${timeSlot}`;
    const list = teacherSchedules[teacherId][key] || [];
    const conflict = list.find((id) => id !== routineId);
    if (conflict) return routines.indexOf(conflict) + 1;
    return null;
  };

  // Render
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