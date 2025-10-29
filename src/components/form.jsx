// src/components/form.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import * as ExcelJS from 'exceljs';
import './form.css';

function Form() {
  // State for the "Add Subject" form
  const [subjectData, setSubjectData] = useState({ code: '', name: '' });
  
  // State for the "Add Teacher" form
  const [teacherData, setTeacherData] = useState({ selectedSubject: '', teacherName: '' });

  // List of all subjects for the dropdown
  const [allSubjects, setAllSubjects] = useState([]);

  // Excel import state
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [importStatus, setImportStatus] = useState([]);

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

  // Handler for Excel file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Validate file type
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
        setStatus('⚠️ Please select a valid Excel file (.xlsx format)');
        setExcelFile(null);
        e.target.value = null;
        return;
      }
      
      setExcelFile(file);
      setStatus('');
      setImportStatus([]);
    }
  };

  // Handler for reading and previewing Excel data using ExcelJS
  const handleFileRead = async () => {
    if (!excelFile) {
      setStatus('⚠️ Please select an Excel file first');
      return;
    }

    try {
      setStatus('Reading file...');
      
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      
      if (!worksheet) {
        setStatus('⚠️ No worksheet found in the Excel file');
        return;
      }
      
      const processedData = [];
      const errors = [];
      
      // Get headers from the first row
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value ? cell.value.toString().toLowerCase().trim() : '';
      });
      
      // Find column indices for our required fields
      const codeIndex = headers.findIndex(h => 
        h.includes('code') || h.includes('subject code') || h === 'subjectcode'
      ) + 1;
      const nameIndex = headers.findIndex(h => 
        h.includes('subject name') || h === 'subjectname' || (h.includes('name') && !h.includes('teacher'))
      ) + 1;
      const teacherIndex = headers.findIndex(h => 
        h.includes('teacher') || h.includes('instructor') || h.includes('faculty')
      ) + 1;
      
      if (codeIndex === 0 || nameIndex === 0) {
        setStatus('⚠️ Excel file must have "Subject Code" and "Subject Name" columns');
        return;
      }
      
      // Process data rows (starting from row 2)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const subjectCode = row.getCell(codeIndex).value;
        const subjectName = row.getCell(nameIndex).value;
        const teacherName = teacherIndex > 0 ? row.getCell(teacherIndex).value : '';
        
        // Convert to string and trim
        const trimmedCode = subjectCode ? subjectCode.toString().trim() : '';
        const trimmedName = subjectName ? subjectName.toString().trim() : '';
        const trimmedTeacher = teacherName ? teacherName.toString().trim() : '';
        
        // Skip empty rows
        if (!trimmedCode && !trimmedName && !trimmedTeacher) {
          return;
        }
        
        // Validate row
        if (!trimmedCode || !trimmedName) {
          errors.push(`Row ${rowNumber}: Missing subject code or name`);
          return;
        }
        
        if (trimmedCode.includes('/')) {
          errors.push(`Row ${rowNumber}: Subject code cannot contain '/' character`);
          return;
        }
        
        processedData.push({
          code: trimmedCode,
          name: trimmedName,
          teacher: trimmedTeacher,
          rowNumber: rowNumber
        });
      });
      
      if (errors.length > 0) {
        setStatus('⚠️ Validation errors:\n' + errors.join('\n'));
        return;
      }
      
      if (processedData.length === 0) {
        setStatus('⚠️ No valid data found in the Excel file');
        return;
      }
      
      setExcelData(processedData);
      setStatus(`✅ Found ${processedData.length} valid rows. Click "Import Data" to proceed.`);
      
    } catch (error) {
      console.error('Error reading file:', error);
      setStatus(`❌ Error reading file: ${error.message}`);
    }
  };

  // Handler for importing data to Firebase
  const handleImportData = async () => {
    if (excelData.length === 0) {
      setStatus('⚠️ No data to import. Please read the file first.');
      return;
    }

    setIsSaving(true);
    setStatus('Importing data...');
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of excelData) {
        try {
          // Save/Update subject
          const subjectRef = doc(db, 'subjects', row.code);
          await setDoc(subjectRef, { name: row.name }, { merge: true });
          
          // If teacher name exists, add teacher to the subject
          if (row.teacher) {
            const teachersSubcollectionRef = collection(db, 'subjects', row.code, 'teachers');
            await addDoc(teachersSubcollectionRef, { name: row.teacher });
            results.push(`✅ Row ${row.rowNumber}: Subject '${row.code}' and teacher '${row.teacher}' imported`);
          } else {
            results.push(`✅ Row ${row.rowNumber}: Subject '${row.code}' imported (no teacher)`);
          }
          successCount++;
          
        } catch (error) {
          results.push(`❌ Row ${row.rowNumber}: Failed - ${error.message}`);
          errorCount++;
        }
      }
      
      setImportStatus(results);
      setStatus(`Import complete: ${successCount} successful, ${errorCount} failed`);
      
      // Clear the file input and data
      setExcelFile(null);
      setExcelData([]);
      
      // Reload subjects for the dropdown
      await loadSubjects();
      
      // Clear file input
      const fileInput = document.getElementById('excelFileInput');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error during import:', error);
      setStatus(`❌ Import failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to download sample Excel template
  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subjects');
    
    // Add headers
    worksheet.columns = [
      { header: 'Subject Code', key: 'code', width: 15 },
      { header: 'Subject Name', key: 'name', width: 30 },
      { header: 'Teacher', key: 'teacher', width: 25 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add sample data
    worksheet.addRows([
      { code: 'CS101', name: 'Introduction to Programming', teacher: 'Dr. Smith' },
      { code: 'MATH201', name: 'Calculus II', teacher: 'Prof. Johnson' },
      { code: 'PHY301', name: 'Quantum Physics', teacher: 'Dr. Brown' }
    ]);
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subjects_template.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
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

      <hr className="form-divider" />

      {/* ===== FORM 3: IMPORT FROM EXCEL ===== */}
      <div className="form-section">
        <h2>3. Import from Excel</h2>
        <div className="excel-import-info">
          <p>📋 Excel format required:</p>
          <ul>
            <li>Column 1: Subject Code</li>
            <li>Column 2: Subject Name</li>
            <li>Column 3: Teacher (optional)</li>
          </ul>
          <button 
            type="button" 
            className="btn-download-template"
            onClick={downloadTemplate}
          >
            📥 Download Sample Template
          </button>
        </div>
        
        <div className="form-group">
          <label htmlFor="excelFileInput">Select Excel File (.xlsx)</label>
          <input
            id="excelFileInput"
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={isSaving}
          />
        </div>
        
        <div className="excel-buttons">
          <button 
            type="button" 
            className="btn-preview" 
            onClick={handleFileRead}
            disabled={!excelFile || isSaving}
          >
            📖 Read File
          </button>
          
          <button 
            type="button" 
            className="btn-import" 
            onClick={handleImportData}
            disabled={excelData.length === 0 || isSaving}
          >
            {isSaving ? 'Importing...' : '📥 Import Data'}
          </button>
        </div>
        
        {/* Import Results */}
        {importStatus.length > 0 && (
          <div className="import-results">
            <h4>Import Results:</h4>
            <ul>
              {importStatus.map((result, index) => (
                <li key={index} className={result.startsWith('✅') ? 'success-item' : 'error-item'}>
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* ----- Universal Status Message Area ----- */}
      {status && (
        <div className={`status-message ${status.startsWith('✅') ? 'success' : status.startsWith('⚠️') ? 'warning' : 'error'}`}>
          <pre>{status}</pre>
        </div>
      )}
    </div>
  );
}

export default Form;