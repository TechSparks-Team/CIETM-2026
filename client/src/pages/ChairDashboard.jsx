import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  FileCheck, Clock, CheckCircle, XCircle, Search, Home, Filter, ChevronDown, 
  LayoutDashboard, PieChart,
  Settings, Bell, Shield, ChevronRight, Lock,
  TrendingUp, Download, Menu, X, Users, Layers,
  QrCode, ScanLine, ShieldCheck, CreditCard, AlertCircle, IndianRupee,
  ExternalLink, Mail, LogOut, CheckSquare, Square, Trash2, RefreshCw, Files, User, Zap
} from 'lucide-react';
import { CONFERENCE_TRACKS, CATEGORY_AMOUNTS } from '../constants/conferenceData';
import { downloadFile } from '../utils/downloadHelper';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardSkeleton from '../components/DashboardSkeleton';
import * as XLSX from 'xlsx';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan }) => {
  useEffect(() => {
    let scanner = null;
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
          (decodedText) => onScan(decodedText),
          (err) => { /* ignore */ }
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
      <div id="reader" className="qr-scanner-container w-full max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-slate-200 bg-black/5 min-h-[300px]"></div>
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
        #reader video { border-radius: 20px !important; object-fit: cover !important; }
        #reader__status_span { font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; }
      `}</style>
      <div className="px-6 py-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
        <p className="text-[10px] font-bold text-indigo-700 leading-relaxed text-center">
          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse mr-2"></span>
          Press <strong>"Start Scanning"</strong> above to activate the live feed for On-site Entry.
        </p>
      </div>
    </div>
  );
};

const ChairDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState('All');
  const [selectedReg, setSelectedReg] = useState(null);
  const [scannedResult, setScannedResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [reviewers, setReviewers] = useState([]);
  const [assigningReviewer, setAssigningReviewer] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [activeReviewerMenu, setActiveReviewerMenu] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef(null);

  // Unified Inspector States
  const inspectorData = selectedReg || scannedResult;
  const isFromScanner = !!scannedResult;
  const closeInspector = () => {
    setSelectedReg(null);
    setScannedResult(null);
  };
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackTargetUser, setTrackTargetUser] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    college: user?.college || '',
    password: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    if (user) {
       axios.get('/api/auth/profile', {
         headers: { Authorization: `Bearer ${user.token}` }
       }).then(res => {
          setProfileData({
             name: res.data.name || '',
             department: res.data.department || '',
             college: res.data.college || '',
             password: ''
          });
       }).catch(() => {});
    }
  }, [user]);


  const calculateRequiredFee = (reg) => {
    if (!reg) return 0;
    const category = reg.personalDetails?.category || reg.userId?.category;
    let total = CONFERENCE_TRACKS.find(t => t.id === reg.paperDetails?.track) ? (CATEGORY_AMOUNTS[category] || 1000) : 0;
    
    // In this system, one registration = one person/paper. 
    // If there are team members, we assume they are listed in teamMembers
    if (reg.teamMembers && reg.teamMembers.length > 0) {
      reg.teamMembers.forEach(member => {
        total += CATEGORY_AMOUNTS[member.category] || 1000;
      });
    }
    return total;
  };

  const calculatePortfolioBalance = (reg) => {
    if (!reg) return 0;
    let balance = 0;
    // Current paper
    if (reg.status === 'Accepted' && reg.paymentStatus !== 'Completed') {
      balance += calculateRequiredFee(reg);
    }
    // Associated papers (if any are returned in verification)
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get('/api/notifications', config);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put(`/api/notifications/${id}/read`, {}, config);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put('/api/notifications/read-all', {}, config);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleNotificationAction = (notification) => {
    if (!notification.link) return;

    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    if (notification.link.includes('paperId=')) {
      const paperId = notification.link.split('paperId=')[1];
      setActiveTab('submissions');
      setSearch(paperId); // Search for the specific ID
      
      const reg = registrations.find(r => r._id === paperId);
      if (reg) {
        setSelectedReg(reg);
      }
    } else {
      setActiveTab('submissions');
    }
  };

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const [regRes, revRes, notifRes] = await Promise.all([
        axios.get('/api/registrations', config),
        axios.get('/api/auth/users', config).then(res => res.data.filter(u => u.role === 'reviewer')),
        axios.get('/api/notifications', config)
      ]);
      setRegistrations(regRes.data);
      setReviewers(revRes);
      setNotifications(notifRes.data);
    } catch (error) {
      toast.error("Failed to sync dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    const loadingToast = toast.loading("Updating profile...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put('/api/auth/profile', profileData, config);
      toast.success("Profile updated successfully", { id: loadingToast });
      setProfileData({ ...profileData, password: '' });
    } catch (error) {
      toast.error("Failed to update profile", { id: loadingToast });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleVerifyQR = async (decodedText) => {
    if (isVerifying) return;
    setIsVerifying(true);
    const loadingToast = toast.loading("Verifying Identity...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get(`/api/registrations/verify/${decodedText}`, config);
      setScannedResult(data);
      toast.success("Identity Verified & Attendance Logged", { id: loadingToast });
      fetchData();
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
      setIsVerifying(false);
    }
  };

  const exportToExcel = async () => {
    const loadingToast = toast.loading("Preparing Excel workbook...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get('/api/settings/export', config);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registrations");
      XLSX.writeFile(wb, `CIETM_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel file downloaded successfully", { id: loadingToast });
    } catch (error) {
      toast.error("Excel export failed", { id: loadingToast });
    }
  };

  const handleReuploadAction = async (id, action) => {
    try {
      await axios.put(`/api/registrations/${id}/reupload-request`, { action }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(`Request ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error("Failed to process request");
    }
  };

  const handleManualPaymentConfirm = async (reg) => {
    if (!manualPaymentAmount || manualPaymentAmount <= 0) return toast.error("Please enter a valid amount");
    const confirmText = prompt(`Type "COLLECTED" to confirm offline collection of ₹${manualPaymentAmount}:`);
    if (confirmText !== "COLLECTED") return;

    const loadingToast = toast.loading("Recording offline payment...");
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.post(`/api/payments/manual-verify/${reg._id}`, { amount: manualPaymentAmount }, config);
      toast.success("Payment recorded. Entry verified!", { id: loadingToast });
      setScannedResult(null);
      if (selectedReg?._id === reg._id) {
        setSelectedReg({ ...selectedReg, paymentStatus: 'Completed', attended: true });
      }
      setManualPaymentAmount('');
      fetchData();
    } catch (error) {
      toast.error("Offline payment recording failed", { id: loadingToast });
    }
  };

  const handleReview = async (id, status = null) => {
    if (!status) {
      status = prompt("Update status to: 'Under Review', 'Accepted', 'Rejected'?");
      if (!['Under Review', 'Accepted', 'Rejected'].includes(status)) return toast.error("Invalid status");
    }

    const remarks = prompt(`Enter reviewer comments for ${status}:`);
    if (remarks === null) return;

    const loadingToast = toast.loading(`Updating status to ${status}...`);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put(`/api/registrations/${id}/review`, { status, remarks }, config);
      toast.success(`Submission updated to ${status}`, { id: loadingToast });
      fetchData();
      if (selectedReg?._id === id) {
        setSelectedReg({ ...selectedReg, status });
      }
    } catch (error) {
      toast.error("Review action failed", { id: loadingToast });
    }
  };

  const handleToggleAttendance = async (reg) => {
    const newStatus = !reg.attended;
    try {
      await axios.put(`/api/registrations/${reg._id}/status`, { attended: newStatus }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(`Participant marked as ${newStatus ? 'Present' : 'Absent'}`);
      fetchData();
      if (selectedReg && selectedReg._id === reg._id) {
        setSelectedReg(prev => ({ ...prev, attended: newStatus, attendedAt: newStatus ? Date.now() : null }));
      }
    } catch (error) {
      toast.error("Failed to update attendance");
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
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Auto-assignment failed", { id: loadingToast });
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleUpdateReviewerTracks = async (reviewerId, tracks) => {
    try {
      await axios.put(`/api/auth/users/${reviewerId}/tracks`, { tracks }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success("Reviewer expertise updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update reviewer tracks");
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
      fetchData();
      if (selectedReg && selectedReg._id === id) {
        setSelectedReg(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete submission", { id: loadingToast });
    }
  };

  const filteredData = useMemo(() => {
    return registrations.filter(reg => {
      const matchesFilter = filter === 'All' || reg.status === filter;
      const authorName = reg.personalDetails?.name || reg.userId?.name || '';
      const paperTitle = reg.paperDetails?.title || '';
      const paperId = reg.paperId || (reg.authorId || `#PAPER-${reg._id.slice(-6).toUpperCase()}`);
      const delegateId = reg.userId?.delegateId || '';
      const matchesSearch = authorName.toLowerCase().includes(search.toLowerCase()) ||
        paperTitle.toLowerCase().includes(search.toLowerCase()) ||
        paperId.toLowerCase().includes(search.toLowerCase()) ||
        delegateId.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [registrations, filter, search]);

  const uniquePapersCount = useMemo(() => {
    return new Set(filteredData.map(r => r.paperDetails?.title?.toLowerCase()?.trim()).filter(Boolean)).size;
  }, [filteredData]);


  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[65] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-[70] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tighter text-slate-800 leading-none">CIETM</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Chair / Editor</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-xl transition-all">
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Monitor Board', icon: LayoutDashboard },
              { id: 'submissions', label: 'Paper Submissions', icon: FileCheck },
              { id: 'reviewers', label: 'Reviewer Board', icon: Users },
              { id: 'notifications', label: 'Inbox', icon: Bell, count: notifications.filter(n => !n.isRead).length },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all relative ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
              >
                <item.icon size={18} />
                {item.label}
                {item.count > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs overflow-hidden shadow-inner">
                {(() => {
                  const regWithPic = registrations.find(r => (r.userId?._id || r.userId) === user?._id);
                  return regWithPic?.personalDetails?.profilePicture ? (
                    <img src={regWithPic.personalDetails.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : user?.name?.charAt(0);
                })()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-800 truncate">{user?.name}</p>
                <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{user?.role} portal</p>
              </div>
            </div>
            <Link to="/" className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <Home size={12} /> Exit to Site
            </Link>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold mt-2 hover:bg-red-100 transition-all uppercase tracking-widest"
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-40">
           <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"><Menu size={20} /></button>
            <h1 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3">
             {refreshing && <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>}
             <button onClick={fetchData} className="p-2.5 md:px-4 md:py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2" title="Force Sync">
               <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : ''}`} /> 
               <span className="hidden sm:inline">Force Sync</span>
             </button>
             <button title="Export to Excel" onClick={exportToExcel} className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
               <Download size={18} className="text-blue-600" />
               <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline text-slate-600">Export XLSX</span>
             </button>
             <button
                title="Download All Manuscripts (ZIP)"
                onClick={() => {
                  const toastId = toast.loading("Generating bulk manuscripts archive...");
                  const downloadUrl = `/api/registrations/download-all?token=${user.token}`;
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.setAttribute('download', '');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => {
                    toast.dismiss(toastId);
                    fetchData();
                  }, 4000);
                }}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
             >
                <Download size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Download ZIP</span>
             </button>
            <button
              onClick={logout}
              className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-all shadow-sm flex items-center gap-2"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* KPI Section */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-indigo-50/50 rounded-bl-[40px] md:rounded-bl-[60px] -z-0 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-2">
                       <Layers size={12} className="text-indigo-600" /> <span className="truncate">Intake Velocity</span>
                    </p>
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">{filteredData.length}</p>
                      <span className="text-[8px] md:text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded-full">+12%</span>
                    </div>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-wide truncate">Total Active Manuscripts</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-emerald-50/50 rounded-bl-[40px] md:rounded-bl-[60px] -z-0 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-2">
                       <CheckCircle size={12} className="text-emerald-600" /> <span className="truncate">Completion Rate</span>
                    </p>
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">
                        {Math.round((filteredData.filter(r => r.status === 'Accepted').length / (filteredData.length || 1)) * 100)}%
                      </p>
                      <span className="text-[8px] md:text-[10px] font-bold text-slate-400 hidden sm:inline">{filteredData.filter(r => r.status === 'Accepted').length} Finalized</span>
                    </div>
                    <div className="mt-2 md:mt-3 h-1 md:h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(filteredData.filter(r => r.status === 'Accepted').length / (filteredData.length || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-amber-50/50 rounded-bl-[40px] md:rounded-bl-[60px] -z-0 transition-transform group-hover:scale-110"></div>
                   <div className="relative z-10">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-2">
                       <Clock size={12} className="text-amber-500" /> <span className="truncate">Evaluation Pulse</span>
                    </p>
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">
                         {filteredData.filter(r => r.status === 'Under Review').length}
                      </p>
                      <span className="text-[8px] md:text-[10px] font-bold text-amber-500 truncate">Active Review</span>
                    </div>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-wide truncate">Papers currently with board</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-blue-50/50 rounded-bl-[40px] md:rounded-bl-[60px] -z-0 transition-transform group-hover:scale-110"></div>
                   <div className="relative z-10">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-2">
                       <Users size={12} className="text-blue-600" /> <span className="truncate">Assign Queue</span>
                    </p>
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">
                         {filteredData.filter(r => r.status === 'Submitted' && !r.paperDetails?.assignedReviewer).length}
                      </p>
                      <span className="text-[8px] md:text-[10px] font-bold text-blue-500 truncate">Unassigned</span>
                    </div>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-wide truncate">Action needed</p>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Track Breakdown Container */}
                 <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                       <div>
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Track Distribution</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Submission volume across domains</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => setActiveTab('submissions')} className="px-4 py-2 bg-slate-50 text-[10px] font-black uppercase text-slate-500 rounded-xl hover:bg-slate-100 transition-all border border-slate-100">Details</button>
                       </div>
                    </div>

                    <div className="space-y-5">
                        {CONFERENCE_TRACKS.map((track, idx) => {
                          const trackPapers = filteredData.filter(r => r.paperDetails?.track === track.id);
                          const count = trackPapers.length;
                          const percentage = Math.round((count / (filteredData.length || 1)) * 100);
                          return (
                             <div key={track.id} className="group cursor-default">
                                <div className="flex justify-between items-end mb-2 gap-4">
                                   <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">0{idx + 1}</div>
                                      <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight truncate">{track.label.split(': ')[1]}</p>
                                   </div>
                                   <div className="text-right shrink-0">
                                      <span className="text-[11px] font-black text-slate-800">{count}</span>
                                      <span className="text-[9px] font-bold text-slate-400 ml-1">Papers</span>
                                   </div>
                                </div>
                                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                   <motion.div 
                                     initial={{ width: 0 }} 
                                     animate={{ width: `${percentage}%` }} 
                                     transition={{ duration: 1, delay: idx * 0.1 }}
                                     className={`h-full rounded-full ${percentage > 40 ? 'bg-indigo-600' : 'bg-indigo-400'}`}
                                   ></motion.div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>

                 {/* Review Board Status - Replaced Financial Card */}
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <TrendingUp size={16} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Board Pulse</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live reviewer activity</p>
                       </div>
                    </div>

                    <div className="space-y-6 flex-1">
                       <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-emerald-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                             <CheckCircle size={10} className="text-emerald-500" /> Evaluations Logged
                          </p>
                          <p className="text-2xl font-black text-slate-800 tracking-tight">
                             {filteredData.filter(r => r.paperDetails?.reviewerComments).length}
                          </p>
                       </div>

                       <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                             <Users size={10} className="text-indigo-500" /> Expertise Cover
                          </p>
                          <div className="flex items-center justify-between">
                             <p className="text-2xl font-black text-slate-800 tracking-tight">
                                {Math.round((reviewers.filter(rev => (rev.assignedTracks || []).length > 0).length / (reviewers.length || 1)) * 100)}%
                             </p>
                             <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                   className="h-full bg-indigo-500 rounded-full" 
                                   style={{ width: `${(reviewers.filter(rev => (rev.assignedTracks || []).length > 0).length / (reviewers.length || 1)) * 100}%` }}
                                ></div>
                             </div>
                          </div>
                       </div>

                       <div className="p-5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">System Health</p>
                          <div className="flex items-center justify-between">
                             <p className="text-sm font-black">Sync Stable</p>
                             <span className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-white/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> LIVE
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'submissions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-row items-center gap-2 w-full">
                {/* Search Section */}
                <div className="relative flex-1 group min-w-0">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                  <input
                    type="text"
                    placeholder="Search submissions..."
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
                                        {reg.paperId || (reg.authorId || `#PAPER-${reg._id.slice(-6).toUpperCase()}`)}
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
                              <div className="flex items-center justify-center gap-3">
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
                                             setTimeout(fetchData, 2000);
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
                    <div className="py-24 text-center">
                       <AlertCircle size={48} className="mx-auto mb-4 text-slate-200" />
                       <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">No submissions found</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'entry' && (
            <motion.div
               key="entry"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               className="max-w-4xl mx-auto"
             >
                 {/* Simplified Protocol Control */}
                 <div className="flex justify-center mb-8">
                   <button
                     onClick={() => setIsScannerModalOpen(true)}
                     className="group px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3"
                   >
                     <ScanLine size={16} />
                     Initiate Protocol
                   </button>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[450px] relative">
                   {!scannedResult ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-16 text-center min-h-[450px]">
                        <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mb-6 opacity-40">
                             <Lock size={28} className="text-slate-200" />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">System Offline</h4>
                     </div>
                   ) : (
                     <div className="flex flex-col md:flex-row animate-fade-in">
                        {/* Profile Summary Sidebar */}
                        <div className="md:w-[240px] bg-slate-50/50 border-r border-slate-100 p-8 flex flex-col items-center text-center">
                           <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl uppercase border-4 border-white mb-4 animate-scale-in ${scannedResult.paymentStatus === 'Completed' ? 'bg-indigo-600' : 'bg-red-600'} text-white`}>
                              {scannedResult.personalDetails?.profilePicture ? (
                                <img src={scannedResult.personalDetails.profilePicture} alt="" className="w-full h-full object-cover rounded-2xl" />
                              ) : scannedResult.personalDetails?.name?.charAt(0)}
                           </div>
                           <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">{scannedResult.personalDetails?.name}</h4>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">{scannedResult.personalDetails?.institution || 'Academic Delegate'}</p>
                           
                           <div className="w-full pt-6 border-t border-slate-100">
                              <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${scannedResult.paymentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                 {scannedResult.paymentStatus === 'Completed' ? 'Verified' : 'Pending'}
                              </span>
                           </div>
                        </div>

                        {/* Detailed Authorization Area */}
                        <div className="flex-1 p-8 space-y-5">
                           <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Delegation</p>
                                 <p className="text-[10px] font-black text-slate-700 uppercase truncate">{scannedResult.personalDetails?.category}</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Protocol</p>
                                 <p className="text-[10px] font-black text-indigo-600 uppercase">GATE_2026</p>
                              </div>
                           </div>

                           <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm relative overflow-hidden flex items-center justify-between">
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${scannedResult.paymentStatus === 'Completed' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              <div className="min-w-0 flex-1 ml-2">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Finance</p>
                                 <p className={`text-xl font-black ${scannedResult.paymentStatus === 'Completed' ? 'text-emerald-700' : 'text-red-700'}`}>{scannedResult.paymentStatus}</p>
                                 {scannedResult.paperDetails?.title && (
                                   <p className="text-[9px] font-bold text-slate-400 italic mt-1 line-clamp-1 opacity-60">"{scannedResult.paperDetails.title}"</p>
                                 )}
                              </div>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-4 ${scannedResult.paymentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                 <IndianRupee size={20} />
                              </div>
                           </div>

                           {/* Action Bar */}
                           {scannedResult.paymentStatus !== 'Completed' ? (
                               <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl">
                                  <div className="flex justify-between items-center mb-3">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fees Due</p>
                                     <h5 className="text-xl font-black font-mono">₹{calculateRequiredFee(scannedResult)}</h5>
                                  </div>
                                  <div className="flex gap-2">
                                     <input
                                        type="number"
                                        placeholder="Amount"
                                        value={manualPaymentAmount || calculateRequiredFee(scannedResult)}
                                        onChange={(e) => setManualPaymentAmount(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-black text-white focus:outline-none focus:border-indigo-500 text-sm"
                                     />
                                     <button
                                        onClick={() => handleManualPaymentConfirm(scannedResult)}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95"
                                     >
                                        Authorize
                                     </button>
                                  </div>
                               </div>
                           ) : (
                               <div className="bg-emerald-600 rounded-3xl p-6 text-white flex items-center gap-5 relative overflow-hidden shadow-lg shadow-emerald-50">
                                  <ShieldCheck size={24} />
                                  <span className="text-xs font-black uppercase tracking-widest">Full Access Granted</span>
                               </div>
                           )}

                           <button 
                             onClick={() => setScannedResult(null)}
                             className="w-full py-2 text-[8px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-all border-t border-slate-50 mt-2"
                           >
                             Reset Terminal
                           </button>
                        </div>
                     </div>
                   )}
                 </div>

                 {/* Protocol Scanner Portal */}
                 <AnimatePresence>
                   {isScannerModalOpen && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                          onClick={() => setIsScannerModalOpen(false)}
                        />
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0, y: 10 }} 
                          animate={{ scale: 1, opacity: 1, y: 0 }} 
                          exit={{ scale: 0.95, opacity: 0, y: 10 }}
                          className="relative bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200"
                        >
                           <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Protocol Sync</h3>
                              <button 
                                onClick={() => setIsScannerModalOpen(false)} 
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                              >
                                <X size={20} />
                              </button>
                           </div>
                           
                           <div className="p-6">
                              <div className="qr-scanner-modal-wrapper overflow-hidden rounded-2xl border-2 border-slate-100 bg-black min-h-[240px]">
                                 <QRScanner onScan={handleVerifyQR} />
                              </div>
                              <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase text-center tracking-widest">
                                 Awaiting QR Input
                              </p>
                           </div>
                        </motion.div>
                     </div>
                   )}
                 </AnimatePresence>
             </motion.div>
          )}

          {activeTab === 'updates' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-8">Pending Re-upload Requests</h2>
              {registrations.filter(r => r.paperDetails?.reuploadRequestStatus === 'Pending').length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center opacity-70">
                   <CheckCircle size={48} className="text-indigo-600 mx-auto mb-4" />
                   <p className="text-sm font-black text-slate-500 uppercase tracking-widest">All requests processed!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {registrations.filter(r => r.paperDetails?.reuploadRequestStatus === 'Pending').map(reg => (
                    <div key={reg._id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="text-left flex-1 min-w-0">
                         <h4 className="font-black text-slate-800 leading-tight truncate">{reg.paperDetails?.title || 'Untitled'}</h4>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Author: {reg.personalDetails?.name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                         <button onClick={() => handleReuploadAction(reg._id, 'Reject')} className="px-6 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">Deny</button>
                         <button onClick={() => handleReuploadAction(reg._id, 'Approve')} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
             <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                   <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-black text-slate-800">Reviewer Panel</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage faculty expertise for track assignments</p>
                      </div>
                      <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em]">
                        {reviewers.length} Active Reviewers
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                         <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reviewer</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Load</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialized Tracks</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {reviewers.map(rev => (
                               <tr key={rev._id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-8 py-5">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shadow-inner border border-slate-200">
                                           {(() => {
                                             const regWithPic = registrations.find(r => (r.userId?._id || r.userId) === rev._id);
                                             return regWithPic?.personalDetails?.profilePicture ? (
                                               <img src={regWithPic.personalDetails.profilePicture} alt="" className="w-full h-full object-cover" />
                                             ) : rev.name.charAt(0);
                                           })()}
                                         </div>
                                        <div>
                                           <div className="text-sm font-black text-slate-800 leading-none">{rev.name}</div>
                                           <div className="text-[10px] font-bold text-slate-400 mt-1">{rev.email}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                     <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                                       registrations.filter(r => r.paperDetails?.assignedReviewer?._id === rev._id).length > 0 
                                         ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                         : 'bg-slate-50 text-slate-400 border border-slate-100'
                                     }`}>
                                       {registrations.filter(r => r.paperDetails?.assignedReviewer?._id === rev._id).length} Papers
                                     </span>
                                  </td>
                                  <td className="px-8 py-5">
                                     <div className="flex flex-wrap gap-1.5">
                                        {(rev.assignedTracks || []).length > 0 ? (
                                           rev.assignedTracks.map(t => (
                                              <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-indigo-100/50">{t}</span>
                                           ))
                                        ) : (
                                           <span className="text-[10px] font-bold text-slate-300 italic uppercase">No tracks assigned</span>
                                        )}
                                     </div>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                     <button 
                                       onClick={() => {
                                         setTrackTargetUser(rev);
                                         setSelectedTracks(rev.assignedTracks || []);
                                         setIsTrackModalOpen(true);
                                       }}
                                       className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                     >
                                        <ShieldCheck size={12} /> Update Expertise
                                     </button>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                      {reviewers.length === 0 && (
                        <div className="py-20 text-center opacity-30">
                          <Users size={32} className="mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase">No reviewers found in faculty board</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Notification Center</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management updates & alerts</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                  <button onClick={handleMarkAllAsRead} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all">Mark all as read</button>
                )}
              </div>

              {notificationsLoading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching alerts...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                      className={`group p-6 rounded-[2rem] border transition-all relative overflow-hidden ${n.isRead ? 'bg-white border-slate-100' : 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50'}`}
                    >
                      {!n.isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>}
                      <div className="flex gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                          n.type === 'success' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                          n.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
                          n.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                          'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                          <Bell size={24} className={!n.isRead ? 'animate-bounce' : ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <h4 className="font-black text-slate-800 truncate text-lg">{n.title}</h4>
                            {!n.isRead && (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-full tracking-tighter">New</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-4">{n.message}</p>
                          <div className="flex items-center gap-4">
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock size={12} /> {new Date(n.createdAt).toLocaleString()}
                             </span>
                             {n.link?.includes('paperId=') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationAction(n);
                                  }} 
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                  View Submission <ChevronRight size={10} />
                                </button>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-6">
                    <Bell size={40} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Your inbox is empty</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Check back later for management updates</p>
                </div>
              )}
            </div>
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

            {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-8 pb-10">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-0"></div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                   <Settings className="text-indigo-600" /> Account Profile
                </h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6 relative z-10">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Chair Name</label>
                     <input
                       type="text"
                       value={profileData.name}
                       onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                       className="w-full bg-slate-50 border border-slate-100 p-3.5 md:p-4 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                       required
                     />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Department</label>
                        <input
                          type="text"
                          value={profileData.department}
                          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-3.5 md:p-4 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. Mechanical Engineering"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">College/Institution</label>
                        <input
                          type="text"
                          value={profileData.college}
                          onChange={(e) => setProfileData({ ...profileData, college: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-3.5 md:p-4 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. CIET"
                        />
                      </div>
                   </div>
                   <div className="pt-4 border-t border-slate-100">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Change Password</label>
                     <input
                       type="password"
                       placeholder="Leave empty to keep current"
                       value={profileData.password}
                       onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                       className="w-full bg-slate-50 border border-slate-100 p-3.5 md:p-4 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                     />
                     <p className="text-[10px] font-bold text-slate-400 mt-2 px-1">You will be required to sign in again if you change your password.</p>
                   </div>
                   <div className="pt-6">
                     <button
                       disabled={updatingProfile}
                       className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       <ShieldCheck size={16} />
                       {updatingProfile ? 'Applying Changes...' : 'Save Profile Settings'}
                     </button>
                   </div>
                </form>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* Expertise Management Modal */}
      <AnimatePresence>
        {isTrackModalOpen && trackTargetUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTrackModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Expertise Domains</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Reviewer: {trackTargetUser.name}</p>
                  </div>
                  <button onClick={() => setIsTrackModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
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
                        className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
                          isSelected ? 'bg-white border-white text-indigo-600' : 'bg-white border-slate-200 text-transparent'
                        }`}>
                          <CheckCircle size={14} strokeWidth={3} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-tight leading-none mb-1.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>0{CONFERENCE_TRACKS.indexOf(track) + 1}</p>
                          <p className="text-xs font-bold leading-tight line-clamp-2">{track.label.split(': ')[1]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsTrackModalOpen(false)}
                    className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateReviewerTracks(trackTargetUser._id, selectedTracks);
                      setIsTrackModalOpen(false);
                    }}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all"
                  >
                    Apply Expertise Board
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Registration Inspector Modal */}
      <AnimatePresence>
        {inspectorData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 overflow-hidden">
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
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Clock size={14} /> Submission Records
                         </h4>
                         <div className="space-y-2.5">
                            {/* Selected Primary Record */}
                            <div className="p-4 bg-slate-50 border-2 border-indigo-100 rounded-3xl group">
                                <div className="flex items-center justify-between mb-3">
                                   <p className="text-xs font-black text-slate-800 truncate pr-4">{inspectorData.paperDetails?.title || 'Selected Paper'}</p>
                                   <div className="flex items-center gap-2 shrink-0">
                                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 ${inspectorData.paymentStatus === 'Completed' ? 'bg-indigo-600 text-white' : 'bg-white text-amber-500'}`}>
                                         {inspectorData.paymentStatus === 'Completed' ? 'Paid' : 'Unpaid'}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white border border-emerald-500">
                                         {inspectorData.status}
                                      </span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[7px] font-black uppercase tracking-widest rounded border border-slate-200">Scanning Source</span>
                                   <span className="text-[8px] font-mono text-slate-500 font-black">#{inspectorData.paperId || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Other Papers */}
                            {inspectorData.otherPapers?.map((p, i) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-2.5 transition-all opacity-80 hover:opacity-100 hover:bg-slate-50/50">
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ChairDashboard;
