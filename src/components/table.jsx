// src/components/table.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './table.css';

// NEW: Import libraries for DOCX generation and file saving
import { Packer, Document, Table, TableRow, TableCell, Paragraph, WidthType, BorderStyle, AlignmentType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';

function RoutineTable() {
  // CHANGE 1: Initialize schedule with objects instead of strings
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

  // CHANGE 2: New state to cache teachers per subject
  const [teachersCache, setTeachersCache] = useState({});

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        const subjects = {};

        // Preload all subjects first
        querySnapshot.forEach(doc => {
          subjects[doc.id] = {
            name: doc.data().name || 'Unknown',
            // CHANGE 3: Don't preload teachers - we'll fetch on demand
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

  // CHANGE 4: New function to load teachers for a specific subject
  const loadTeachersForSubject = async (subjectCode) => {
    try {
      const teachersRef = collection(db, 'subjects', subjectCode, 'teachers');
      const snapshot = await getDocs(teachersRef);

      const teachers = {};
      snapshot.forEach(doc => {
        teachers[doc.id] = doc.data().name; // Store as { teacherId: teacherName }
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
    // CHANGE 5: Reset teacher selection when subject changes
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

    // CHANGE 6: Load teachers for this subject
    if (subjectCode) {
      loadTeachersForSubject(subjectCode);
    }

    setActiveCell({ dayIndex, timeIndex });
  };

  const handleTeacherSelect = (dayIndex, timeIndex, teacherId) => {
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
  };

  // NEW: Function to generate and download DOCX
  const handleDownload = () => {
    // Create a new DOCX document
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: 'Editable Weekly Schedule',
            heading: 'Heading1', // Title
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({}), // Empty line for spacing

          // Create the table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE }, // Full width
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              // Header row: Day + Time slots
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Day')] }),
                  ...timeHeaders.map(time => new TableCell({ children: [new Paragraph(time)] })),
                ],
              }),
              // Data rows: One for each day
              ...days.map((day, dayIndex) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(day)] }), // Day column
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

    // Generate the DOCX blob and download it
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, 'weekly_schedule.docx');
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

                  // CHANGE 7: Get cell data as object
                  const cellData = row.subjects[dayIndex];
                  const subjectCode = cellData.subjectCode;
                  const teacherId = cellData.teacherId;

                  // CHANGE 8: Get subject info
                  const subject = subjectCode ? subjectsMap[subjectCode] : null;

                  // CHANGE 9: Get teachers for this subject from cache
                  const subjectTeachers = subjectCode ? teachersCache[subjectCode] || {} : {};

                  const isActive = activeCell?.dayIndex === dayIndex && activeCell?.timeIndex === timeIndex;

                  return (
                    <td key={timeIndex} className="subject-cell">
                      {isActive ? (
                        <div className="tree-dropdown">
                          {/* Step 1: Subject */}
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

                          {/* Step 2: Teacher (only if subject selected) */}
                          {subjectCode && Object.keys(subjectTeachers).length > 0 && (
                            <select
                              value={teacherId}
                              onChange={(e) => handleTeacherSelect(dayIndex, timeIndex, e.target.value)}
                              className="teacher-select"
                            >
                              <option value="">-- Select Teacher --</option>
                              {Object.entries(subjectTeachers).map(([id, name]) => (
                                <option key={id} value={id}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Optional: Clear button */}
                          <button
                            type="button"
                            className="btn-clear"
                            onClick={() => clearSelection(dayIndex, timeIndex)}
                          >
                            ✕ Clear
                          </button>
                        </div>
                      ) : subjectCode ? (
                        // CHANGE 10: Display both subject and teacher name
                        <div
                          className="cell-display"
                          onClick={() => setActiveCell({ dayIndex, timeIndex })}
                        >
                          <div className="subject-name">[{subjectCode}] {subject?.name}</div>

                          {/* CHANGE 11: Show teacher name by resolving from cache */}
                          {teacherId && subjectCode && (
                            <div className="teacher-name">
                              {subjectTeachers[teacherId] || 'Teacher not found'}
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

      {/* NEW: Download button */}
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


