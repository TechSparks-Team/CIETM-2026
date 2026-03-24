import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Users, FileCheck, Clock, CheckCircle, Layers,
  XCircle, Search, Filter, ExternalLink, Home,
  LayoutDashboard, Download, PieChart, BarChart2,
  Settings, Bell, Mail, Shield, ChevronRight,
  TrendingUp, IndianRupee, AlertCircle, CreditCard, Trash2, UserPlus, LogOut, RefreshCw, Zap, ChevronDown, Files, User
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
import { downloadFile } from '../utils/downloadHelper';

const QRScanner = React.memo(({ onScan }) => {
  useEffect(() => {
    let scanner = null;
    let isMounted = true;

    // Slight delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      if (!isMounted) return;
      const readerElement = document.getElementById("reader");
      if (!readerElement) return;

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
            if (isMounted) onScan(decodedText);
          },
          (err) => { /* ignore per-frame errors */ }
        );
      } catch (e) {
        console.error("Scanner Init Error:", e);
      }
    }, 500);

    return () => {
      isMounted = false;
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
});

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
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info', roles: ['author'] });
  const [newAuthor, setNewAuthor] = useState({ name: '', email: '', phone: '', password: '', role: 'author' });
  const [isCreatingAuthor, setIsCreatingAuthor] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
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
  const [userSearch, setUserSearch] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileUserFilterOpen, setIsMobileUserFilterOpen] = useState(false);
  const [activeReviewerMenu, setActiveReviewerMenu] = useState(null);
  const [activeUserRoleMenu, setActiveUserRoleMenu] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const mobileFilterRef = useRef(null);
  const verifyingRef = useRef(false);

  // Inspector logic
  const inspectorData = selectedReg || scannedResult;
  const isFromScanner = !!scannedResult;
  const closeInspector = () => {
    setSelectedReg(null);
    setScannedResult(null);
  };


  const categoryAmounts = {
    'UG/PG STUDENTS': 500,
    'FACULTY/RESEARCH SCHOLARS': 750,
    'EXTERNAL / ONLINE PRESENTATION': 300,
    'INDUSTRY PERSONNEL': 900
  };

  const calculateRequiredFee = (reg) => {
    if (!reg) return 0;
    let total = CATEGORY_AMOUNTS[reg.personalDetails?.category] || 0;
    if (reg.teamMembers && reg.teamMembers.length > 0) {
      reg.teamMembers.forEach(member => {
        total += CATEGORY_AMOUNTS[member.category] || 0;
      });
    }
    return total;
  };

  const calculatePortfolioBalance = (reg) => {
    if (!reg) return 0;
    let balance = 0;
    // Scanned paper
    if (reg.status === 'Accepted' && reg.paymentStatus !== 'Completed') {
      balance += calculateRequiredFee(reg);
    }
    // Associated papers
    if (reg.otherPapers) {
      reg.otherPapers.forEach(p => {
        if (p.status === 'Accepted' && p.paymentStatus !== 'Completed') {
          balance += calculateRequiredFee(p);
        }
      });
    }
    return balance;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(event.target)) {
        setIsMobileFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllData = useCallback(async () => {
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
  }, [user?.token]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleVerifyQR = useCallback(async (decodedText) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setIsVerifying(true);
    const loadingToast = toast.loading("Verifying Identity...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get(`/api/registrations/verify/${decodedText}`, config);
      setScannedResult(data);
      toast.success("Identity Verified & Attendance Logged", { id: loadingToast });
      fetchAllData();
      setIsScannerModalOpen(false);
    } catch (error) {
      const message = error.response?.data?.message || "Invalid QR Code";
      toast.error(message, { id: loadingToast });

      if (error.response?.data?.personalDetails) {
        setScannedResult(error.response.data);
      } else {
        setScannedResult(null);
      }
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  }, [user?.token, fetchAllData]);

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
    if (broadcast.roles.length === 0) return toast.error("Please select at least one target role");

    const loadingToast = toast.loading("Broadcasting notification...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.post('/api/settings/broadcast', broadcast, config);
      toast.success(`Broadcasting complete`, { id: loadingToast });
      setBroadcast({ title: '', message: '', type: 'info', roles: ['author'] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Broadcast failed", { id: loadingToast });
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

  const handleRevokeVerification = async (reg) => {
    if (!window.confirm("Are you sure you want to revoke this user's entry authorization and reset their payment status?")) return;
    
    const loadingToast = toast.loading("Revoking Authorization...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.put(`/api/registrations/${reg._id}/status`, {
        paymentStatus: 'Pending',
        attended: false,
        remarks: `Authorization revoked by Admin on ${new Date().toLocaleString()}`
      }, config);

      setRegistrations(registrations.map(r => r._id === reg._id ? data : r));
      if (selectedReg?._id === reg._id) setSelectedReg(data);
      if (scannedResult?._id === reg._id) setScannedResult(data);
      toast.success("Authorization revoked successfully", { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to revoke authorization", { id: loadingToast });
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
    
    setUpdatingRole(true);
    const loadingToast = toast.loading(`Updating member access to ${newRole}...`);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put(`/api/auth/users/${userId}/role`, { role: newRole }, config);
      toast.success('Institutional permissions updated!', { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update account credentials', { id: loadingToast });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u._id === user._id) return toast.error("You cannot delete your own account.");
    
    const confirmation = prompt(`Are you sure you want to PERMANENTLY delete user "${u.name}"? This action cannot be undone. Type "${u.email}" to confirm:`);
    if (confirmation !== u.email) return toast.error("Account deletion cancelled (confirmation mismatch).");

    const loadingToast = toast.loading(`Deleting account for ${u.name}...`);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.delete(`/api/auth/users/${u._id}`, config);
      toast.success('User account removed permanently', { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove user account', { id: loadingToast });
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

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this submission? This cannot be undone.")) return;

    const loadingToast = toast.loading("Deleting submission...");
    try {
      await axios.delete(`/api/registrations/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Submission deleted successfully", { id: loadingToast });
      fetchAllData();
      if (selectedReg && selectedReg._id === id) {
        setSelectedReg(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete submission", { id: loadingToast });
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



  const filteredData = useMemo(() => {
    return registrations.filter(reg => {
      // Only show submissions from users who are still authors
      // (Hide registrations if they've been promoted to Reviewer, Chair, or Admin)
      const isStillAuthor = reg.userId?.role === 'author';
      if (!isStillAuthor) return false;

      const matchesFilter = filter === 'All' || reg.status === filter;
      const authorName = reg.personalDetails?.name || reg.userId?.name || '';
      const paperTitle = reg.paperDetails?.title || '';
      const paperId = reg.paperId || (reg.personalDetails?.authorId || `#PAPER-${reg._id.slice(-6).toUpperCase()}`);
      const delegateId = reg.userId?.delegateId || '';
      const matchesSearch = authorName.toLowerCase().includes(search.toLowerCase()) ||
        paperTitle.toLowerCase().includes(search.toLowerCase()) ||
        paperId.toLowerCase().includes(search.toLowerCase()) ||
        delegateId.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [registrations, filter, search]);

  const tracksChartData = useMemo(() => {
    // Calculate actual paper count based on unique titles to avoid counting co-authors twice
    const uniquePapersPerTrack = {};
    const titlesSeen = new Set();
    
    registrations
    .filter(reg => reg.status !== 'Draft' && reg.paperDetails?.title)
    .forEach(reg => {
      const title = reg.paperDetails.title.toLowerCase().trim();
      if (!titlesSeen.has(title)) {
        titlesSeen.add(title);
        const track = reg.paperDetails.track || 'General';
        uniquePapersPerTrack[track] = (uniquePapersPerTrack[track] || 0) + 1;
      }
    });

    return CONFERENCE_TRACKS.map(track => ({
      _id: track.id,
      name: track.id,
      count: uniquePapersPerTrack[track.id] || 0,
      Submissions: uniquePapersPerTrack[track.id] || 0
    }));
  }, [registrations]);

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
              { id: 'reviewers', label: 'Reviewer Board', icon: ShieldCheck },
              { id: 'verifier', label: 'On-site Entry', icon: ScanLine, action: () => setIsScannerModalOpen(true) },
              { id: 'analytics', label: 'Growth Insights', icon: TrendingUp },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { 
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id); 
                  }
                  setMobileMenuOpen(false); 
                }}
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
      {/* User Detail Modal */}
      <AnimatePresence>
        {isUserModalOpen && selectedUserDetail && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsUserModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col p-8 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Simple Header */}
              <div className="flex items-start justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl overflow-hidden shadow-sm shrink-0">
                      {(() => {
                        const reg = registrations.find(r => (r.userId?._id || r.userId) === selectedUserDetail._id);
                        return reg?.personalDetails?.profilePicture ? (
                          <img src={reg.personalDetails.profilePicture} alt="" className="w-full h-full object-cover" />
                        ) : selectedUserDetail.name?.charAt(0);
                      })()}
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 leading-tight uppercase">{selectedUserDetail.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                            {selectedUserDetail.role}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {selectedUserDetail.delegateId || `#USR-${selectedUserDetail._id.slice(-6).toUpperCase()}`}
                          </span>
                       </div>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsUserModalOpen(false)}
                   className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                 >
                   <X size={20} />
                 </button>
              </div>

              {/* Data Grid */}
              <div className="space-y-6">
                 {/* Contact Section */}
                 <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 pb-2 border-b border-slate-50">Contact Information</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400 uppercase tracking-tighter">Email</span>
                          <span className="font-black text-slate-700">{selectedUserDetail.email}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400 uppercase tracking-tighter">Phone</span>
                          <span className="font-black text-slate-700">{selectedUserDetail.phone || 'N/A'}</span>
                       </div>
                    </div>
                 </div>

                 {/* Institutional Section */}
                 <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 pb-2 border-b border-slate-50">Institutional Profile</h4>
                    {(() => {
                      const reg = registrations.find(r => (r.userId?._id || r.userId) === selectedUserDetail._id);
                      if (!reg) return <p className="text-[10px] font-bold text-slate-400 italic">No registration profile found</p>;
                      const pd = reg.personalDetails;
                      return (
                        <div className="space-y-4">
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{pd.category === 'INDUSTRY PERSONNEL' ? 'Organization' : 'Institution'}</p>
                              <p className="text-sm font-black text-slate-800 uppercase leading-none">{pd.institution}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</p>
                                 <p className="text-xs font-black text-slate-700 truncate">{pd.department || 'N/A'}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</p>
                                 <p className="text-xs font-black text-slate-700 truncate">{pd.designation}</p>
                              </div>
                           </div>
                           <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Specialization & Category</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-black text-indigo-700 uppercase tracking-tighter">{pd.areaOfSpecialization}</p>
                                <div className="h-1 w-1 rounded-full bg-indigo-300"></div>
                                <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">{pd.category}</p>
                              </div>
                           </div>
                        </div>
                      );
                    })()}
                 </div>
              </div>
              
              <div className="mt-10 flex gap-3">
                 <button 
                   onClick={() => setIsUserModalOpen(false)}
                   className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                 >
                   Done
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Force Sync</span>
            </button>
            <button title="Export to Excel" onClick={exportToExcel} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <Download size={18} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline text-slate-600">Export XLSX</span>
            </button>
            <button
              title="Download All Manuscripts (ZIP)"
              onClick={async () => {
                const toastId = toast.loading('Preparing bulk archive…');
                try {
                  const filename = `CIETM_Archive_${new Date().toISOString().split('T')[0]}.zip`;
                  await downloadFile('/api/registrations/download-all', filename, user.token);
                  toast.success('Archive downloaded!', { id: toastId });
                } catch (err) {
                  toast.error(err.message || 'ZIP download failed', { id: toastId });
                }
              }}
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
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                  {[
                    { 
                      label: 'Total Registrations', 
                      value: analytics?.overview?.totalRegistrations || 0, 
                      icon: Users, 
                      color: 'indigo', 
                      trend: `All system entries` 
                    },
                    { 
                      label: 'Author Drafts', 
                      value: analytics?.overview?.totalDrafts || 0, 
                      icon: Clock, 
                      color: 'slate', 
                      trend: `Incomplete forms` 
                    },
                    { 
                      label: 'Papers Accepted', 
                      value: analytics?.overview?.totalAccepted || 0, 
                      icon: CheckCircle, 
                      color: 'blue', 
                      trend: `${Math.round((analytics?.overview?.totalAccepted || 0) / (analytics?.overview?.totalRegistrations || 1) * 100)}% approval rate` 
                    },
                    { 
                      label: 'Revenue Collected', 
                      value: `₹${analytics?.overview?.totalPayments?.toLocaleString() || 0}`, 
                      icon: IndianRupee, 
                      color: 'blue', 
                      trend: `${Math.round((analytics?.overview?.completedPaymentsCount || 0) / (analytics?.overview?.totalAccepted || 1) * 100)}% payment efficacy` 
                    },
                    { 
                      label: 'Pending Review', 
                      value: analytics?.overview?.totalPending || 0, 
                      icon: Clock, 
                      color: 'amber', 
                      trend: `${Math.round((analytics?.overview?.totalPending || 0) / (analytics?.overview?.totalRegistrations || 1) * 100)}% workload queue` 
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      variants={itemVariants}
                      whileHover={{ y: -5 }}
                      className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                    >
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform`}>
                        <stat.icon size={20} className="md:w-6 md:h-6" />
                      </div>
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{stat.label}</p>
                      <p className="text-xl md:text-3xl font-black text-slate-800 mb-3 md:mb-4 truncate">{stat.value}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] md:text-[9px] font-black px-2 py-1 rounded-md bg-${stat.color}-50 text-${stat.color}-600 uppercase tracking-tighter`}>
                          {stat.trend}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts and Lists Group */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Strategic Overview (Simplified) */}
                  <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Strategic Overview</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Finance & Track Distribution</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest opacity-70">Revenue</p>
                            <p className="text-sm font-black text-emerald-700 leading-none mt-0.5">₹{analytics?.overview?.totalPayments?.toLocaleString()}</p>
                         </div>
                         <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest opacity-70">Paid</p>
                            <p className="text-sm font-black text-indigo-700 leading-none mt-0.5">{Math.round(((analytics?.overview?.completedPaymentsCount || 0) / (analytics?.overview?.totalAccepted || 1)) * 100)}%</p>
                         </div>
                      </div>
                    </div>

                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tracksChartData}>
                          <defs>
                             <linearGradient id="colorTrackBar" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#6366f1" stopOpacity={1} />
                               <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.9} />
                             </linearGradient>
                           </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                             dataKey="_id" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} 
                             dy={10}
                             tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc', radius: 8 }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '12px' }}
                          />
                          <Bar dataKey="count" fill="url(#colorTrackBar)" radius={[8, 8, 8, 8]} barSize={36} />
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-row items-center gap-2 w-full">
                  {/* Search Section */}
                  <div className="relative flex-1 group min-w-0">
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 md:pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold text-xs text-slate-700 transition-all shadow-sm"
                    />
                  </div>

                  {/* Filters Section */}
                  <div className="relative shrink-0" ref={mobileFilterRef}>
                    {/* Mobile Filter Toggle */}
                    <button 
                      onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                      className={`sm:hidden p-2.5 rounded-xl border transition-all ${filter !== 'All' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      <Filter size={18} />
                    </button>

                    {/* Desktop Horizontal Filters */}
                    <div className="hidden sm:flex gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200">
                      {[
                        { id: 'All', icon: Layers },
                        { id: 'Draft', icon: Clock },
                        { id: 'Submitted', icon: Files },
                        { id: 'Under Review', icon: Shield },
                        { id: 'Accepted', icon: CheckCircle },
                        { id: 'Rejected', icon: XCircle }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilter(item.id)}
                          title={item.id}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${filter === item.id
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          <item.icon size={13} />
                          <span className="hidden xl:inline text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{item.id}</span>
                        </button>
                      ))}
                    </div>

                    {/* Mobile Dropdown Menu */}
                    <AnimatePresence>
                      {isMobileFilterOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full right-0 z-[60] mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-1.5 flex flex-col gap-1">
                            {[
                              { id: 'All', icon: Layers },
                              { id: 'Draft', icon: Clock },
                              { id: 'Submitted', icon: Files },
                              { id: 'Under Review', icon: Shield },
                              { id: 'Accepted', icon: CheckCircle },
                              { id: 'Rejected', icon: XCircle }
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => { setFilter(item.id); setIsMobileFilterOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === item.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                              >
                                <item.icon size={14} />
                                {item.id}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sync Action */}
                  <button
                    onClick={handleAutoAssign}
                    disabled={autoAssigning}
                    title="Sync Unassigned Papers"
                    className={`flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${autoAssigning
                        ? 'bg-slate-100 text-slate-400 border-slate-100'
                        : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                      }`}
                  >
                    <Zap size={18} className={autoAssigning ? 'animate-pulse' : ''} />
                    <span className="hidden md:inline">{autoAssigning ? 'Syncing...' : 'Sync Unassigned'}</span>
                  </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 uppercase tracking-[0.1em] text-[10px] font-black text-slate-400">
                          <th className="px-4 py-5 w-[60%] md:w-[20%] text-center">Primary Author</th>
                          <th className="hidden md:table-cell px-4 py-5 w-[22%] text-center">Research Title</th>
                          <th className="hidden md:table-cell px-4 py-5 w-[10%] text-center">Track</th>
                          <th className="hidden lg:table-cell px-4 py-5 w-[15%] text-center">Reviewer</th>
                          <th className="hidden xl:table-cell px-4 py-5 w-[10%] text-center">Attendance</th>
                          <th className="px-4 py-5 w-[40%] md:w-[12%] text-center">Status</th>
                          <th className="hidden md:table-cell px-4 py-5 w-[15%] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredData.map((reg, index) => {
                          const userAvatar = registrations.find(r => (r.userId?._id || r.userId) === (reg.userId?._id || reg.userId) && r.personalDetails?.profilePicture)?.personalDetails?.profilePicture;
                          return (
                          <tr 
                            key={reg._id} 
                            onClick={() => {
                              if (window.innerWidth < 768) setSelectedReg(reg);
                            }}
                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer md:cursor-default"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="hidden sm:flex w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center font-bold text-xs uppercase cursor-pointer overflow-hidden border border-slate-100 shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); }}>
                                  {userAvatar ? (
                                    <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                                  ) : (reg.personalDetails?.name || reg.userId?.name)?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-800 leading-none truncate">{reg.personalDetails?.name || reg.userId?.name}</p>
                                  <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate">{reg.userId?.email}</p>
                                  <div className="flex flex-wrap gap-1 mt-1 font-mono">
                                     <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50 w-max">
                                        {reg.userId?.delegateId || 'NO_USER_ID'}
                                     </span>
                                     <span className="hidden md:inline-block text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-max">
                                        {reg.paperId || (reg.personalDetails?.authorId || `#PAPER-${reg._id.slice(-6).toUpperCase()}`)}
                                     </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-4 py-4">
                              <p className="text-sm font-bold text-slate-700 max-w-xs truncate group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setSelectedReg(reg)}>
                                 {reg.paperDetails?.title || 'Untitled Submission'}
                              </p>
                            </td>
                            <td className="hidden md:table-cell px-4 py-4 text-center">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 italic">
                                  {reg.paperDetails?.track || 'Not Specified'}
                               </span>
                            </td>
                            <td className="hidden lg:table-cell px-4 py-4 overflow-visible">
                               <div className="relative flex justify-center">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActiveReviewerMenu(activeReviewerMenu === reg._id ? null : reg._id);
                                   }}
                                   disabled={assigningReviewer}
                                   className={`w-full max-w-[140px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                     reg.paperDetails?.assignedReviewer 
                                       ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                                       : 'bg-slate-50 border-slate-100 text-slate-500'
                                   } hover:border-indigo-300 active:scale-95 disabled:opacity-50`}
                                 >
                                   <span className="truncate">
                                     {reg.paperDetails?.assignedReviewer?.name || 'Unassigned'}
                                   </span>
                                   <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${activeReviewerMenu === reg._id ? 'rotate-180' : ''}`} />
                                 </button>

                                 <AnimatePresence>
                                   {activeReviewerMenu === reg._id && (
                                     <>
                                       <div className="fixed inset-0 z-[70]" onClick={() => setActiveReviewerMenu(null)} />
                                       <motion.div
                                         initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                         animate={{ opacity: 1, x: 0, scale: 1 }}
                                         exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                         className={`absolute lg:left-full lg:ml-4 lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto ${(filteredData.length - index) <= 2 ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-[80] w-56 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-1.5`}
                                       >
                                         <div className="flex flex-col gap-1 max-h-60 overflow-y-auto no-scrollbar">
                                           <button
                                              onClick={() => {
                                                handleAssignReviewer(reg._id, "");
                                                setActiveReviewerMenu(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 transition-all"
                                           >
                                              <Trash2 size={14} />
                                              Unassign
                                           </button>
                                           
                                           {reviewers.map(rev => {
                                             const isActive = reg.paperDetails?.assignedReviewer?._id === rev._id;
                                             return (
                                               <button
                                                 key={rev._id}
                                                 onClick={() => {
                                                   handleAssignReviewer(reg._id, rev._id);
                                                   setActiveReviewerMenu(null);
                                                 }}
                                                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                                   isActive
                                                     ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                     : 'text-slate-500 hover:bg-slate-50'
                                                 }`}
                                               >
                                                 <Users size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                                                 {rev.name}
                                               </button>
                                             );
                                           })}
                                         </div>
                                       </motion.div>
                                     </>
                                   )}
                                 </AnimatePresence>
                               </div>
                            </td>
                            <td className="hidden xl:table-cell px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                 {reg.attended ? (
                                   <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-tighter"><CheckCircle size={14} /> Present</span>
                                 ) : (
                                   <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-tighter"><X size={14} /> Absent</span>
                                 )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-2 md:px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest inline-block shadow-sm ${
                                 reg.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                                 reg.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                 reg.status === 'Under Review' ? 'bg-amber-100 text-amber-700' :
                                 (reg.status === 'Submitted' && !reg.paperDetails?.fileUrl) ? 'bg-slate-100 text-slate-600' :
                                 'bg-indigo-50 text-indigo-600'
                               }`}>
                                 {reg.status === 'Submitted' && !reg.paperDetails?.fileUrl ? 'Pending' : reg.status}
                               </span>
                            </td>
                            <td className="hidden md:table-cell px-4 py-6 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  {reg.paperDetails?.fileUrl && (
                                    <button 
                                       onClick={async (e) => {
                                         e.stopPropagation();
                                         const paperId = reg.paperId || reg._id.slice(-6).toUpperCase();
                                         const ext = reg.paperDetails?.originalName?.split('.').pop() || 'docx';
                                         const loadingToast = toast.loading('Preparing download…');
                                         try {
                                           await downloadFile(`/api/registrations/download/${reg._id}`, `${paperId}.${ext}`, user.token);
                                           toast.success('Download started!', { id: loadingToast });
                                           if (reg.status === 'Submitted') {
                                             setTimeout(fetchAllData, 2000);
                                           }
                                         } catch (err) {
                                           toast.error(err.message || 'Download failed', { id: loadingToast });
                                         }
                                       }}
                                       className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                                       title="Download Manuscript"
                                    >
                                       <Download size={14} />
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); }} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg font-black text-[9px] px-2.5 uppercase tracking-tighter transition-all">Inspect</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSubmission(reg._id); }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors group/delete"
                                    title="Delete Paper"
                                  >
                                    <Trash2 size={16} className="group-hover/delete:scale-110 transition-transform" />
                                  </button>
                               </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                    {filteredData.length === 0 && (
                      <div className="py-20 text-center">
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">No matching papers found</p>
                         <button 
                           onClick={() => { setFilter('All'); setSearch(''); }}
                           className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                         >
                           Reset All Filters
                         </button>
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

                    <div className="flex flex-row items-center gap-2 w-full xl:w-auto">
                      {/* User Search Box */}
                      <div className="relative flex-1 sm:w-64 group min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold text-xs text-slate-700 transition-all shadow-sm"
                        />
                      </div>

                      <div className="relative shrink-0">
                        {/* Mobile Filter Toggle */}
                        <button 
                          onClick={() => setIsMobileUserFilterOpen(!isMobileUserFilterOpen)}
                          className={`sm:hidden p-2.5 rounded-xl border transition-all ${userFilter !== 'All' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                        >
                          <Filter size={18} />
                        </button>

                        <div className="hidden sm:flex bg-slate-100/50 p-1 rounded-xl border border-slate-200">
                          {[
                            { id: 'All', icon: Layers },
                            { id: 'Author', icon: Users },
                            { id: 'Reviewer', icon: FileCheck },
                            { id: 'Chair', icon: Shield }
                          ].map(f => (
                            <button
                              key={f.id}
                              onClick={() => setUserFilter(f.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                                userFilter === f.id 
                                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <f.icon size={13} />
                              <span className="hidden lg:inline">{f.id}</span>
                            </button>
                          ))}
                        </div>

                        {/* Mobile Dropdown Menu */}
                        <AnimatePresence>
                          {isMobileUserFilterOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 5, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-full right-0 z-[60] mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                            >
                              <div className="p-1.5 flex flex-col gap-1">
                                {[
                                  { id: 'All', icon: Layers },
                                  { id: 'Author', icon: Users },
                                  { id: 'Reviewer', icon: FileCheck },
                                  { id: 'Chair', icon: Shield }
                                ].map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => { setUserFilter(item.id); setIsMobileUserFilterOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userFilter === item.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    <item.icon size={14} />
                                    {item.id}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-2.5 sm:px-4 sm:py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
                      >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Add User</span>
                      </button>
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
                          .filter(u => {
                            if (!userSearch) return true;
                            const term = userSearch.toLowerCase();
                            return (
                              u.name?.toLowerCase().includes(term) ||
                              u.email?.toLowerCase().includes(term) ||
                              (u.delegateId || '').toLowerCase().includes(term)
                            );
                          })
                          .map((u, index, array) => (
                          <tr 
                            key={u._id} 
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group/row"
                            onClick={() => {
                              setSelectedUserDetail(u);
                              setIsUserModalOpen(true);
                            }}
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm overflow-hidden border-2 border-slate-100 shadow-sm transition-all duration-300 hover:scale-110 hover:border-indigo-200 group/avatar ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                  {registrations.find(r => (r.userId?._id || r.userId) === u._id)?.personalDetails?.profilePicture ? (
                                    <img 
                                      src={registrations.find(r => (r.userId?._id || r.userId) === u._id).personalDetails.profilePicture} 
                                      alt="" 
                                      className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-500" 
                                    />
                                  ) : u.name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{u.name}</p>
                                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter font-mono leading-none">
                                    {u.delegateId || `#USR-${u._id.slice(-6).toUpperCase()}`}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs font-bold text-slate-700">{u.email}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{u.phone || 'No phone provided'}</p>
                            </td>
                            <td className="px-8 py-6 overflow-visible">
                               <div className="relative flex flex-col gap-2">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActiveUserRoleMenu(activeUserRoleMenu === u._id ? null : u._id);
                                   }}
                                   disabled={u._id === user._id || updatingRole}
                                   className={`w-32 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                     activeUserRoleMenu === u._id 
                                       ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-md' 
                                       : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                   } disabled:opacity-50 disabled:cursor-not-allowed`}
                                 >
                                   <span className="truncate">{u.role}</span>
                                   <ChevronDown size={12} className={`shrink-0 transition-transform duration-300 ${activeUserRoleMenu === u._id ? 'rotate-180' : ''}`} />
                                 </button>

                                 <AnimatePresence>
                                   {activeUserRoleMenu === u._id && (
                                     <>
                                       <div className="fixed inset-0 z-[70]" onClick={() => setActiveUserRoleMenu(null)} />
                                       <motion.div
                                         initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                         animate={{ opacity: 1, x: 0, scale: 1 }}
                                         exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                         className={`absolute lg:left-full lg:ml-4 lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto ${(array.length - index) <= 2 ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-[80] w-48 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-1.5`}
                                       >
                                         <div className="flex flex-col gap-1">
                                           {[
                                             { id: 'author', label: 'Author', icon: Users },
                                             { id: 'reviewer', label: 'Reviewer', icon: FileCheck },
                                             { id: 'chair', label: 'Chair', icon: Shield }
                                           ].map(role => {
                                             const isActive = u.role === role.id;
                                             return (
                                               <button
                                                 key={role.id}
                                                 onClick={() => {
                                                   handleRoleUpdate(u._id, role.id);
                                                   setActiveUserRoleMenu(null);
                                                 }}
                                                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                                   isActive
                                                     ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                     : 'text-slate-500 hover:bg-slate-50'
                                                 }`}
                                               >
                                                 <role.icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                                                 {role.label}
                                               </button>
                                             );
                                           })}
                                         </div>
                                       </motion.div>
                                     </>
                                   )}
                                 </AnimatePresence>

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
                                {u._id !== user._id && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-2 text-slate-300 hover:text-red-600 transition-colors group/delete"
                                    title="Remove User"
                                  >
                                    <Trash2 size={16} className="group-hover/delete:scale-110 transition-transform" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {users.filter(u => u.role !== 'admin').filter(u => userFilter === 'All' || u.role.toLowerCase() === userFilter.toLowerCase()).filter(u => {
                      if (!userSearch) return true;
                      const term = userSearch.toLowerCase();
                      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || (u.delegateId || '').toLowerCase().includes(term);
                    }).length === 0 && (
                      <div className="py-20 text-center">
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">No users found matching your criteria</p>
                         <button 
                           onClick={() => { setUserFilter('All'); setUserSearch(''); }}
                           className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                         >
                           Clear All Searches
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'reviewers' && (
              <motion.div
                key="reviewers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-7xl mx-auto"
              >
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-50/50">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Reviewer Board</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage peer evaluation expertise</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                          {reviewers.length} Peer Reviewers
                        </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 uppercase tracking-[0.1em] text-[10px] font-black text-slate-400">
                          <th className="px-8 py-5">Reviewer Profile</th>
                          <th className="px-8 py-5">Contact Details</th>
                          <th className="px-8 py-5">Specialized Tracks</th>
                          <th className="px-8 py-5">Review Load</th>
                          <th className="px-8 py-5 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {reviewers.map(u => (
                          <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                  {u.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-800 mb-0.5">{u.name}</p>
                                  <p className="text-[10px] font-bold text-indigo-600 font-mono tracking-tighter uppercase">{u.delegateId || `#REV-${u._id.slice(-6).toUpperCase()}`}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs font-bold text-slate-700">{u.email}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{u.phone || 'No phone provided'}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col items-start gap-3">
                                <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                                  {(u.assignedTracks || []).length > 0 ? (
                                    u.assignedTracks.map(t => (
                                      <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-indigo-100/30">{t}</span>
                                    ))
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-300 italic uppercase tracking-widest">General (All Tracks)</span>
                                  )}
                                </div>
                                <button 
                                  onClick={() => {
                                    setTrackTargetUser(u);
                                    setSelectedTracks(u.assignedTracks || []);
                                    setIsTrackModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all flex items-center gap-2 shadow-sm"
                                >
                                  <ShieldCheck size={12} /> Configure Expertise
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black text-slate-600 flex items-center gap-1.5">
                                  <FileCheck size={14} className="text-indigo-500" />
                                  {registrations.filter(r => (r.paperDetails?.assignedReviewer?._id || r.paperDetails?.assignedReviewer) === u._id).length} Active Assignments
                                </span>
                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500" 
                                    style={{ width: `${Math.min(100, (registrations.filter(r => (r.paperDetails?.assignedReviewer?._id || r.paperDetails?.assignedReviewer) === u._id).length / 5) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              {u.isEmailVerified ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                  <CheckCircle size={12} /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                  <Clock size={12} /> Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                      {tracksChartData.some(d => d.Submissions > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={tracksChartData}
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

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-3">Target Audience</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'author', label: 'Authors' },
                            { id: 'chair', label: 'Chairs' },
                            { id: 'reviewer', label: 'Reviewers' }
                          ].map(role => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => {
                                const newRoles = broadcast.roles.includes(role.id)
                                  ? broadcast.roles.filter(r => r !== role.id)
                                  : [...broadcast.roles, role.id];
                                setBroadcast({ ...broadcast, roles: newRoles });
                              }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${broadcast.roles.includes(role.id)
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                  : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                                }`}
                            >
                              {broadcast.roles.includes(role.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                              {role.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        {['info', 'success', 'warning', 'error'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setBroadcast({ ...broadcast, type: t })}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${broadcast.type === t
                                ? (t === 'info' ? 'bg-slate-900 border-slate-900 text-white' :
                                  t === 'success' ? 'bg-emerald-600 border-emerald-600 text-white' :
                                    t === 'warning' ? 'bg-amber-500 border-amber-500 text-white' :
                                      'bg-red-600 border-red-600 text-white')
                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                        <Bell size={16} />
                        Push to {broadcast.roles.length === 3 ? 'Entire Platform' :
                          broadcast.roles.length === 0 ? 'Selection' :
                            broadcast.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1) + 's').join(' & ')}
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

      {/* Unified Registration Inspector Modal */}
      <AnimatePresence>
        {inspectorData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 md:p-12 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeInspector}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            ></motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full md:w-[95vw] lg:w-full max-w-6xl bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row h-[95vh] md:h-[80vh] overflow-y-auto md:overflow-hidden"
            >
              {/* Universal Close Button */}
              <button 
                onClick={closeInspector} 
                className="absolute top-6 right-6 md:top-8 md:right-10 z-[60] p-3 bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-90 shadow-lg shadow-slate-200/50"
              >
                <X size={24} strokeWidth={3} />
              </button>

              {/* Modal Sidebar - Profile & Top Stats */}
              <div className="w-full md:w-72 bg-white border-r border-slate-100 p-6 md:p-8 flex flex-col shrink-0 md:overflow-y-auto custom-scrollbar">
                <div className="flex flex-row md:flex-col items-center gap-6 md:gap-0 mb-6 md:mb-0">
                  <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-xl md:text-3xl font-black border border-slate-100 shrink-0 overflow-hidden">
                    {registrations.find(r => (r.userId?._id || r.userId) === (inspectorData.userId?._id || inspectorData.userId) && r.personalDetails?.profilePicture)?.personalDetails?.profilePicture ? (
                      <img 
                        src={registrations.find(r => (r.userId?._id || r.userId) === (inspectorData.userId?._id || inspectorData.userId) && r.personalDetails?.profilePicture).personalDetails.profilePicture} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (inspectorData.personalDetails?.name || inspectorData.userId?.name)?.charAt(0)}
                  </div>
                  <div className="text-left md:text-center md:mb-6 md:mt-4 flex-1 min-w-0">
                    <h2 className="text-base md:text-xl font-black text-slate-800 leading-tight truncate">{inspectorData.personalDetails?.name || inspectorData.userId?.name}</h2>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest truncate">{inspectorData.userId?.email || inspectorData.personalDetails?.email}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4 md:mb-8">
                  <div className="flex flex-col gap-1.5 p-4 bg-white rounded-xl border border-slate-200/60 transition-all hover:border-slate-300">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest">Delegate</span>
                      <span className="font-mono font-black text-slate-700">{inspectorData.userId?.delegateId || inspectorData.delegateId || 'N/A'}</span>
                    </div>
                    <div className="h-[1px] bg-slate-50 w-full"></div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest">Paper</span>
                      <span className="font-mono font-black text-slate-700">{inspectorData.paperId || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center px-4 py-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Manuscript</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      inspectorData.status === 'Accepted' ? 'text-emerald-500' : 
                      inspectorData.status === 'Rejected' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {inspectorData.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Finance</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      inspectorData.paymentStatus === 'Completed' ? 'text-indigo-600' : 'text-amber-500'
                    }`}>{inspectorData.paymentStatus}</span>
                  </div>
                </div>

                <div className="hidden md:flex flex-col gap-3 mt-auto">
                  {inspectorData.status !== 'Accepted' && (
                    <button
                      onClick={() => handleReview(inspectorData._id, 'Accepted')}
                      disabled={!inspectorData.paperDetails?.fileUrl}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${!inspectorData.paperDetails?.fileUrl
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        }`}
                    >
                      {!inspectorData.paperDetails?.fileUrl ? 'Awaiting Upload' : 'Approve Decision'}
                    </button>
                  )}
                  {inspectorData.status !== 'Rejected' && (
                    <button
                      onClick={() => handleReview(inspectorData._id, 'Rejected')}
                      className="w-full py-4 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                      Reject Submission
                    </button>
                  )}
                  
                  {isFromScanner && (
                    <button
                      onClick={() => {
                        closeInspector();
                        setIsScannerModalOpen(true);
                      }}
                      className="w-full py-4 bg-white text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 border border-slate-200 mt-2"
                    >
                      <RefreshCw size={14} /> Scan Another
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 h-full bg-white">
                <div className="flex-1 md:overflow-y-auto p-6 md:p-10 custom-scrollbar">
                  {isFromScanner ? (
                    /* Simplified Verification View for Scanner */
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded">Verification</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Entry Check</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                          {inspectorData.personalDetails?.name || inspectorData.userId?.name}
                        </h1>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Submissions</p>
                           <p className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <Files size={16} className="text-slate-400" />
                              {1 + (inspectorData.otherPapers?.length || 0)} Units
                           </p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Portfolio Due</p>
                           <p className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <CreditCard size={16} className="text-slate-400" />
                              ₹{calculatePortfolioBalance(inspectorData)}
                           </p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                           <p className="text-xl font-black text-emerald-500 flex items-center gap-2">
                              <ShieldCheck size={16} />
                              Verified
                           </p>
                        </div>
                      </div>

                      <section>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <User size={14} /> Identity Breakdown
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Affiliation</p>
                              <p className="text-xs font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">{inspectorData.personalDetails?.institution || 'N/A'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Delegate Category</p>
                              <p className="text-xs font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">{inspectorData.personalDetails?.category || 'N/A'}</p>
                           </div>
                        </div>
                      </section>

                      <section>
                         <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Layers size={14} /> Submission Portfolio
                            </h4>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Status Check</span>
                         </div>
                         
                         <div className="space-y-2">
                            {/* Current Paper */}
                            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-2.5 transition-all hover:bg-slate-50/50 group">
                               <div className="flex-1 min-w-0">
                                   <p className="text-xs font-black text-slate-800 truncate mb-1 sm:mb-0">{inspectorData.paperDetails?.title || 'Untitled Paper'}</p>
                                   <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[7px] font-black uppercase tracking-widest rounded border border-slate-100">Scanning Source</span>
                                      <span className="text-[8px] font-mono text-slate-500 font-black">#{inspectorData.paperId || 'N/A'}</span>
                                   </div>
                                </div>
                               <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                   <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-100 ${inspectorData.paymentStatus === 'Completed' ? 'bg-indigo-50 text-indigo-600 border-indigo-50' : 'bg-amber-50 text-amber-600 border-amber-50'}`}>
                                         {inspectorData.paymentStatus === 'Completed' ? 'Paid' : 'Unpaid'}
                                      </span>
                                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-100 ${inspectorData.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-50' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                         {inspectorData.status}
                                      </span>
                                   </div>
                                </div>
                            </div>

                            {/* Other Papers */}
                            {inspectorData.otherPapers?.map((p, i) => (
                                <div key={i} className="p-3.5 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-2.5 transition-all opacity-80 hover:opacity-100 hover:bg-slate-50/50">
                                   <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-600 truncate mb-1 sm:mb-0">{p.status === 'Draft' ? 'Draft Application' : p.title || 'Associated Paper'}</p>
                                      <div className="flex items-center gap-2">
                                         <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[7px] font-black uppercase tracking-widest rounded border border-slate-100">Multi-Submission</span>
                                         <span className="text-[8px] font-mono text-slate-500 font-black">#{p.paperId || 'N/A'}</span>
                                      </div>
                                   </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                      <div className="flex items-center gap-2">
                                         <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-100 ${p.paymentStatus === 'Completed' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {p.paymentStatus === 'Completed' ? 'Paid' : 'Unpaid'}
                                         </span>
                                     <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-100 ${p.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                            {p.status}
                                         </span>
                                      </div>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </section>
                    </div>
                  ) : (
                    /* Full Inspection View for Directory */
                    <>
                      <div className="flex justify-between items-start mb-8 md:mb-12 gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded">Research Entry</span>
                            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inspectorData.paperDetails?.track || 'General Domain'}</span>
                          </div>
                          <h1 className="text-xl md:text-3xl font-black text-slate-800 leading-[1.15] break-words pr-12 md:pr-0">
                            {inspectorData.paperDetails?.title || 'No Title Provided'}
                          </h1>
                        </div>
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
                                <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{inspectorData.personalDetails?.name || inspectorData.userId?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Principal Email</p>
                                <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 truncate" title={inspectorData.personalDetails?.email || inspectorData.userId?.email}>{inspectorData.personalDetails?.email || inspectorData.userId?.email || 'N/A'}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Institution</p>
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 uppercase">{inspectorData.personalDetails?.institution || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Department</p>
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 uppercase">{inspectorData.personalDetails?.department || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Category / Participant Type</p>
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{inspectorData.personalDetails?.category || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Mobile Contact</p>
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{inspectorData.personalDetails?.mobile || 'N/A'}</p>
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
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{inspectorData.paperDetails?.track || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Manuscript File</p>
                              {inspectorData.paperDetails?.fileUrl ? (
                                <button
                                  onClick={async () => {
                                    const paperId = inspectorData.paperId || inspectorData._id.slice(-6).toUpperCase();
                                    const ext = inspectorData.paperDetails?.originalName?.split('.').pop() || 'docx';
                                    const loadingToast = toast.loading('Preparing download…');
                                    try {
                                      await downloadFile(`/api/registrations/download/${inspectorData._id}`, `${paperId}.${ext}`, user.token);
                                      toast.success('Download started!', { id: loadingToast });
                                    } catch (err) {
                                      toast.error(err.message || 'Download failed', { id: loadingToast });
                                    }
                                  }}
                                  className="flex items-center justify-between gap-3 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all group w-full"
                                >
                                  <span className="text-xs font-black uppercase flex items-center gap-2 tracking-widest"><Download size={14} /> Download Word Doc</span>
                                </button>
                              ) : (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest italic">No File Uploaded Yet</div>
                              )}
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Keywords</p>
                              <div className="flex flex-wrap gap-2">
                                {inspectorData.paperDetails?.keywords?.map((k, i) => (
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
                            {inspectorData.paperDetails?.abstract || 'No abstract content available.'}
                          </p>
                        </div>
                      </div>

                      {inspectorData.teamMembers && inspectorData.teamMembers.length > 0 && (
                        <div className="mt-12 md:mt-20">
                          <div className="flex items-center gap-4 mb-8">
                            <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] whitespace-nowrap">Collaborating Authors</h4>
                            <div className="h-px bg-slate-100 flex-1"></div>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg">{inspectorData.teamMembers.length} Person(s)</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                            {inspectorData.teamMembers.map((member, i) => (
                              <div key={i} className="p-6 border border-slate-100 rounded-[2rem] bg-white shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 hover:border-indigo-100 transition-all group">
                                <div className="flex items-center gap-4 mb-5">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-black text-sm transition-all shadow-inner">
                                    {member.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{member.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.category}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                    <Mail size={14} className="text-slate-400" />
                                    <p className="text-[11px] font-bold text-slate-600 truncate">{member.email}</p>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                    <Shield size={14} className="text-slate-400" />
                                    <p className="text-[11px] font-bold text-slate-600 truncate" title={member.affiliation}>{member.affiliation}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual Review Information */}
                      {inspectorData.paperDetails?.reviewerComments && (
                        <div className="mt-12 p-8 bg-amber-50 rounded-[2rem] border border-amber-100 mb-10">
                          <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Bell size={14} /> Reviewer Assessment</h4>
                          <p className="text-sm font-bold text-amber-800 leading-relaxed italic">"{inspectorData.paperDetails.reviewerComments}"</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Modal Actions Footer */}
                <div className="bg-white/80 backdrop-blur-2xl border-t border-slate-100 p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 z-20 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    {inspectorData.paymentStatus === 'Completed' ? (
                      <div className="px-5 py-3 rounded-2xl transition-all flex-1 sm:flex-none bg-blue-50 border border-blue-100 flex flex-col">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Payment Verified</p>
                        <p className="text-sm font-black flex items-center gap-2 text-blue-700">
                          <CheckCircle size={16} /> Completed
                        </p>
                      </div>
                    ) : (
                      <div className="px-5 py-3 rounded-2xl border-2 border-amber-100 transition-all flex-1 sm:flex-none bg-amber-50/30 flex flex-col gap-2 relative group hover:border-amber-400">
                        <div className="flex justify-between items-center gap-4">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Manual Collection</p>
                          <span className="text-[11px] font-black text-amber-700">₹{calculateRequiredFee(inspectorData)}</span>
                        </div>

                        {inspectorData.status !== 'Accepted' ? (
                          <div className="flex items-center gap-2 text-amber-600/60 pb-1">
                            <AlertCircle size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">
                              Needs Acceptance First
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Amount"
                              value={manualPaymentAmount || calculateRequiredFee(inspectorData)}
                              onChange={(e) => setManualPaymentAmount(e.target.value)}
                              className="w-24 bg-white border border-amber-200 rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                            />
                            <button
                              onClick={() => handleManualPaymentConfirm(inspectorData)}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-200 transition-all active:scale-95"
                            >
                              Verify
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {inspectorData.paymentStatus === 'Completed' && (
                      <button
                        onClick={() => handleToggleAttendance(inspectorData)}
                        className={`px-5 py-3 rounded-2xl border transition-all flex-1 sm:flex-none flex flex-col justify-center text-left ${inspectorData.attended ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}
                      >
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${inspectorData.attended ? 'text-indigo-200' : 'text-slate-400'}`}>On-site Attendance</p>
                        <span className="text-sm font-black flex items-center gap-2">
                          {inspectorData.attended ? <Users size={16} /> : <ScanLine size={16} />}
                          {inspectorData.attended ? 'Marked Present' : 'Mark Absent'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {!inspectorData.paperDetails?.fileUrl ? (
                      <div className="flex items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl w-full">
                        <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-widest italic">
                          Awaiting Manuscript Upload...
                        </p>
                      </div>
                    ) : (
                      <>
                        {inspectorData.status !== 'Accepted' && (
                          <button
                            onClick={() => handleReview(inspectorData._id, 'Accepted')}
                            className="flex-1 w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                          >
                            Accept Paper
                          </button>
                        )}
                        {inspectorData.status !== 'Rejected' && (
                          <button
                            onClick={() => handleReview(inspectorData._id, 'Rejected')}
                            className="flex-1 w-full sm:w-auto px-8 py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all active:scale-95"
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

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {isScannerModalOpen && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ScanLine size={16} />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Live Entry Scanner</h3>
                </div>
                <button
                  onClick={() => setIsScannerModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8">
                <div className="qr-scanner-modal-wrapper overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-black min-h-[260px] shadow-inner">
                  <QRScanner onScan={handleVerifyQR} />
                </div>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] animate-pulse">Scanning...</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase text-center tracking-widest max-w-[200px]">
                    Align the delegate's QR code within the frame to verify entry
                  </p>
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
      </AnimatePresence>

      {/* Track Selection Modal */}
      <AnimatePresence>
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
