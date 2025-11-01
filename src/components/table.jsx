// src/components/table.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './table.css';

//  Import libraries for DOCX generation and file saving
import { Packer, Document, Table, TableRow, TableCell, Paragraph, WidthType, BorderStyle, AlignmentType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';

function RoutineTable({ 
  routineId = 1, 
  routineNumber = 1,
  updateTeacherSchedule = () => {}, 
  isTeacherAvailable = () => true,
  getConflictingRoutine = () => null 
}) {
  // Initialize schedule with objects instead of strings
  const [schedule, setSchedule] = useState([
    { time: '9:00 - 10:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
    { time: '10:00 - 11:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
    { time: '11:00 - 12:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
    { time: '12:00 - 1:00', isLunch: true, lunchText: 'Lunch Break' },
    { time: '1:00 - 2:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
    { time: '2:00 - 3:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
    { time: '3:00 - 4:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
    { time: '4:00 - 5:00', subjects: Array(5).fill({ subjectCode: '', teacherId: '' }) },
  ]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeHeaders = schedule.map(row => row.time);

  const [subjectsMap, setSubjectsMap] = useState({});
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState('');
  const [activeCell, setActiveCell] = useState(null);
  const [teachersCache, setTeachersCache] = useState({});
  
  // State to show user feedback when an assignment is blocked
  const [feedbackMessage, setFeedbackMessage] = useState(null);


  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        const subjects = {};

        querySnapshot.forEach(doc => {
          subjects[doc.id] = {
            name: doc.data().name || 'Unknown',
          };
        });

        setSubjectsMap(subjects);
      } catch (err) {
        setError('Failed to load subjects.');
        console.error('Subject loading error:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, []);

  const loadTeachersForSubject = async (subjectCode) => {
    try {
      const teachersRef = collection(db, 'subjects', subjectCode, 'teachers');
      const snapshot = await getDocs(teachersRef);

      const teachers = {};
      snapshot.forEach(doc => {
        teachers[doc.id] = doc.data().name;
      });

      setTeachersCache(prev => ({
        ...prev,
        [subjectCode]: teachers
      }));
    } catch (err) {
      console.error(`Error loading teachers for ${subjectCode}:`, err);
    }
  };

  const handleSubjectSelect = (dayIndex, timeIndex, subjectCode) => {
    // Get previous teacher ID before updating
    const prevTeacherId = schedule[timeIndex].subjects[dayIndex].teacherId;
    
    // If clearing subject, also clear teacher from global schedule
    if (!subjectCode && prevTeacherId) {
      updateTeacherSchedule(routineId, dayIndex, schedule[timeIndex].time, null, prevTeacherId);
    }
    
    setSchedule(prev =>
      prev.map((row, tIdx) =>
        tIdx === timeIndex && !row.isLunch
          ? {
              ...row,
              subjects: row.subjects.map((cell, dIdx) =>
                dIdx === dayIndex
                  ? { subjectCode, teacherId: '' }
                  : cell
              )
            }
          : row
      )
    );

    if (subjectCode) {
      loadTeachersForSubject(subjectCode);
    }

    setActiveCell({ dayIndex, timeIndex });
    setFeedbackMessage(null); // Clear any existing warning
  };

  const handleTeacherSelect = (dayIndex, timeIndex, teacherId) => {
    const timeSlot = schedule[timeIndex].time;
    const prevTeacherId = schedule[timeIndex].subjects[dayIndex].teacherId;
    const subjectData = schedule[timeIndex].subjects[dayIndex];
    const teacherName = teachersCache[subjectData.subjectCode]?.[teacherId] || 'Selected Teacher';

    // 1. STRICT BLOCKING CHECK: If teacherId is present AND they are not available, block assignment.
    if (teacherId && !isTeacherAvailable(routineId, dayIndex, timeSlot, teacherId)) {
      const conflictingRoutineNumber = getConflictingRoutine(routineId, dayIndex, timeSlot, teacherId);
      
      setFeedbackMessage({
        type: 'error',
        message: `🛑 Cannot assign ${teacherName}. They are already scheduled in Routine ${conflictingRoutineNumber} at this time.`
      });
      
      // Close the active cell editor immediately upon blocking
      setActiveCell(null);
      return; 
    } 
    
    // If teacherId is empty (clearing teacher), or if available (no conflict):
    
    // Clear any previous feedback/warnings
    setFeedbackMessage(null); 

    // Update global teacher schedule
    updateTeacherSchedule(routineId, dayIndex, timeSlot, teacherId, prevTeacherId);
    
    // Update local schedule state
    setSchedule(prev =>
      prev.map((row, tIdx) =>
        tIdx === timeIndex && !row.isLunch
          ? {
              ...row,
              subjects: row.subjects.map((cell, dIdx) =>
                dIdx === dayIndex
                  ? { ...cell, teacherId }
                  : cell
              )
            }
          : row
      )
    );

    setActiveCell(null);
  };

  const clearSelection = (dayIndex, timeIndex) => {
    const prevTeacherId = schedule[timeIndex].subjects[dayIndex].teacherId;
    const timeSlot = schedule[timeIndex].time;
    
    // Clear from global schedule
    if (prevTeacherId) {
      updateTeacherSchedule(routineId, dayIndex, timeSlot, null, prevTeacherId);
    }
    
    setSchedule(prev =>
      prev.map((row, tIdx) =>
        tIdx === timeIndex && !row.isLunch
          ? {
              ...row,
              subjects: row.subjects.map((cell, dIdx) =>
                dIdx === dayIndex
                  ? { subjectCode: '', teacherId: '' }
                  : cell
              )
            }
          : row
      )
    );
    setActiveCell(null);
    setFeedbackMessage(null);
  };

  const handleDownload = () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: `Editable Weekly Schedule - Routine ${routineNumber}`,
            heading: 'Heading1',
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({}),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Day')] }),
                  ...timeHeaders.map(time => new TableCell({ children: [new Paragraph(time)] })),
                ],
              }),
              ...days.map((day, dayIndex) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(day)] }),
                  ...schedule.map((row, timeIndex) => {
                    if (row.isLunch) {
                      return new TableCell({
                        children: [new Paragraph(row.lunchText)],
                        verticalAlign: VerticalAlign.CENTER,
                      });
                    }

                    const cellData = row.subjects[dayIndex];
                    const subjectCode = cellData.subjectCode;
                    const teacherId = cellData.teacherId;
                    const subject = subjectCode ? subjectsMap[subjectCode] : null;
                    const subjectTeachers = subjectCode ? teachersCache[subjectCode] || {} : {};

                    const cellText = subjectCode
                      ? `[${subjectCode}] ${subject?.name || 'Unknown'}\n${teacherId ? (subjectTeachers[teacherId] || 'Teacher not found') : ''}`
                      : 'No Subject';

                    return new TableCell({
                      children: [new Paragraph(cellText)],
                      verticalAlign: VerticalAlign.CENTER,
                    });
                  }),
                ],
              })),
            ],
          }),
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `weekly_schedule_routine_${routineNumber}.docx`);
    }).catch(err => {
      console.error('Error generating DOCX:', err);
      alert('Failed to generate DOCX. Please try again.');
    });
  };

  if (loadingSubjects) {
    return (
      <div className="table-container">
        <h2 className="table-title">Editable Weekly Schedule</h2>
        <p className="loading">Loading subjects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-container">
        <h2 className="table-title">Editable Weekly Schedule</h2>
        <div className="error-box">
          <p className="error-message">{error}</p>
          <button className="btn-retry" onClick={() => window.location.reload()}>
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <h2 className="table-title">Editable Weekly Schedule</h2>
      
      {/* Show feedback message (Error/Warning when selecting teacher) */}
      {feedbackMessage && (
        <div className={`conflict-warning ${feedbackMessage.type === 'error' ? 'feedback-error' : ''}`}>
          {feedbackMessage.message}
        </div>
      )}

      <div className="table-wrapper">
        <table className="routine-table">
          <thead>
            <tr>
              <th className="day-column">Day</th>
              {timeHeaders.map((time, idx) => (
                <th key={idx} className={schedule[idx].isLunch ? 'lunch-header' : ''}>
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dayIndex) => (
              <tr key={dayIndex}>
                <td className="day-cell">{day}</td>
                {schedule.map((row, timeIndex) => {
                  if (row.isLunch) {
                    return (
                      <td key={timeIndex} className="lunch-cell">
                        <div className="lunch-text">{row.lunchText}</div>
                      </td>
                    );
                  }

                  const cellData = row.subjects[dayIndex];
                  const subjectCode = cellData.subjectCode;
                  const teacherId = cellData.teacherId;
                  const subject = subjectCode ? subjectsMap[subjectCode] : null;
                  const subjectTeachers = subjectCode ? teachersCache[subjectCode] || {} : {};
                  const isActive = activeCell?.dayIndex === dayIndex && activeCell?.timeIndex === timeIndex;
                  
                  // Check if this cell currently displays a conflict
                  const hasConflict = teacherId && !isTeacherAvailable(routineId, dayIndex, row.time, teacherId);

                  return (
                    <td 
                      key={timeIndex} 
                      className={`subject-cell ${hasConflict ? 'has-conflict' : ''}`}
                    >
                      {isActive ? (
                        <div className="tree-dropdown">
                          <select
                            value={subjectCode}
                            onChange={(e) => handleSubjectSelect(dayIndex, timeIndex, e.target.value)}
                            className="subject-select"
                            autoFocus
                          >
                            <option value="">-- Select Subject --</option>
                            {Object.entries(subjectsMap).map(([code, data]) => (
                              <option key={code} value={code}>
                                [{code}] {data.name}
                              </option>
                            ))}
                          </select>

                          {subjectCode && Object.keys(subjectTeachers).length > 0 && (
                            <select
                              value={teacherId}
                              onChange={(e) => handleTeacherSelect(dayIndex, timeIndex, e.target.value)}
                              className="teacher-select"
                            >
                              <option value="">-- Select Teacher --</option>
                              {Object.entries(subjectTeachers).map(([id, name]) => {
                                const isUnavailable = !isTeacherAvailable(routineId, dayIndex, row.time, id);
                                const conflictRoutine = isUnavailable ? getConflictingRoutine(routineId, dayIndex, row.time, id) : null;
                                
                                return (
                                  <option 
                                    key={id} 
                                    value={id}
                                    className={isUnavailable ? 'teacher-unavailable' : ''}
                                  >
                                    {name} {isUnavailable ? `(⚠️ Routine ${conflictRoutine})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          )}

                          <button
                            type="button"
                            className="btn-clear"
                            onClick={() => clearSelection(dayIndex, timeIndex)}
                          >
                            ✕ Clear
                          </button>
                        </div>
                      ) : subjectCode ? (
                        <div
                          className={`cell-display ${hasConflict ? 'conflict-cell' : ''}`}
                          onClick={() => setActiveCell({ dayIndex, timeIndex })}
                        >
                          <div className="subject-name">[{subjectCode}] {subject?.name}</div>
                          {teacherId && subjectCode && (
                            <div className="teacher-name">
                              {subjectTeachers[teacherId] || 'Teacher not found'}
                              {hasConflict && (
                                <span className="conflict-indicator"> ⚠️</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="cell-placeholder"
                          onClick={() => setActiveCell({ dayIndex, timeIndex })}
                        >
                          + Add Subject
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleDownload}
        className="btn-download"
      >
        Download as DOCX
      </button>
    </div>
  );
}

export default RoutineTable;