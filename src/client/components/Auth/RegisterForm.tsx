import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../hooks/useAuth';

const RegisterForm: React.FC = () => {
  const { register, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const ok = await register({ email, password, firstName, lastName, role, department: department || undefined, studentId: studentId || undefined, instructorId: instructorId || undefined });
    setMessage(ok ? 'Registration successful' : null);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="register-form">
      <h2>Register</h2>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="role">Role</label>
        <select id="role" value={role} onChange={e => setRole(e.target.value as UserRole)}>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="administrator">Administrator</option>
        </select>
      </div>
      <div>
        <label htmlFor="department">Department</label>
        <input id="department" value={department} onChange={e => setDepartment(e.target.value)} />
      </div>
      <div>
        <label htmlFor="studentId">Student ID</label>
        <input id="studentId" value={studentId} onChange={e => setStudentId(e.target.value)} />
      </div>
      <div>
        <label htmlFor="instructorId">Instructor ID</label>
        <input id="instructorId" value={instructorId} onChange={e => setInstructorId(e.target.value)} />
      </div>
      {error && <div role="alert">{error}</div>}
      {message && <div role="status">{message}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;