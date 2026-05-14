import React, { useEffect, useState } from 'react';

const initialEnrollments = [
  {
    id: 1,
    studentName: 'Alicia Carter',
    courseName: 'Software Engineering',
    status: 'Pending',
    updatedAt: '2026-05-01 09:30',
  },
  {
    id: 2,
    studentName: 'Brandon Lee',
    courseName: 'Data Analytics',
    status: 'Approved',
    updatedAt: '2026-05-02 14:15',
  },
  {
    id: 3,
    studentName: 'Cassie Patel',
    courseName: 'Cybersecurity',
    status: 'Waitlisted',
    updatedAt: '2026-05-03 11:00',
  },
];

function Enrollment() {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);
  const [statusInput, setStatusInput] = useState('Pending');
  const [newStudentName, setNewStudentName] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedEnrollmentId) {
      setStatusInput('Pending');
      return;
    }

    const selectedEnrollment = enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId);
    if (selectedEnrollment) {
      setStatusInput(selectedEnrollment.status);
    }
  }, [selectedEnrollmentId, enrollments]);

  const handleSelectEnrollment = (id) => {
    setSelectedEnrollmentId(id);
    setMessage('');
  };

  const updateEnrollmentStatus = () => {
    if (!selectedEnrollmentId) {
      setMessage('Select an enrollment to update.');
      return;
    }

    setEnrollments((current) =>
      current.map((enrollment) => {
        if (enrollment.id !== selectedEnrollmentId) return enrollment;
        return {
          ...enrollment,
          status: statusInput,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    setMessage('Enrollment status updated successfully.');
  };

  const addEnrollment = () => {
    if (!newStudentName.trim() || !newCourseName.trim()) {
      setMessage('Provide both student and course names.');
      return;
    }

    const nextId = enrollments.length ? Math.max(...enrollments.map((item) => item.id)) + 1 : 1;
    const newEnrollment = {
      id: nextId,
      studentName: newStudentName.trim(),
      courseName: newCourseName.trim(),
      status: 'Pending',
      updatedAt: new Date().toLocaleString(),
    };

    setEnrollments((current) => [...current, newEnrollment]);
    setNewStudentName('');
    setNewCourseName('');
    setMessage('New enrollment tracked successfully.');
  };

  const selectedEnrollment = enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId);

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Enrollment Management</h1>
      <p>Track enrollment updates, review student requests, and manage status changes.</p>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <section style={{ flex: 1, minWidth: '320px' }}>
          <h2>Current Enrollments</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '8px' }}>Student</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '8px' }}>Course</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '8px' }}>Status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '8px' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr
                  key={enrollment.id}
                  onClick={() => handleSelectEnrollment(enrollment.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: enrollment.id === selectedEnrollmentId ? '#f0f8ff' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{enrollment.studentName}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{enrollment.courseName}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{enrollment.status}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{enrollment.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ flex: 1, minWidth: '320px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2>Update Enrollment</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Selected Student</label>
              <input
                type="text"
                readOnly
                value={selectedEnrollment ? selectedEnrollment.studentName : ''}
                placeholder="Select an enrollment"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Status</label>
              <select
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Waitlisted">Waitlisted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <button
              type="button"
              onClick={updateEnrollmentStatus}
              style={{ padding: '10px 18px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
            >
              Save Update
            </button>
          </div>

          <div>
            <h2>Add Enrollment</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Student Name</label>
              <input
                type="text"
                value={newStudentName}
                onChange={(event) => setNewStudentName(event.target.value)}
                placeholder="Enter student name"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Course Name</label>
              <input
                type="text"
                value={newCourseName}
                onChange={(event) => setNewCourseName(event.target.value)}
                placeholder="Enter course name"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <button
              type="button"
              onClick={addEnrollment}
              style={{ padding: '10px 18px', border: 'none', background: '#28a745', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
            >
              Track Enrollment
            </button>
          </div>
        </section>
      </div>

      {message && (
        <div style={{ marginTop: '24px', color: '#155724', background: '#d4edda', border: '1px solid #c3e6cb', padding: '12px', borderRadius: '4px' }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Enrollment;
