import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Checking authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: window.location.pathname + window.location.search }} />;
  }

  if (role && user.role?.toLowerCase().trim() !== role.toLowerCase().trim()) {
    const r = user.role?.toLowerCase().trim();
    if (r === 'admin') return <Navigate to="/admin/dashboard" />;
    if (r === 'chair') return <Navigate to="/chair/dashboard" />;
    if (r === 'reviewer') return <Navigate to="/reviewer/dashboard" />;
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
