import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';
import { Monitor, X } from 'lucide-react';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ChairDashboard = lazy(() => import('./pages/ChairDashboard'));
const ReviewerDashboard = lazy(() => import('./pages/ReviewerDashboard'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));

const MobileWarning = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && !sessionStorage.getItem('mobileWarningShown')) {
      setShow(true);
      sessionStorage.setItem('mobileWarningShown', 'true');
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Monitor size={36} />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Desktop Recommended</h2>
        <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
          Use desktop for better experience.
        </p>
        <button
          onClick={() => setShow(false)}
          className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );
};

const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/dashboard') || 
                     location.pathname.startsWith('/admin/dashboard') ||
                     location.pathname.startsWith('/chair/dashboard') ||
                     location.pathname.startsWith('/reviewer/dashboard');
  const hideFooter = hideNavbar || location.pathname === '/register' || location.pathname === '/login' || location.pathname === '/admin/login';

  return (
    <div className="min-h-screen flex flex-col">
      <MobileWarning />
      {!hideNavbar && <Navbar />}
      <main className="flex-1 relative">
        <Suspense fallback={<div className="flex justify-center items-center h-[60vh] text-2xl font-bold text-primary">Loading CIETM...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Author Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="author">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Chair / Editor Routes */}
            <Route
              path="/chair/dashboard"
              element={
                <ProtectedRoute role="chair">
                  <ChairDashboard />
                </ProtectedRoute>
              }
            />

            {/* Reviewer Routes */}
            <Route
              path="/reviewer/dashboard"
              element={
                <ProtectedRoute role="reviewer">
                  <ReviewerDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {!hideFooter && <Footer />}
      <Toaster position="bottom-right" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
