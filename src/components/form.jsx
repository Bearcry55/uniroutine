// src/components/form.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import './form.css';

function Form() {
  // State for the "Add Subject" form
  const [subjectData, setSubjectData] = useState({ code: '', name: '' });
  
  // State for the "Add Teacher" form
  const [teacherData, setTeacherData] = useState({ selectedSubject: '', teacherName: '' });

  // List of all subjects for the dropdown
  const [allSubjects, setAllSubjects] = useState([]);

  // General component state
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 🔁 Load all existing subjects on mount to populate the dropdown
  const loadSubjects = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = [];
      querySnapshot.forEach(doc => {
        subjectsList.push({
          id: doc.id,
          name: doc.data().name || 'Unnamed Subject'
        });
      });
      // Sort subjects alphabetically for the dropdown
      subjectsList.sort((a, b) => a.name.localeCompare(b.name));
      setAllSubjects(subjectsList);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setStatus('❌ Failed to load subjects for the dropdown.');
    }
  };
  
  useEffect(() => {
    loadSubjects();
  }, []);

  // Handler for the "Add Subject" form
  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    const { code, name } = subjectData;
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode || !trimmedName) {
      setStatus('⚠️ Subject Code and Name are required.');
      return;
    }
    if (trimmedCode.includes('/')) {
        setStatus("⚠️ Subject code cannot contain '/' character.");
        return;
    }

    setIsSaving(true);
    setStatus('');

    try {
      // We use setDoc here to control the ID (the subject code)
      const docRef = doc(db, 'subjects', trimmedCode);
      await setDoc(docRef, { name: trimmedName }, { merge: true }); // Use merge to avoid overwriting the teachers subcollection

      setStatus(`✅ Subject '${trimmedName}' saved/updated.`);
      setSubjectData({ code: '', name: '' }); // Clear form
      await loadSubjects(); // Refresh the dropdown list with the new subject
    } catch (error) {
      console.error('Error saving subject:', error);
      setStatus(`❌ Error saving subject: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for the "Add Teacher" form
  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    const { selectedSubject, teacherName } = teacherData;
    const trimmedTeacher = teacherName.trim();

    if (!selectedSubject) {
      setStatus('⚠️ Please select a subject first.');
      return;
    }
    if (!trimmedTeacher) {
      setStatus('⚠️ Please enter a teacher name.');
      return;
    }

    setIsSaving(true);
    setStatus('');

    try {
      // Get a reference to the 'teachers' subcollection inside the selected subject
      const teachersSubcollectionRef = collection(db, 'subjects', selectedSubject, 'teachers');

      // Use addDoc to create a new teacher with an auto-generated ID
      await addDoc(teachersSubcollectionRef, { name: trimmedTeacher });

      setStatus(`✅ Teacher '${trimmedTeacher}' added to subject '${selectedSubject}'.`);
      setTeacherData({ ...teacherData, teacherName: '' }); // Clear only the teacher name input
    } catch (error) {
      console.error('Error adding teacher:', error);
      setStatus(`❌ Error adding teacher: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="form-container">
      {/* ===== FORM 1: ADD/UPDATE SUBJECT ===== */}
      <div className="form-section">
        <h2>1. Add / Update a Subject</h2>
        <form onSubmit={handleSubjectSubmit}>
          <div className="form-group">
            <label htmlFor="codeInput">Subject Code</label>
            <input
              id="codeInput"
              type="text"
              value={subjectData.code}
              onChange={(e) => setSubjectData({ ...subjectData, code: e.target.value })}
              placeholder="e.g., CS101"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="nameInput">Subject Name</label>
            <input
              id="nameInput"
              type="text"
              value={subjectData.name}
              onChange={(e) => setSubjectData({ ...subjectData, name: e.target.value })}
              placeholder="e.g., Intro to Computer Science"
              required
            />
          </div>
          <button type="submit" className="btn-submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Subject'}
          </button>
        </form>
      </div>

      <hr className="form-divider" />

      {/* ===== FORM 2: ADD TEACHER TO SUBJECT ===== */}
      <div className="form-section">
        <h2>2. Add a Teacher to a Subject</h2>
        <form onSubmit={handleTeacherSubmit}>
          <div className="form-group">
            <label htmlFor="subjectSelect">Select Subject</label>
            <select
              id="subjectSelect"
              value={teacherData.selectedSubject}
              onChange={(e) => setTeacherData({ ...teacherData, selectedSubject: e.target.value })}
              required
            >
              <option value="">-- Choose a subject --</option>
              {allSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  [{subject.id}] {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="teacherInput">New Teacher Name</label>
            <input
              id="teacherInput"
              type="text"
              value={teacherData.teacherName}
              onChange={(e) => setTeacherData({ ...teacherData, teacherName: e.target.value })}
              placeholder="e.g., Prof. Ada Lovelace"
              required
            />
          </div>
          <button type="submit" className="btn-submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add Teacher'}
          </button>
        </form>
      </div>
      
      {/* ----- Universal Status Message Area ----- */}
      {status && (
        <div className={`status-message ${status.startsWith('✅') ? 'success' : 'error'}`}>
          <pre>{status}</pre>
        </div>
      )}
    </div>
  );
}

export default Form;