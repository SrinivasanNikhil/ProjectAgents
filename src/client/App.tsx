import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';

const Home: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <h1>AI-Powered Client Personas</h1>
      <nav>
        <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
      </nav>
      <div>
        {isAuthenticated ? (
          <div>
            <p>Welcome, {user?.firstName} {user?.lastName}</p>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <p>Please login or register.</p>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
