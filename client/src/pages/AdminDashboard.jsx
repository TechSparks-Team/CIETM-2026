import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Users, FileCheck, Clock, CheckCircle,
  XCircle, Search, Filter, ExternalLink, Home,
  LayoutDashboard, Download, PieChart, BarChart2,
  Settings, Bell, Mail, Shield, ChevronRight,
  TrendingUp, IndianRupee, AlertCircle, CreditCard, Trash2, UserPlus, LogOut
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import toast from 'react-hot-toast';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShieldCheck, QrCode, ScanLine, Menu, X, CheckSquare, Square } from 'lucide-react';
import { CONFERENCE_TRACKS, CATEGORY_AMOUNTS } from '../constants/conferenceData';

const QRScanner = ({ onScan }) => {
  useEffect(() => {
    let scanner = null;

    // Slight delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner("reader", {
          fps: 10,
          qrbox: 250,
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          supportedScanTypes: [0]
        });

        scanner.render(
          (decodedText) => {
            onScan(decodedText);
          },
          (err) => { /* ignore per-frame errors */ }
        );
      } catch (e) {
        console.error("Scanner Init Error:", e);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(err => console.error("Scanner Clear Error:", err));
      }
    };
  }, [onScan]);

  return (
    <div className="w-full space-y-4">
      <div
        id="reader"
        className="qr-scanner-container w-full max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-slate-200 bg-black/5 min-h-[300px]"
      ></div>

      <style>{`
        #reader { border: none !important; }
        #reader__dashboard_section_csr button {
          background-color: #6366f1 !important;
          color: white !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          letter-spacing: 0.1em !important;
          border: none !important;
          cursor: pointer !important;
          margin: 10px 0 !important;
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2) !important;
        }
        #reader video {
          border-radius: 20px !important;
          object-fit: cover !important;
        }
        #reader__status_span { font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; }
      `}</style>

      <div className="px-6 py-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
        <p className="text-[10px] font-bold text-indigo-700 leading-relaxed text-center">
          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse mr-2"></span>
          Press <strong>"Start Scanning"</strong> above to activate the live feed.
        </p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, submissions, analytics, settings
  const [registrations, setRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedReg, setSelectedReg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info' });
  const [newAuthor, setNewAuthor] = useState({ name: '', email: '', phone: '', password: '', role: 'author' });
  const [isCreatingAuthor, setIsCreatingAuthor] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(true);
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [reviewers, setReviewers] = useState([]);
  const [assigningReviewer, setAssigningReviewer] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackTargetUser, setTrackTargetUser] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [userFilter, setUserFilter] = useState('All');


  const categoryAmounts = {
    'UG/PG STUDENTS': 500,
    'FACULTY/RESEARCH SCHOLARS': 750,
    'EXTERNAL / ONLINE PRESENTATION': 300,
    'INDUSTRY PERSONNEL': 900
  };

  const calculateRequiredFee = (reg) => {
    if (!reg) return 0;
    let total = CATEGORY_AMOUNTS[reg.personalDetails?.category] || 1000;
    if (reg.teamMembers && reg.teamMembers.length > 0) {
      reg.teamMembers.forEach(member => {
        total += CATEGORY_AMOUNTS[member.category] || 1000;
      });
    }
    return total;
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const [regRes, anaRes, setRes, userRes] = await Promise.all([
        axios.get('/api/registrations', config),
        axios.get('/api/registrations/analytics', config),
        axios.get('/api/settings', config),
        axios.get('/api/auth/users', config)
      ]);
      setRegistrations(regRes.data);
      setAnalytics(anaRes.data);
      setSettings(setRes.data);
      setUsers(userRes.data);
      
      // Filter reviewers
      setReviewers(userRes.data.filter(u => u.role === 'reviewer'));
    } catch (error) {
      toast.error("Failed to sync dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerifyQR = useCallback(async (decodedText) => {
    if (isVerifying) return;
    setIsVerifying(true);
    const loadingToast = toast.loading("Verifying Identity...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get(`/api/registrations/verify/${decodedText}`, config);
      setScannedResult(data);
      toast.success("Identity Verified & Attendance Logged", { id: loadingToast });
      fetchAllData();
    } catch (error) {
      const message = error.response?.data?.message || "Invalid QR Code";
      toast.error(message, { id: loadingToast });

      // Still show the card if it's just a draft status block so the admin can see details
      if (error.response?.data?.status === 'Draft') {
        setScannedResult(error.response.data);
      } else {
        setScannedResult(null);
      }
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, user?.token]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put('/api/settings', settings, config);
      toast.success("System settings updated successfully");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcast.title || !broadcast.message) return toast.error("Please fill all fields");

    const loadingToast = toast.loading("Broadcasting notification...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.post('/api/settings/broadcast', broadcast, config);
      toast.success(`Broadcasting complete`, { id: loadingToast });
      setBroadcast({ title: '', message: '', type: 'info' });
    } catch (error) {
      toast.error("Broadcast failed", { id: loadingToast });
    }
  };

  const handleCreateAuthor = async (e) => {
    e.preventDefault();
    if (!newAuthor.name || !newAuthor.email || !newAuthor.password) {
      return toast.error("Please fill in all required fields (Name, Email, Password)");
    }

    setIsCreatingAuthor(true);
    const loadingToast = toast.loading("Creating new author account...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.post('/api/auth/admin/create-user', newAuthor, config);

      toast.success("Account created successfully!", { id: loadingToast });
      setNewAuthor({ name: '', email: '', phone: '', password: '', role: 'author' });
      setIsCreateModalOpen(false); // Close the modal on success
      // Refresh the users list
      const usersRes = await axios.get('/api/auth/users', config);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create author", { id: loadingToast });
    } finally {
      setIsCreatingAuthor(false);
    }
  };

  const exportToExcel = async () => {
    const loadingToast = toast.loading("Preparing Excel workbook...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get('/api/settings/export', config);

      // Create a worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Create a workbook and add the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registrations");

      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `CIETM_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success("Excel file downloaded successfully", { id: loadingToast });
    } catch (error) {
      toast.error("Excel export failed", { id: loadingToast });
    }
  };

  const handleManualPaymentConfirm = async (reg) => {
    if (!manualPaymentAmount || isNaN(manualPaymentAmount) || Number(manualPaymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const loadingToast = toast.loading("Processing Manual Payment...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.put(`/api/registrations/${reg._id}/status`, {
        paymentStatus: 'Completed',
        amount: Number(manualPaymentAmount),
        transactionId: `MANUAL_CASH_${new Date().getTime()}`,
        attended: true
      }, config);

      setRegistrations(registrations.map(r => r._id === reg._id ? data : r));
      if (selectedReg?._id === reg._id) setSelectedReg(data);
      if (scannedResult?._id === reg._id) setScannedResult(data);
      toast.success("Payment confirmed and attendance logged!", { id: loadingToast });
      setManualPaymentAmount('');
      fetchAllData();
    } catch (error) {
      toast.error("Failed to process manual payment", { id: loadingToast });
    }
  };

  const handleCleanupDatabase = async () => {
    const confirmation = prompt('Are you absolutely sure you want to PURGE the database? This action is IRREVERSIBLE. Type "CONFIRM" to proceed.');
    if (confirmation !== 'CONFIRM') return toast.error("Database purge cancelled.");

    const loadingToast = toast.loading("Purging database (keeping admins)...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.delete('/api/settings/cleanup/database', config);
      toast.success("Database purged successfully", { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error("Database purge failed", { id: loadingToast });
    }
  };

  const handleCleanupCloudinary = async () => {
    const confirmation = prompt('Are you absolutely sure you want to PURGE all Cloudinary files? This action is IRREVERSIBLE. Type "CONFIRM" to proceed.');
    if (confirmation !== 'CONFIRM') return toast.error("Cloudinary purge cancelled.");

    const loadingToast = toast.loading("Purging Cloudinary files...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const res = await axios.delete('/api/settings/cleanup/cloudinary', config);
      toast.success(res.data.message || "Cloudinary purged successfully", { id: loadingToast });
    } catch (error) {
      toast.error("Cloudinary purge failed", { id: loadingToast });
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    if (userId === user._id) return toast.error("You cannot change your own role.");
    
    const loadingToast = toast.loading(`Updating member access to ${newRole}...`);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put(`/api/auth/users/${userId}/role`, { role: newRole }, config);
      toast.success('Institutional permissions updated!', { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update account credentials', { id: loadingToast });
    }
  };

  const handleUpdateReviewerTracks = async (reviewerId, tracks) => {
    try {
      await axios.put(`/api/auth/users/${reviewerId}/tracks`, { tracks }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success("Reviewer expertise updated");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to update reviewer tracks");
    }
  };

  const handleAssignReviewer = async (regId, reviewerId) => {
    setAssigningReviewer(true);
    const loadingToast = toast.loading("Assigning reviewer...");
    try {
      await axios.put(`/api/registrations/${regId}/assign`, { reviewerId }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success("Reviewer assigned successfully", { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to assign reviewer", { id: loadingToast });
    } finally {
      setAssigningReviewer(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!window.confirm("This will force-assign any remaining unassigned papers to available reviewers, even if tracks don't match. Continue?")) return;
    
    setAutoAssigning(true);
    const loadingToast = toast.loading("Syncing assignments...");
    try {
      const { data } = await axios.post('/api/registrations/auto-assign', {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(data.message, { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Auto-assignment failed", { id: loadingToast });
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleReview = async (id, status) => {
    const remarks = status === 'Rejected' ? prompt("Enter rejection reason:") : prompt("Enter remarks (optional):");
    if (status === 'Rejected' && remarks === null) return;

    try {
      await axios.put(`/api/registrations/${id}/review`, { status, remarks }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(`Paper ${status} successfully`);
      fetchAllData();
      if (selectedReg && selectedReg._id === id) {
        setSelectedReg(null);
      }
    } catch (error) {
      toast.error("Review action failed");
    }
  };

  const handleToggleAttendance = async (reg) => {
    const newStatus = !reg.attended;
    try {
      await axios.put(`/api/registrations/${reg._id}/status`, { attended: newStatus }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(`Participant marked as ${newStatus ? 'Present' : 'Absent'}`);
      fetchAllData();
      if (selectedReg && selectedReg._id === reg._id) {
        setSelectedReg(prev => ({ ...prev, attended: newStatus, attendedAt: newStatus ? Date.now() : null }));
      }
    } catch (error) {
      toast.error("Failed to update attendance");
    }
  };

  const handleReuploadAction = async (id, action) => {
    const loadingToast = toast.loading(`${action}ing re-upload request...`);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.post(`/api/registrations/${id}/handle-reupload-request`, { action }, config);
      toast.success(`Request ${action.toLowerCase()}d successfully`, { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()} request`, { id: loadingToast });
    }
  };

  const filteredData = useMemo(() => {
    return registrations.filter(reg => {
      // Only show submissions from users who are still authors
      // (Hide registrations if they've been promoted to Reviewer, Chair, or Admin)
      const isStillAuthor = reg.userId?.role === 'author';
      if (!isStillAuthor) return false;

      const matchesFilter = filter === 'All' || reg.status === filter;
      const authorName = reg.personalDetails?.name || reg.userId?.name || '';
      const paperTitle = reg.paperDetails?.title || '';
      const authorId = reg.authorId || `#CMP-26-${reg._id.slice(-6).toUpperCase()}`;
      const matchesSearch = authorName.toLowerCase().includes(search.toLowerCase()) ||
        paperTitle.toLowerCase().includes(search.toLowerCase()) ||
        authorId.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [registrations, filter, search]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const overviewVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-[70] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tighter text-slate-800 leading-none">CIETM</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Panel</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Monitor Board', icon: LayoutDashboard },
              { id: 'submissions', label: 'Paper Submissions', icon: FileCheck },
              { id: 'users', label: 'User Directory', icon: Users },
              { id: 'verifier', label: 'On-site Entry', icon: ScanLine },
              { id: 'updates', label: 'Updates', icon: Bell },
              { id: 'analytics', label: 'Growth Insights', icon: TrendingUp },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-800 truncate">{user?.name}</p>
                <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{user?.role}</p>
              </div>
            </div>
            <Link to="/" className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <Home size={12} /> Exit to Site
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold mt-2 hover:bg-red-100 transition-all uppercase tracking-widest"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-10 flex items-center justify-between z-40">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm md:text-xl font-black text-slate-800 uppercase tracking-tight truncate">
              {activeTab.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
            {refreshing && <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden md:block">
              <button
                onClick={() => {
                  setHasNewNotifications(false);
                  setActiveTab('submissions');
                }}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-white hover:text-indigo-600 transition-all"
              >
                <Bell size={18} />
                {hasNewNotifications && analytics?.recent?.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </div>
            <button onClick={fetchAllData} className="p-3 md:px-4 md:py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
              <TrendingUp size={14} />
              <span className="hidden md:inline">Force Sync</span>
            </button>
            <button title="Export to Excel" onClick={exportToExcel} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <Download size={18} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline text-slate-600">Export XLSX</span>
            </button>
            <button
              title="Download All Manuscripts (ZIP)"
              onClick={() => window.open(`/api/registrations/download-all?token=${user.token}`, '_blank')}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              <div className="relative">
                <Download size={18} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Download ZIP</span>
            </button>
            <button
              onClick={logout}
              className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-all shadow-sm flex items-center gap-2"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                variants={overviewVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10 max-w-7xl mx-auto"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Registrations', value: analytics?.overview?.totalRegistrations || 0, icon: Users, color: 'indigo', trend: '+12% this week' },
                    { label: 'Papers Accepted', value: analytics?.overview?.totalAccepted || 0, icon: CheckCircle, color: 'blue', trend: '45% approval rate' },
                    { label: 'Revenue Collected', value: `₹${analytics?.overview?.totalPayments?.toLocaleString() || 0}`, icon: IndianRupee, color: 'blue', trend: 'Payments synced' },
                    { label: 'Pending Review', value: analytics?.overview?.totalPending || 0, icon: Clock, color: 'amber', trend: 'Needs attention' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      variants={itemVariants}
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform`}>
                        <stat.icon size={24} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-2xl md:text-3xl font-black text-slate-800 mb-4">{stat.value}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] md:text-[9px] font-bold px-2 py-1 rounded-md bg-${stat.color}-50 text-${stat.color}-600`}>
                          {stat.trend}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts and Lists Group */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Track Distribution Chart */}
                  <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6 md:mb-8">
                      <div>
                        <h3 className="text-lg font-black text-slate-800">Registration Velocity</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Across Conference Tracks</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><PieChart size={18} className="text-slate-400" /></button>
                        <button className="p-2 bg-indigo-50 text-indigo-600 rounded-lg transition-colors"><BarChart2 size={18} /></button>
                      </div>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.tracks || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '12px' }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                      Recent Submissions <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full">New</span>
                    </h3>
                    <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {analytics?.recent?.map((reg, i) => (
                        <div key={i} className="flex items-center gap-4 group cursor-pointer" onClick={() => { setSelectedReg(reg); setActiveTab('submissions') }}>
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                            <Users size={16} className="text-slate-400 group-hover:text-indigo-600" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate">{reg.personalDetails?.name || reg.userId?.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate uppercase mt-0.5 tracking-tighter">{reg.paperDetails?.track?.substring(0, 20)}...</p>
                          </div>
                          <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('submissions')} className="mt-6 w-full py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all">
                      View Audit Log
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'submissions' && (
              <motion.div
                key="submissions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-7xl mx-auto"
              >
                {/* Search and Filters Strip */}
                <div className="flex flex-col md:flex-row gap-6 mb-10">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="Search papers, authors, or IDs..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm text-slate-700 transition-all shadow-sm"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['All', 'Submitted', 'Under Review', 'Accepted', 'Rejected'].map(t => (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filter === t
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleAutoAssign}
                      disabled={autoAssigning}
                      className={`h-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${autoAssigning
                          ? 'bg-slate-100 text-slate-400 border-slate-100'
                          : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                        }`}
                    >
                      <ShieldCheck size={18} className={autoAssigning ? 'animate-pulse' : ''} />
                      {autoAssigning ? 'Syncing...' : 'Sync Unassigned Papers'}
                    </button>
                  </div>
                </div>

                {/* Submissions Table/List View */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Primary Author</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Research Title</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Track</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reviewer</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Attendance</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredData.map((reg, idx) => (
                          <tr key={reg._id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                  {(reg.personalDetails?.name || reg.userId?.name)?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-800 leading-none">{reg.personalDetails?.name || reg.userId?.name}</p>
                                  <p className="text-[10px] font-semibold text-slate-400 mt-1">{reg.userId?.email}</p>
                                  <p className="text-[10px] font-bold text-indigo-600 mt-0.5 tracking-wider font-mono">
                                    {reg.authorId || `#CMP-26-${reg._id.slice(-6).toUpperCase()}`}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-bold text-slate-700 max-w-[300px] leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setSelectedReg(reg)}>
                                {reg.paperDetails?.title || 'Untitled Submission'}
                              </p>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                                {reg.paperDetails?.track?.substring(0, 15)}...
                              </span>
                            </td>
                            <td className="px-8 py-6">
                               <select 
                                 className="w-full max-w-[150px] bg-slate-50 border-none rounded-lg py-1 px-2 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                 value={reg.paperDetails?.assignedReviewer?._id || ''}
                                 onChange={(e) => handleAssignReviewer(reg._id, e.target.value)}
                                 disabled={assigningReviewer}
                               >
                                 <option value="">{reg.paperDetails?.assignedReviewer ? 'Unassign Reviewer' : 'Assign Reviewer...'}</option>
                                 {reviewers.map(rev => (
                                   <option key={rev._id} value={rev._id}>
                                     {rev.name}
                                   </option>
                                 ))}
                               </select>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                {reg.attended ? (
                                  <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                    <CheckCircle size={14} /> Present
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                                    <X size={14} /> Absent
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] inline-block shadow-sm ${reg.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                                reg.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                  reg.status === 'Under Review' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                    (reg.status === 'Submitted' && !reg.paperDetails?.fileUrl) ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                      'bg-indigo-50 text-indigo-600'
                                }`}>
                                {reg.status === 'Submitted' && !reg.paperDetails?.fileUrl ? 'Pending Upload' : reg.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {reg.paperDetails?.fileUrl && (
                                  <a
                                    href={`/api/registrations/download/${reg._id}?token=${user.token}`}
                                    target="_blank" rel="noreferrer"
                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    title="Download File"
                                  >
                                    <Download size={16} />
                                  </a>
                                )}
                                <button
                                  onClick={() => setSelectedReg(reg)}
                                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[10px] px-3 uppercase tracking-tighter"
                                >
                                  Inspect
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredData.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                        <AlertCircle size={40} className="text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold text-sm tracking-tight uppercase">No matching registrations found</p>
                        <button onClick={() => { setSearch(''); setFilter('All') }} className="mt-4 text-xs font-black text-indigo-600 hover:underline uppercase tracking-widest">Reset Filters</button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-7xl mx-auto"
              >
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-50/50">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Registered Accounts</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage platform access</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                      <div className="flex w-full sm:w-auto bg-slate-100/50 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
                        {['All', 'Author', 'Reviewer', 'Chair'].map(f => (
                          <button
                            key={f}
                            onClick={() => setUserFilter(f)}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                              userFilter === f 
                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                          {users.filter(u => u.role !== 'admin' && (userFilter === 'All' || u.role.toLowerCase() === userFilter.toLowerCase())).length} {userFilter === 'All' ? 'Accounts' : `${userFilter}s`}
                        </span>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
                        >
                          <UserPlus size={14} /> Create User
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Information</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Access Level</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specialized Tracks</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Joined Date</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users
                          .filter(u => u.role !== 'admin')
                          .filter(u => userFilter === 'All' || u.role.toLowerCase() === userFilter.toLowerCase())
                          .map(u => (
                          <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${u.role === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'}`}>
                                  {u.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-800 leading-none">{u.name}</p>
                                  <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-tighter font-mono">
                                    {registrations.find(r => (r.userId?._id || r.userId) === u._id)?.authorId || `#USR-${u._id.slice(-6).toUpperCase()}`}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs font-bold text-slate-700">{u.email}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{u.phone || 'No phone provided'}</p>
                            </td>
                            <td className="px-8 py-6">                               <div className="flex flex-col gap-2">
                                 <select
                                   value={u.role}
                                   disabled={u._id === user._id}
                                   onChange={(e) => handleRoleUpdate(u._id, e.target.value)}
                                   className="appearance-none outline-none w-32 px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] disabled:opacity-50 disabled:cursor-not-allowed bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_12px_center] bg-no-repeat"
                                 >
                                   <option value="author" className="font-bold text-slate-700">Author</option>
                                   <option value="reviewer" className="font-bold text-slate-700">Reviewer</option>
                                   <option value="chair" className="font-bold text-slate-700">Chair</option>
                                 </select>

                                 {u.role === 'reviewer' && (
                                   <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 flex items-center justify-center gap-1.5 w-max">
                                     <FileCheck size={10} /> {registrations.filter(r => (r.paperDetails?.assignedReviewer?._id || r.paperDetails?.assignedReviewer) === u._id).length} Active Load
                                   </span>
                                 )}
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex flex-col items-start">
                                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                     {u.role === 'chair' || u.role === 'admin' ? (
                                        <span className="text-[9px] font-bold text-slate-400 italic uppercase tracking-widest">All Domains</span>
                                     ) : u.role === 'reviewer' ? (
                                        (u.assignedTracks || []).length > 0 ? (
                                           u.assignedTracks.map(t => (
                                              <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-indigo-100/50">{t}</span>
                                           ))
                                        ) : (
                                           <span className="text-[9px] font-bold text-slate-300 italic uppercase tracking-widest">General</span>
                                        )
                                     ) : (
                                        <span className="text-[9px] font-bold text-slate-300 italic uppercase tracking-widest">Not Applicable</span>
                                     )}
                                  </div>
                                  {u.role === 'reviewer' && (
                                     <button 
                                       onClick={() => {
                                         setTrackTargetUser(u);
                                         setSelectedTracks(u.assignedTracks || []);
                                         setIsTrackModalOpen(true);
                                       }}
                                       className="mt-3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all flex items-center gap-1.5 shadow-sm"
                                     >
                                       <ShieldCheck size={10} /> Edit Expertise
                                     </button>
                                  )}
                               </div>
                            </td>
                            <td className="px-8 py-6 text-xs font-bold text-slate-500">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {u.isEmailVerified ? (
                                  <span className="flex items-center gap-1.5 text-xs font-black text-blue-600 uppercase tracking-tighter">
                                    <CheckCircle size={14} /> Verified
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-black text-amber-500 uppercase tracking-tighter">
                                    <Clock size={14} /> Pending
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'verifier' && (
              <motion.div
                key="verifier"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 p-6 md:p-10 shadow-sm flex flex-col items-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                      <ScanLine size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">On-site Verifier</h3>
                    <p className="text-sm font-bold text-slate-400 text-center mb-8">Scan the QR code on the participant's virtual ID card to verify their identity and payment status.</p>

                    <QRScanner onScan={handleVerifyQR} />

                    <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      Scanner Active
                    </div>
                  </div>

                  <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 p-6 md:p-10 shadow-sm flex flex-col min-h-[400px] md:min-h-[500px]">
                    {!scannedResult ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                        <QrCode size={64} className="mb-4 text-slate-300" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Waiting for Scan...</p>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-full flex flex-col"
                      >
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
                          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-indigo-100 uppercase">
                            {scannedResult.personalDetails?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Participant Identity</p>
                            <h4 className="text-2xl font-black text-slate-800 leading-none">{scannedResult.personalDetails?.name}</h4>
                          </div>
                        </div>

                        <div className="space-y-6 flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">ID Status</p>
                              <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><ShieldCheck size={14} /> ACTIVE</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Registration</p>
                              <p className="text-xs font-bold text-indigo-600 uppercase tracking-tighter truncate">{scannedResult.status}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Attendance Record</p>
                              <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-tighter">
                                <Clock size={14} /> Logged at {new Date(scannedResult.attendedAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Category</p>
                            <p className="text-sm font-black text-slate-800">{scannedResult.personalDetails?.category}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{scannedResult.personalDetails?.institution}</p>
                          </div>

                          <div className={`p-5 rounded-2xl border ${scannedResult.paymentStatus === 'Completed' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className={`text-[8px] font-black uppercase mb-1 ${scannedResult.paymentStatus === 'Completed' ? 'text-blue-600' : 'text-red-600'}`}>Payment Status</p>
                                <p className={`text-lg font-black ${scannedResult.paymentStatus === 'Completed' ? 'text-blue-800' : 'text-red-800'}`}>{scannedResult.paymentStatus}</p>
                              </div>
                              <div className={`p-2 rounded-xl ${scannedResult.paymentStatus === 'Completed' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-red-500 text-white shadow-lg shadow-red-200'}`}>
                                <CreditCard size={24} />
                              </div>
                            </div>

                            {scannedResult.paymentStatus !== 'Completed' && (
                              <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-red-200/50">
                                {scannedResult.status !== 'Accepted' ? (
                                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${scannedResult.status === 'Draft' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                                    <AlertCircle className={scannedResult.status === 'Draft' ? "text-amber-600" : "text-blue-600"} size={18} />
                                    <p className={`text-[10px] font-bold uppercase tracking-tight ${scannedResult.status === 'Draft' ? "text-amber-700" : "text-blue-700"}`}>
                                      {scannedResult.status === 'Draft'
                                        ? "Submission Incomplete: Author must submit paper details."
                                        : `Verification Restricted: Manuscript status is "${scannedResult.status}". Accept it first in the submissions tab.`}
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-center px-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fee Required</p>
                                      <p className="text-sm font-black text-red-600">₹{calculateRequiredFee(scannedResult)}</p>
                                    </div>
                                    <div className="relative">
                                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                      <input
                                        type="number"
                                        placeholder="Enter Amount Collected"
                                        value={manualPaymentAmount || calculateRequiredFee(scannedResult)}
                                        onChange={(e) => setManualPaymentAmount(e.target.value)}
                                        className="w-full pl-9 pr-4 py-3 bg-white border-2 border-red-100 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-red-400 transition-all shadow-sm"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleManualPaymentConfirm(scannedResult)}
                                      className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 hover:-translate-y-0.5 transition-all"
                                    >
                                      Collect & Verify Entry
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {scannedResult.paymentStatus === 'Completed' && (
                              <p className="text-[10px] font-bold text-blue-700 mt-3 border-t border-blue-200/50 pt-3">
                                Transaction: {scannedResult.transactionId}
                              </p>
                            )}
                          </div>
                        </div>

                        {scannedResult.paymentStatus !== 'Completed' ? (
                          <div className="mt-8 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                            <AlertCircle className="text-red-600" size={20} />
                            <p className="text-xs font-bold text-red-600">Entry Restricted: Payment is {scannedResult.paymentStatus.toLowerCase()}.</p>
                          </div>
                        ) : (
                          <div className="mt-8 p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center gap-3">
                              <CheckCircle size={24} />
                              <span className="font-black uppercase tracking-widest text-sm">Clear For Entry</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-100 opacity-80 uppercase tracking-widest">Attendance Recorded Automatically</p>
                          </div>
                        )}

                        <button
                          onClick={() => setScannedResult(null)}
                          className="mt-4 w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors"
                        >
                          Reset Scanner
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'updates' && (
              <motion.div
                key="updates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Pending Updates</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Re-upload requests from authors</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Bell size={24} />
                  </div>
                </div>

                {registrations.filter(r => r.paperDetails?.reuploadRequestStatus === 'Pending').length === 0 ? (
                  <div className="bg-white rounded-[2rem] border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                     <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                       <CheckCircle size={32} />
                     </div>
                     <h3 className="text-lg font-black text-slate-700">All caught up!</h3>
                     <p className="text-sm font-bold text-slate-400 mt-2">There are no pending re-upload requests.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {registrations.filter(r => r.paperDetails?.reuploadRequestStatus === 'Pending').map(reg => (
                      <div key={reg._id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between shrink-0 gap-4">
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                             <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-red-100">Rejected</span>
                             <span className="text-xs font-bold text-slate-400">ID: ...{reg._id.slice(-6).toUpperCase()}</span>
                           </div>
                           <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">{reg.paperDetails?.title || 'Untitled'}</h4>
                           <p className="text-sm font-bold text-slate-500">Author: {reg.personalDetails?.name}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                           <button onClick={() => handleReuploadAction(reg._id, 'Reject')} className="w-full sm:w-auto px-6 py-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors border border-slate-200">Deny</button>
                           <button onClick={() => handleReuploadAction(reg._id, 'Approve')} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 transition-colors">Approve Request</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'analytics' && analytics && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Revenue Breakdown */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm lg:col-span-1 flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">Finance Overview</h3>
                    <div className="flex flex-col items-center gap-8 flex-1 justify-center">
                      <div className="h-[220px] w-full max-w-[220px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={[
                                { name: 'Completed', value: analytics.overview.completedPaymentsCount || 0 },
                                { name: 'Unpaid (Accepted)', value: (analytics.overview.totalAccepted || 0) - (analytics.overview.completedPaymentsCount || 0) }
                              ]}
                              innerRadius={70}
                              outerRadius={100}
                              paddingAngle={8}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill="url(#colorRevenuePaid)" />
                              <Cell fill="#f1f5f9" />
                            </Pie>
                            <defs>
                              <linearGradient id="colorRevenuePaid" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={1} />
                                <stop offset="95%" stopColor="#059669" stopOpacity={1} />
                              </linearGradient>
                            </defs>
                          </RePieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-3xl font-black text-slate-800 leading-none mb-1">
                            {Math.round(((analytics.overview.completedPaymentsCount || 0) / (analytics.overview.totalAccepted || 1)) * 100)}%
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paid</p>
                        </div>
                      </div>

                      <div className="w-full space-y-4">
                        <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl border border-indigo-100/50 shadow-inner group hover:shadow-md transition-all">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 opacity-80 group-hover:opacity-100">Total Revenue</p>
                          <p className="text-3xl font-black text-indigo-700">₹{analytics.overview.totalPayments?.toLocaleString()}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Paid Authors</p>
                            <p className="text-xl font-black text-slate-700">{analytics.overview.completedPaymentsCount}</p>
                          </div>
                          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Ticket</p>
                            <p className="text-xl font-black text-slate-700">₹{Math.round(analytics.overview.totalPayments / (analytics.overview.completedPaymentsCount || 1))}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Track Engagement Chart */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-8 shadow-sm lg:col-span-2 flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">Manuscripts per Track</h3>
                    <div className="flex-1 w-full min-h-[400px]">
                      {analytics.tracks && analytics.tracks.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={analytics.tracks.map(t => ({ name: t._id, Submissions: t.count }))}
                            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                          >
                            <defs>
                              <linearGradient id="colorTrackCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.8} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                              dy={15}
                              angle={-45}
                              textAnchor="end"
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                              dx={-10}
                            />
                            <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                fontWeight: 700,
                                fontSize: '12px'
                              }}
                            />
                            <Bar
                              dataKey="Submissions"
                              fill="url(#colorTrackCount)"
                              radius={[8, 8, 8, 8]}
                              barSize={40}
                              animationDuration={1500}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <TrendingUp size={48} className="opacity-20 mb-4" />
                          <p className="font-bold text-sm tracking-wide">No track data available yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && settings && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto space-y-10"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* System Configuration */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                      <Settings className="text-indigo-600" /> System Control
                    </h3>
                    <form onSubmit={handleUpdateSettings} className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-sm font-black text-slate-800">Registration Status</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Toggle portal accessibility</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, registrationOpen: !settings.registrationOpen })}
                          className={`w-14 h-8 rounded-full transition-all relative ${settings.registrationOpen ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.registrationOpen ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-sm font-black text-slate-800">Online Payments</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Enable/Disable payment gateway</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, onlinePaymentEnabled: !settings.onlinePaymentEnabled })}
                          className={`w-14 h-8 rounded-full transition-all relative ${settings.onlinePaymentEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.onlinePaymentEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-sm font-black text-slate-800">Auto-Assign Reviewers</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Enable/Disable background assignment engine</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, autoAssignEnabled: !settings.autoAssignEnabled })}
                          className={`w-14 h-8 rounded-full transition-all relative ${settings.autoAssignEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.autoAssignEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Abstract Deadline</label>
                          <input
                            type="date"
                            value={settings.deadlines?.abstractSubmission?.split('T')[0] || ''}
                            onChange={(e) => setSettings({ ...settings, deadlines: { ...settings.deadlines, abstractSubmission: e.target.value } })}
                            className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Paper Deadline</label>
                          <input
                            type="date"
                            value={settings.deadlines?.fullPaperSubmission?.split('T')[0] || ''}
                            onChange={(e) => setSettings({ ...settings, deadlines: { ...settings.deadlines, fullPaperSubmission: e.target.value } })}
                            className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Registration Fees (INR)</label>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.keys(settings.fees || {}).map(f => (
                            <div key={f} className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                              <input
                                type="number"
                                placeholder={f}
                                value={settings.fees[f]}
                                onChange={(e) => setSettings({ ...settings, fees: { ...settings.fees, [f]: e.target.value } })}
                                className="w-full pl-8 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs"
                              />
                              <span className="absolute -top-1 right-2 bg-indigo-50 text-indigo-600 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                {f.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        disabled={isUpdatingSettings}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all disabled:opacity-50"
                      >
                        {isUpdatingSettings ? 'Committing Changes...' : 'Save Configuration'}
                      </button>
                    </form>
                  </div>

                  {/* Global Announcement */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-10 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-3">
                      <Bell className="text-amber-500" /> Global Broadcast
                    </h3>
                    <form onSubmit={handleBroadcast} className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Notification Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Deadline Extended!"
                          value={broadcast.title}
                          onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Message Content</label>
                        <textarea
                          placeholder="Type your announcement here..."
                          rows={4}
                          value={broadcast.message}
                          onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm resize-none"
                        ></textarea>
                      </div>

                      <div className="flex gap-4">
                        {['info', 'success', 'warning', 'error'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setBroadcast({ ...broadcast, type: t })}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${broadcast.type === t ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <button className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-amber-100 hover:-translate-y-1 transition-all">
                        Push to All Authors
                      </button>
                    </form>
                  </div>

                   {/* Administrative Control */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-10 shadow-sm col-span-1 lg:col-span-2">
                    <h3 className="text-xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-3">
                      <Shield className="text-indigo-600" /> Administrative Control
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-4">Current Administrators</label>
                        <div className="space-y-3">
                          {users.filter(u => u.role === 'admin').map(adminUser => (
                            <div key={adminUser._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                  {adminUser.name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-800 truncate">{adminUser.name} {adminUser._id === user._id && <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-1 font-black">YOU</span>}</p>
                                  <p className="text-[9px] font-bold text-slate-400 truncate tracking-tighter">{adminUser.email}</p>
                                </div>
                              </div>
                              {adminUser._id !== user._id && (
                                <button
                                  onClick={() => handleRoleUpdate(adminUser._id, 'author')}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Revoke Admin Access"
                                >
                                  <LogOut size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-4">Promote to Admin</label>
                        <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 flex-1 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-500 mb-4 leading-relaxed uppercase tracking-tight">
                            Enter the email address of an existing user to grant them full system administrative privileges.
                          </p>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="email"
                              placeholder="user@example.com"
                              value={promoteEmail}
                              onChange={(e) => setPromoteEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-white border border-indigo-100 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const targetUser = users.find(u => u.email === promoteEmail);
                              if (targetUser) {
                                handleRoleUpdate(targetUser._id, 'admin');
                                setPromoteEmail('');
                              } else {
                                toast.error("User not found in system");
                              }
                            }}
                            className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:-translate-y-1 transition-all"
                          >
                            Grant Admin Access
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50/50 rounded-[2.5rem] border border-red-200 p-6 md:p-10 shadow-sm col-span-1 lg:col-span-2">
                    <h3 className="text-xl font-black text-red-800 mb-6 md:mb-8 flex items-center gap-3">
                      <AlertCircle className="text-red-600" /> Danger Zone
                    </h3>
                    <div className="bg-white rounded-2xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 mb-4">
                      <div>
                        <p className="text-sm font-black text-slate-800">System Reset (Preserve Admins)</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 max-w-md">Permanently delete all author accounts, registrations, drafts, and notifications. Admin accounts will be preserved.</p>
                      </div>
                      <button
                        onClick={handleCleanupDatabase}
                        className="w-full md:w-auto px-6 py-4 bg-red-100 bg-opacity-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Trash2 size={16} /> Purge Database
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                        <p className="text-sm font-black text-slate-800">Clear Cloudinary Vault</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 max-w-md">Permanently delete all uploaded manuscripts, payment proofs, and files from Cloudinary storage.</p>
                      </div>
                      <button
                        onClick={handleCleanupCloudinary}
                        className="w-full md:w-auto px-6 py-4 bg-red-100 bg-opacity-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Trash2 size={16} /> Purge Cloudinary
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Advanced Registration Inspector Modal */}
      <AnimatePresence>
        {selectedReg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReg(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            ></motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full md:w-[95vw] lg:w-full max-w-6xl bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[85vh] overflow-hidden overflow-y-auto md:overflow-y-hidden"
            >
              {/* Modal Sidebar - Summary */}
              <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-6 md:p-10 flex flex-col shrink-0">
                <div className="flex md:flex-col items-center gap-4 md:gap-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-xl shadow-indigo-200 shrink-0">
                  </div>
                  <div className="text-left md:text-left md:mb-8 md:mt-6 overflow-hidden max-w-full">
                    <h2 className="text-lg md:text-xl font-black text-slate-800 leading-tight truncate">{selectedReg.personalDetails?.name || selectedReg.userId?.name}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-widest truncate">{selectedReg.userId?.email}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 md:mb-10 mt-6 md:mt-0">
                  <div className="flex justify-between items-center px-4 py-3 bg-white rounded-2xl border border-slate-200">
                    <span className="text-[9px] font-black text-slate-400 uppercase group-hover:block tracking-widest">ID</span>
                    <span className="text-[10px] font-mono font-bold text-slate-800">
                      {selectedReg.authorId || `...${selectedReg._id.slice(-6)}`}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center px-4 py-3 rounded-2xl border ${selectedReg.status === 'Accepted' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-amber-50 border-amber-100 text-amber-600'
                    }`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">Status</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {selectedReg.status === 'Submitted' && !selectedReg.paperDetails?.fileUrl ? 'Pending Upload' : selectedReg.status}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center px-4 py-3 rounded-2xl border ${selectedReg.paymentStatus === 'Completed' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">Payment</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedReg.paymentStatus}</span>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  {selectedReg.status !== 'Accepted' && (
                    <button
                      onClick={() => handleReview(selectedReg._id, 'Accepted')}
                      disabled={!selectedReg.paperDetails?.fileUrl}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:-translate-y-1 ${!selectedReg.paperDetails?.fileUrl
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                        }`}
                    >
                      {!selectedReg.paperDetails?.fileUrl ? 'No Manuscript' : 'Approve Submission'}
                    </button>
                  )}
                  {selectedReg.status !== 'Rejected' && (
                    <button
                      onClick={() => handleReview(selectedReg._id, 'Rejected')}
                      className="w-full py-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                    >
                      Decline Submission
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                  <div className="flex justify-between items-start mb-10 gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Research Title</p>
                      <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight block">{selectedReg.paperDetails?.title || 'No Title Provided'}</h1>
                    </div>
                    <button onClick={() => setSelectedReg(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shrink-0">
                      <XCircle size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <section>
                      <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Users size={16} /> Personal Info
                      </h4>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Principal Name</p>
                            <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedReg.personalDetails?.name || selectedReg.userId?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Principal Email</p>
                            <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 truncate" title={selectedReg.personalDetails?.email || selectedReg.userId?.email}>{selectedReg.personalDetails?.email || selectedReg.userId?.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Institution</p>
                          <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedReg.personalDetails?.institution || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Category / Participant Type</p>
                          <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedReg.personalDetails?.category || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Mobile Contact</p>
                          <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedReg.personalDetails?.mobile || 'N/A'}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <FileCheck size={16} /> Submission Metadata
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Conference Track</p>
                          <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedReg.paperDetails?.track || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Manuscript File</p>
                          {selectedReg.paperDetails?.fileUrl ? (
                            <a
                              href={`/api/registrations/download/${selectedReg._id}?token=${user.token}`}
                              target="_blank" rel="noreferrer"
                              className="flex items-center justify-between gap-3 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all group"
                            >
                              <span className="text-xs font-black uppercase flex items-center gap-2 tracking-widest"><Download size={14} /> Download Word Doc</span>
                              <ExternalLink size={14} className="opacity-60 group-hover:opacity-100" />
                            </a>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest italic">No File Uploaded Yet</div>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Keywords</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedReg.paperDetails?.keywords?.map((k, i) => (
                              <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">{k}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="mt-12">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-3">Abstract Overview</h4>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                      <p className="text-slate-600 text-base leading-relaxed font-serif italic text-justify whitespace-pre-line">
                        {selectedReg.paperDetails?.abstract || 'No abstract content available.'}
                      </p>
                    </div>
                  </div>

                  {selectedReg.teamMembers && selectedReg.teamMembers.length > 0 && (
                    <div className="mt-12">
                      <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-3">Co-Authors ({selectedReg.teamMembers.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedReg.teamMembers.map((member, i) => (
                          <div key={i} className="p-5 border border-slate-200 rounded-3xl bg-white shadow-sm hover:border-indigo-200 transition-all group">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center font-bold text-xs transition-colors">
                                {member.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800">{member.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 uppercase tracking-tighter transition-colors">{member.category}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-[10px] font-bold text-slate-500">
                              <p className="flex items-center gap-2"><Mail size={12} className="opacity-50" /> {member.email}</p>
                              <p className="flex items-center gap-2 truncate" title={member.affiliation}><Shield size={12} className="opacity-50" /> {member.affiliation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Review Information */}
                  {selectedReg.paperDetails?.reviewerComments && (
                    <div className="mt-12 p-8 bg-amber-50 rounded-[2rem] border border-amber-100 mb-10">
                      <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Bell size={14} /> Reviewer Assessment</h4>
                      <p className="text-sm font-bold text-amber-800 leading-relaxed italic">"{selectedReg.paperDetails.reviewerComments}"</p>
                    </div>
                  )}
                </div>

                {/* Modal Actions Footer */}
                <div className="bg-white/90 backdrop-blur-xl border-t border-slate-100 p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6 z-20 shrink-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6 w-full lg:w-auto">
                    {selectedReg.paymentStatus === 'Completed' ? (
                      <div className="px-4 md:px-5 py-3 rounded-2xl border transition-all flex-1 sm:flex-none bg-blue-50 border-blue-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Verification</p>
                        <p className="text-sm font-black flex items-center gap-2 text-blue-700">
                          <CheckCircle size={16} /> Completed
                        </p>
                      </div>
                    ) : (
                      <div className="px-4 md:px-5 py-3 rounded-2xl border transition-all flex-1 sm:flex-none bg-amber-50 border-amber-200 shadow-inner flex flex-col gap-2 relative">
                        <div className="flex justify-between items-center mr-1">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Manual Payment Collection</p>
                          <span className="text-[10px] font-black text-amber-700">₹{calculateRequiredFee(selectedReg)} Required</span>
                        </div>

                        {selectedReg.status !== 'Accepted' ? (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">
                              {selectedReg.status === 'Draft' ? "Submission Incomplete" : "Manuscript Not Accepted"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="₹ Amount"
                              min="1"
                              value={manualPaymentAmount || calculateRequiredFee(selectedReg)}
                              onChange={(e) => setManualPaymentAmount(e.target.value)}
                              className="w-24 bg-white border border-amber-200 rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <button
                              onClick={() => handleManualPaymentConfirm(selectedReg)}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-md transition-colors whitespace-nowrap"
                            >
                              Confirm & Verify
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedReg.paymentStatus === 'Completed' && (
                      <button
                        onClick={() => handleToggleAttendance(selectedReg)}
                        className={`px-4 md:px-5 py-3 rounded-2xl border transition-all flex-1 sm:flex-none flex flex-col justify-center sm:items-start ${selectedReg.attended ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}
                      >
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">On-site Attendance</p>
                        <span className={`text-sm font-black flex items-center gap-2 ${selectedReg.attended ? 'text-indigo-700' : 'text-slate-400'}`}>
                          {selectedReg.attended ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
                          {selectedReg.attended ? 'Marked Present' : 'Mark Absent'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {!selectedReg.paperDetails?.fileUrl ? (
                      <div className="flex items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl w-full">
                        <p className="text-xs font-bold text-slate-500 text-center uppercase tracking-widest">
                          Pending Manuscript Upload
                        </p>
                      </div>
                    ) : (
                      <>
                        {selectedReg.status !== 'Accepted' && (
                          <button
                            onClick={() => handleReview(selectedReg._id, 'Accepted')}
                            className="flex-1 w-full sm:w-auto px-6 md:px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                          >
                            Accept Manuscript
                          </button>
                        )}
                        {selectedReg.status !== 'Rejected' && (
                          <button
                            onClick={() => handleReview(selectedReg._id, 'Rejected')}
                            className="flex-1 w-full sm:w-auto px-6 md:px-8 py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-red-50 transition-all"
                          >
                            Reject
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Author Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 md:p-10 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <UserPlus className="text-emerald-500" /> Administrative Provisioning
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Directly add verified staff or authors</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateAuthor} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Dr. John Doe"
                    value={newAuthor.name}
                    onChange={(e) => setNewAuthor({ ...newAuthor, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Email Address *</label>
                  <input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={newAuthor.email}
                    onChange={(e) => setNewAuthor({ ...newAuthor, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91..."
                      value={newAuthor.phone}
                      onChange={(e) => setNewAuthor({ ...newAuthor, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">System Role *</label>
                    <select
                      value={newAuthor.role}
                      onChange={(e) => setNewAuthor({ ...newAuthor, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                    >
                      <option value="author">Author (Attendee)</option>
                      <option value="reviewer">Reviewer (Expert)</option>
                      <option value="chair">Chair / Editor (Oversight)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Initial Password *</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newAuthor.password}
                      onChange={(e) => setNewAuthor({ ...newAuthor, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-start gap-3 text-xs mb-4">
                  <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                  <p className="font-bold">Account will bypass email verification. Authors can log in immediately and change their password later.</p>
                </div>

                <button
                  disabled={isCreatingAuthor}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {isCreatingAuthor ? 'Creating Account...' : 'Create Verified Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Track Selection Modal */}
        {isTrackModalOpen && trackTargetUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTrackModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            ></motion.div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Reviewer Expertise</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select domains for {trackTargetUser.name}</p>
                </div>
                <button onClick={() => setIsTrackModalOpen(false)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-3">
                {CONFERENCE_TRACKS.map(track => {
                  const isSelected = selectedTracks.includes(track.id);
                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTracks(selectedTracks.filter(t => t !== track.id));
                        } else {
                          setSelectedTracks([...selectedTracks, track.id]);
                        }
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'
                      }`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                           {track.id}
                         </p>
                         <p className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                           {track.label}
                         </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="p-8 pt-0 flex gap-3">
                <button
                  onClick={() => setIsTrackModalOpen(false)}
                  className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateReviewerTracks(trackTargetUser._id, selectedTracks);
                    setIsTrackModalOpen(false);
                  }}
                  className="flex-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 px-10"
                >
                  Save Expertise
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        /* Modern Table Shadows */
        thead th { backdrop-filter: blur(8px); }
        tbody tr:last-child td { border-bottom: none; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
