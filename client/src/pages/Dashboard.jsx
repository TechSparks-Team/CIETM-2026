import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, AlertCircle,
  Settings, Bell, Download, Menu, X, Search, ChevronRight, LogOut, FileBadge, Lock,
  LayoutDashboard, Calendar, MapPin, ShieldCheck, Award, Layers,
  Upload, Home, Edit2, Camera, User, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import RegistrationForm from '../components/RegistrationForm';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [settings, setSettings] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    }
  }, []);

  // Moved fetchRegistration outside useEffect to allow refreshing
  const fetchRegistration = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/registrations/my', {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      });
      setRegistration(data);
    } catch (error) {
      console.error("Failed to fetch registration", error);
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  // Payment Verification Logic
  useEffect(() => {
    const verifyPayment = async () => {
      const query = new URLSearchParams(location.search);
      const paymentId = query.get('payment_id'); // Cashfree sends order_id as payment_id in redirect
      // or we might need to check order_id based on how we constructed return_url
      // Our return_url: ...?payment_id={order_id}&payment_status={order_status}

      if (paymentId) {
        setPaymentLoading(true);
        try {
          // Verify with backend
          const { data } = await axios.post('/api/payments/verify', {
            orderId: paymentId
          }, {
            headers: { Authorization: `Bearer ${user?.token}` }
          });

          if (data.status === 'SUCCESS') {
            toast.success("Payment verified successfully!");
            fetchRegistration(); // Refresh status
          } else {
            toast.error("Payment verification failed or pending.");
          }
          // Clear URL params
          navigate('/dashboard', { replace: true });
        } catch (error) {
          console.error("Payment verification error", error);
          toast.error("Failed to verify payment.");
          navigate('/dashboard', { replace: true });
        } finally {
          setPaymentLoading(false);
        }
      }
    };

    if (location.search) {
      verifyPayment();
    }
  }, [location.search, user, navigate, fetchRegistration]);

  useEffect(() => {
    fetchRegistration();
    fetchNotifications();
    fetchSettings();
  }, [fetchRegistration, fetchNotifications, fetchSettings]);

  useEffect(() => {
    if (registration && ['Accepted', 'Rejected'].includes(registration.status) && activeTab === 'drafts') {
      setActiveTab('paper');
    }
  }, [registration, activeTab]);

  const handleDownload = () => {
    if (!registration) return;
    // Open the download route with token in query for authentication
    window.open(`/api/registrations/download/${registration._id}?token=${user.token}`, '_blank');
  };

  const handleRequestReupload = async () => {
    if (!registration) return;
    const confirmRequest = window.confirm("Are you sure you want to request a re-upload for this rejected manuscript? This will notify the admin.");
    if (!confirmRequest) return;

    try {
      await axios.post(`/api/registrations/${registration._id}/request-reupload`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Re-upload request sent successfully! An admin will review it soon.");
      fetchRegistration();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to request re-upload.");
      console.error("Request re-upload error", error);
    }
  };

  const handleFullPaperUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      return toast.error("Please upload a Word document (.doc or .docx)");
    }

    const confirmUpload = window.confirm("Are you sure you want to upload this full paper?");
    if (!confirmUpload) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('paper', file);

    try {
      // First upload to Cloudinary via server
      const { data: uploadRes } = await axios.post('/api/registrations/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user?.token}`
        }
      });

      // Then update the registration record with file details
      await axios.post('/api/registrations/update-paper', {
        fileUrl: uploadRes.url,
        publicId: uploadRes.publicId,
        resourceType: uploadRes.resourceType,
        originalName: uploadRes.originalName
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      toast.success("Full paper uploaded successfully!");
      fetchRegistration(); // Refresh registration data
    } catch (error) {
      toast.error("Paper upload failed. Please try again.");
      console.error("Upload error", error);
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setChangingPassword(true);
    try {
      await axios.put('/api/auth/update-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success("Password updated successfully!");
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All marked as read");
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handlePayment = async () => {
    if (!registration) return;
    setPaymentLoading(true);
    try {
      const { data } = await axios.post('/api/payments/init', {
        registrationId: registration._id
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      const cashfree = window.Cashfree({
        mode: import.meta.env.VITE_CASHFREE_MODE || "sandbox",
      });

      let checkoutOptions = {
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self", // Optional, defaults to _self
      };

      cashfree.checkout(checkoutOptions);

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Payment initialization failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'text-slate-500 bg-slate-100 border-slate-200';
      case 'Submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Under Review': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Accepted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Rejected': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-500 bg-slate-100 border-slate-200';
    }
  };

  const categoryAmounts = {
    'UG/PG STUDENTS': 500,
    'FACULTY/RESEARCH SCHOLARS': 750,
    'EXTERNAL / ONLINE PRESENTATION': 300,
    'INDUSTRY PERSONNEL': 900
  };

  const calculateCurrentFee = () => {
    if (!registration) return 0;
    let total = categoryAmounts[registration.personalDetails?.category] || 1000;
    if (registration.teamMembers && registration.teamMembers.length > 0) {
      registration.teamMembers.forEach(member => {
        total += categoryAmounts[member.category] || 1000;
      });
    }
    return total;
  };

  const currentFee = calculateCurrentFee();
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const renderBreadcrumbs = () => {
    const crumbs = [
      { label: 'Dashboard', tab: 'overview' },
      { label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1), tab: activeTab }
    ];

    if (activeTab === 'paper') crumbs[1].label = 'Submission';
    if (activeTab === 'drafts') crumbs[1].label = 'My Draft';
    if (activeTab === 'notifications') crumbs[1].label = 'Updates';

    return (
      <div className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.15em] text-slate-400">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span
              className={`cursor-pointer hover:text-indigo-600 transition-colors ${i === crumbs.length - 1 ? 'text-slate-800' : ''}`}
              onClick={() => setActiveTab(crumb.tab)}
            >
              {crumb.label}
            </span>
            {i < crumbs.length - 1 && <ChevronRight size={10} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Loading Dashboard...</p>
    </div>
  );

  const overviewContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
  };

  const overviewItemVariants = {
    hidden: { y: 25, opacity: 0, scale: 0.98 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 120, damping: 14 } }
  };

  const renderOverview = () => (
    <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible" className="space-y-6 relative">
      {/* Decorative background blurs inside the overview area */}
      <div className="absolute top-10 right-20 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none animate-float"></div>
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Header */}
      <motion.div variants={overviewItemVariants} className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-display">Overview</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Welcome back, <span className="text-indigo-600 font-bold">{user.name}</span>.</p>
        </div>
        <div className="flex gap-2">
          {!registration?.paperDetails?.fileUrl && registration?.status !== 'Accepted' && (
            <button onClick={() => setActiveTab('paper')} className="btn btn-primary px-5 py-2.5 text-xs shadow-indigo-200 hover:-translate-y-0.5 group">
              <Upload size={16} className="group-hover:animate-bounce-slow" /> Upload Paper
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Status Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Minimal Status Card */}
          <motion.div variants={overviewItemVariants} className={`rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/60 shadow-glass transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 group`}>
            <div className="absolute right-10 bottom-10 opacity-[0.03] rotate-12 group-hover:rotate-[24deg] transition-all duration-700 scale-[2.5] transform text-slate-800 pointer-events-none">
              {registration?.status === 'Accepted' ? <Award size={140} /> : <Layers size={140} />}
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm border ${registration?.status === 'Accepted' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    registration?.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                      (registration?.status === 'Submitted' && !registration.paperDetails?.fileUrl) ? 'bg-slate-50 text-slate-600 border-slate-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                    {registration?.status === 'Accepted' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {registration?.status === 'Submitted' && !registration?.paperDetails?.fileUrl ? 'Pending Upload' : (registration?.status || 'No Submission')}
                  </span>
                  <h2 className={`text-3xl md:text-5xl font-black tracking-tight leading-none ${registration?.status === 'Accepted' ? 'text-blue-600' :
                    registration?.status === 'Rejected' ? 'text-red-500' :
                      'text-slate-800'
                    }`}>
                    {registration?.status === 'Accepted' ? 'Paper Accepted!' :
                      registration?.status === 'Under Review' ? 'Under Review' :
                        (registration?.status === 'Submitted' && registration?.paperDetails?.fileUrl) ? 'Submission Received' :
                          'Pending Submission'}
                  </h2>
                </div>
                <div className="flex flex-col items-end hidden sm:flex bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tracking ID</p>
                  <p className="font-mono text-xl font-black text-slate-700 tracking-wider">#{registration?._id?.slice(-4).toUpperCase() || '----'}</p>
                </div>
              </div>

              {registration?.paperDetails?.reviewerComments && (
                <div className={`mt-2 mb-2 p-4 rounded-2xl border ${registration.status === 'Accepted' ? 'bg-blue-50/50 border-blue-100' : registration.status === 'Rejected' ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${registration.status === 'Accepted' ? 'text-blue-500' : registration.status === 'Rejected' ? 'text-red-500' : 'text-slate-400'}`}>
                    <FileText size={12} /> Admin Remarks
                  </h3>
                  <p className={`text-sm font-medium ${registration.status === 'Accepted' ? 'text-blue-800' : registration.status === 'Rejected' ? 'text-red-800' : 'text-slate-700'}`}>
                    {registration.paperDetails.reviewerComments}
                  </p>
                </div>
              )}

              <div>
                {/* Visual Progress Bar */}
                <div className="bg-slate-100 rounded-full h-2 w-full mb-4 overflow-hidden border border-slate-200 relative">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${registration?.status === 'Accepted' ? 'bg-blue-500' :
                      registration?.status === 'Rejected' ? 'bg-red-500' :
                        'bg-slate-800'
                      }`}
                    style={{
                      width: `${registration?.status === 'Accepted' || registration?.status === 'Rejected' ? '100%' :
                        registration?.paymentStatus === 'Completed' ? '100%' :
                          ['Under Review', 'Accepted', 'Rejected'].includes(registration?.paperDetails?.reviewStatus) ? '75%' :
                            registration?.paperDetails?.fileUrl ? '50%' :
                              registration?.paperDetails?.abstract ? '25%' : '5%'
                        }`
                    }}
                  >
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                  <span className={registration?.paperDetails?.abstract ? 'text-slate-800' : ''}>Draft</span>
                  <span className={registration?.paperDetails?.fileUrl ? 'text-slate-800' : ''}>Upload</span>
                  <span className={['Under Review', 'Accepted', 'Rejected'].includes(registration?.paperDetails?.reviewStatus) ? 'text-slate-800' : ''}>Review</span>
                  <span className={['Accepted', 'Rejected'].includes(registration?.status) ? (registration?.status === 'Accepted' ? 'text-blue-600' : 'text-red-500') : ''}>Decision</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Row */}
          <motion.div variants={overviewItemVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/60 backdrop-blur-2xl p-5 rounded-[2rem] border border-white/60 shadow-glass flex items-center sm:flex-col sm:items-start sm:justify-between gap-4 sm:gap-0 group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-indigo-400/20 transition-colors"></div>
              <div className="w-12 h-12 shrink-0 sm:mb-4 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner relative z-10">
                <Layers size={22} className="group-hover:animate-bounce-slow" />
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Assigned Track</span>
                <p className="text-sm font-black text-slate-800 truncate" title={registration?.paperDetails?.track}>{registration?.paperDetails?.track?.split(' ')[0] || 'Unassigned'}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/60 backdrop-blur-2xl p-5 rounded-[2rem] border border-white/60 shadow-glass flex items-center sm:flex-col sm:items-start sm:justify-between gap-4 sm:gap-0 group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-400/20 transition-colors"></div>
              <div className={`w-12 h-12 shrink-0 sm:mb-4 bg-gradient-to-br rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-transform shadow-inner relative z-10 ${registration?.paymentStatus === 'Completed' ? 'from-blue-50 to-cyan-50 text-blue-600' : 'from-amber-50 to-orange-50 text-amber-600'
                }`}>
                <CreditCard size={22} className="group-hover:animate-bounce-slow" />
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Fee Status</span>
                <p className={`text-sm font-black ${registration?.paymentStatus === 'Completed' ? 'text-blue-700' : 'text-slate-800'}`}>
                  {registration?.paymentStatus || 'Pending Payment'}
                </p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/60 backdrop-blur-2xl p-5 rounded-[2rem] border border-white/60 shadow-glass flex items-center sm:flex-col sm:items-start sm:justify-between gap-4 sm:gap-0 group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 sm:col-span-2 md:col-span-1 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-400/20 transition-colors"></div>
              <div className="w-12 h-12 shrink-0 sm:mb-4 bg-gradient-to-br from-purple-50 to-fuchsia-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-transform shadow-inner relative z-10">
                <Calendar size={22} className="group-hover:animate-bounce-slow" />
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Upcoming Deadline</span>
                <p className="text-sm font-bold text-slate-800">16 Mar 2026</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Deadlines List */}
          <motion.div variants={overviewItemVariants} className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm relative overflow-hidden group/timeline transition-all duration-500">
            <h3 className="text-sm font-extrabold text-slate-800 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50/80 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100/50">
                <Clock size={18} strokeWidth={2.5} />
              </div>
              Conference Timeline
            </h3>

            <div className="relative space-y-0 mt-2">
              {/* Vertical Connector Line */}
              <div className="absolute left-[20px] top-6 bottom-6 w-[2px] bg-slate-100"></div>

              {[
                { label: 'Abstract Submission', date: '2026-03-08' },
                { label: 'Full Paper Submission', date: '2026-03-16' },
                { label: 'Acceptance Notification', date: '2026-03-24' },
                { label: 'Registration Deadline', date: '2026-04-10' },
                { label: 'Conference Date', date: '2026-04-29' }
              ].map((item, i, arr) => {
                const now = new Date();
                const isPast = (dateStr) => {
                  const d = new Date(dateStr);
                  d.setHours(23, 59, 59, 999);
                  return now > d;
                };

                let currentActiveIndex = 0;
                if (isPast('2026-03-08')) currentActiveIndex = 1;
                if (isPast('2026-03-16')) currentActiveIndex = 2;
                if (isPast('2026-03-24')) currentActiveIndex = 3;
                if (isPast('2026-04-10')) currentActiveIndex = 4;
                if (isPast('2026-04-29')) currentActiveIndex = 5;

                const done = i < currentActiveIndex;
                const active = i === currentActiveIndex;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                    viewport={{ once: true }}
                    className="relative flex items-center justify-between py-5 group/item cursor-default bg-white z-10"
                  >
                    <div className="flex items-center gap-5 bg-white pr-4">
                      {/* Status Icon Column */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-20 shrink-0 ${done ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 ring-4 ring-white' :
                        active ? 'bg-white border-2 border-indigo-500 text-indigo-600 shadow-sm ring-4 ring-white' :
                          'bg-white border-2 border-slate-100 text-slate-300 ring-4 ring-white'
                        }`}>
                        {done ? <CheckCircle size={18} strokeWidth={2.5} /> :
                          active ? <Clock size={16} strokeWidth={2.5} /> :
                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>}
                      </div>

                      <div className="flex flex-col">
                        <span className={`text-sm tracking-tight transition-colors ${active ? 'text-indigo-600 font-bold' :
                          done ? 'text-slate-400 font-semibold line-through decoration-slate-300' : 'text-slate-600 font-semibold'
                          }`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 md:hidden uppercase tracking-widest mt-0.5">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white pl-4 relative z-10">
                      <span className={`hidden md:flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${active ? 'bg-indigo-50 border border-indigo-200/50 text-indigo-600' :
                        done ? 'bg-slate-50 text-slate-400 border border-slate-100/50' :
                          'bg-white border border-slate-100 text-slate-400'
                        }`}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Next Action Card */}
          <motion.div variants={overviewItemVariants} whileHover={{ y: -5 }} className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-6 md:p-8 shadow-glass relative overflow-hidden group transition-all duration-500">
            <h3 className="text-[10px] font-black text-indigo-500 bg-indigo-50/50 py-1.5 px-3 rounded-xl uppercase tracking-[0.2em] mb-6 text-center relative z-10 border border-indigo-100/50 inline-block w-full">Action Required</h3>

            {/* Background Pattern */}
            <div className="absolute -right-10 -top-10 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-45 pointer-events-none text-indigo-900 drop-shadow-2xl">
              {registration?.paymentStatus === 'Completed' ? <ShieldCheck size={180} /> :
                registration?.status === 'Accepted' ? <CreditCard size={180} /> :
                  registration?.paperDetails?.fileUrl ? <Clock size={180} /> :
                    <Upload size={180} />}
            </div>

            <div className="flex flex-col items-center text-center space-y-5 relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-1 shadow-inner group-hover:-translate-y-1 transition-transform ${registration?.paymentStatus === 'Completed' ? 'bg-gradient-to-br from-blue-100 to-cyan-50 text-blue-600' :
                registration?.status === 'Accepted' ? 'bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-600 animate-bounce-slow' :
                  registration?.paperDetails?.fileUrl ? 'bg-gradient-to-br from-slate-100 to-gray-50 text-slate-500' :
                    'bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-600 animate-bounce-slow'
                }`}>
                {registration?.paymentStatus === 'Completed' ? <ShieldCheck size={32} /> :
                  registration?.status === 'Accepted' ? <CreditCard size={32} /> :
                    registration?.paperDetails?.fileUrl ? <Clock size={32} /> :
                      <Upload size={32} />}
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-lg mb-1 drop-shadow-sm">
                  {registration?.paymentStatus === 'Completed' ? 'You\'re All Set!' :
                    registration?.status === 'Accepted' ? 'Complete Registration' :
                      registration?.paperDetails?.fileUrl ? 'Awaiting Review' :
                        'Upload Full Paper'}
                </h4>
                <p className="text-xs text-slate-500 font-medium px-4">
                  {registration?.paymentStatus === 'Completed' ? 'Access your digital ID below.' :
                    registration?.status === 'Accepted' ? 'Secure your spot by paying the fee.' :
                      registration?.paperDetails?.fileUrl ? 'Your paper is currently under evaluation.' :
                        'Please upload your document.'}
                </p>
              </div>

              {registration?.paymentStatus !== 'Completed' && (
                <button
                  onClick={() => {
                    if (registration?.status === 'Accepted') {
                      setActiveTab('payment');
                      const scrollTarget = document.querySelector('.overflow-y-auto') || window;
                      scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      setActiveTab('paper');
                      const scrollTarget = document.querySelector('.overflow-y-auto') || window;
                      scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}

                  className="w-full btn btn-primary py-3 text-xs shadow-indigo-500/30 hover:shadow-indigo-500/50 mt-2 hover:-translate-y-0.5"
                >
                  {registration?.status === 'Accepted' ? 'Pay Now' :
                    registration?.paperDetails?.fileUrl ? 'View Submission' : 'Upload Now'}
                </button>
              )}
            </div>
          </motion.div>

          {/* ID Card / Verification */}
          <motion.div variants={overviewItemVariants} className={`rounded-[2.5rem] p-6 md:p-8 border relative overflow-hidden transition-all duration-500 ${registration?.paymentStatus === 'Completed' ? 'bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-500/30 shadow-2xl shadow-indigo-900/50 hover:shadow-indigo-900/70' : 'bg-white/60 backdrop-blur-2xl border-white/60 text-slate-400 shadow-glass'} group hover:-translate-y-1`}>
            {/* Background Icon */}
            <div className={`absolute -right-6 -bottom-6 opacity-[0.05] rotate-12 transition-transform duration-700 group-hover:scale-125 ${registration?.paymentStatus === 'Completed' ? 'text-indigo-400' : 'text-slate-900'}`}>
              {registration?.paymentStatus === 'Completed' ? <ShieldCheck size={140} /> : <ShieldCheck size={140} />}
            </div>

            {registration?.paymentStatus === 'Completed' && (
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
            )}

            <div className="flex items-center justify-between mb-6 relative z-10">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-blue-400`}>Digital Pass</span>
              <div className={`p-2 rounded-lg bg-white/10`}>
                <ShieldCheck size={18} className="text-blue-400" />
              </div>
            </div>
            <div className="mb-8 relative z-10">
              <p className="text-3xl font-black tracking-tight mb-1 drop-shadow-sm">
                ADMIT ONE
              </p>
              <p className={`text-xs font-semibold text-slate-400`}>Authorize Entry</p>
            </div>
            <button
              onClick={() => setShowIDCard(true)}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 relative z-10 bg-white text-slate-900 hover:bg-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
            >
              View ID Card
            </button>
          </motion.div>

          {/* Author Guidelines Card (Full Content) */}
          <motion.div variants={overviewItemVariants} whileHover={{ y: -5 }} className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-6 md:p-8 shadow-glass relative overflow-hidden group hover:border-indigo-100/60 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="absolute -top-10 -right-10 text-slate-900 opacity-[0.02] group-hover:opacity-[0.04] transition-all duration-700 rotate-12 group-hover:rotate-45 group-hover:scale-125 pointer-events-none drop-shadow-xl">
              <FileText size={200} />
            </div>

            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] leading-tight flex-1">Author<br />Guidelines</h3>
            </div>

            <div className="space-y-5 relative z-10">
              <ul className="space-y-4">
                <li className="flex gap-4 text-xs text-slate-600 font-medium leading-relaxed">
                  <CheckCircle className="text-blue-500 shrink-0 mt-0.5 shadow-sm rounded-full bg-blue-50" size={16} />
                  <span>Original work not published elsewhere and must follow IEEE formatting.</span>
                </li>
                <li className="flex gap-4 text-xs text-slate-600 font-medium leading-relaxed">
                  <CheckCircle className="text-blue-500 shrink-0 mt-0.5 shadow-sm rounded-full bg-blue-50" size={16} />
                  <span>Max 6 pages allowed with strict double-blind peer review.</span>
                </li>
                <li className="flex gap-4 text-xs text-slate-600 font-medium leading-relaxed">
                  <CheckCircle className="text-blue-500 shrink-0 mt-0.5 shadow-sm rounded-full bg-blue-50" size={16} />
                  <span>Plagiarism must be under 15% for evaluation.</span>
                </li>
              </ul>

              <a
                href="https://www.ieee.org/content/dam/ieee-org/ieee/web/org/conferences/Conference-template-A4.doc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-sm"
              >
                <Download size={16} /> Download Template
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  const getInitialStep = () => {
    if (!registration) return 2;
    // Step 2: Personal Details
    if (!registration.personalDetails?.institution || !registration.personalDetails?.department) return 2;
    // Step 4: Paper Details (Step 3 is optional)
    if (!registration.paperDetails?.title || !registration.paperDetails?.abstract) return 4;
    // Step 5: Review
    return 5;
  };

  const renderSubmissionTab = () => {
    const isMissingDetails = registration && (!registration.personalDetails?.institution || !registration.paperDetails?.abstract);

    if (!registration || registration.status === 'Draft' || !registration.status || isMissingDetails) {
      return (
        <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible">
          <motion.div variants={overviewItemVariants} className="bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-glass border border-white/60 max-w-5xl mx-auto relative cursor-default overflow-hidden">
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-center mb-8 border-b border-indigo-100/50 pb-6 relative z-10">
              <h2 className="text-3xl font-bold text-slate-800">
                {registration && (registration.status === 'Draft' || isMissingDetails) ? 'Continue Submission' : 'Start Submission'}
              </h2>
            </div>
            {isMissingDetails && registration?.status !== 'Draft' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <p className="text-sm font-semibold text-amber-800">Please complete all required registration details before proceeding to upload your manuscript.</p>
              </div>
            )}
            <RegistrationForm
              startStep={getInitialStep()}
              showAccountCreation={false}
              onSuccess={() => {
                fetchRegistration();
                toast.success("Submission Completed!");
              }}
            />
          </motion.div>
        </motion.div>
      );
    }
    return renderMyPaper();
  };


  const renderMyPaper = () => {
    const handleEditDetails = () => {
      setEditData({
        title: registration?.paperDetails?.title || '',
        abstract: registration?.paperDetails?.abstract || '',
        mobile: registration?.personalDetails?.mobile || user?.phone || '',
        institution: registration?.personalDetails?.institution || '',
        department: registration?.personalDetails?.department || '',
        areaOfSpecialization: registration?.personalDetails?.areaOfSpecialization || '',
        category: registration?.personalDetails?.category || 'UG/PG STUDENTS',
        yearOfStudy: registration?.personalDetails?.yearOfStudy || '',
        designation: registration?.personalDetails?.designation || '',
        track: registration?.paperDetails?.track || 'CIDT',
        profilePicture: registration?.personalDetails?.profilePicture || '',
        teamMembers: registration?.teamMembers ? JSON.parse(JSON.stringify(registration.teamMembers)) : [],
        keywords: registration?.paperDetails?.keywords?.join(', ') || ''
      });
    };

    const handleSaveDetails = async () => {
      // Basic core validation
      if (!editData.title?.trim() || !editData.abstract?.trim() || !editData.keywords?.trim()) {
        return toast.error("Paper title, abstract, and keywords are required!");
      }
      if (!editData.mobile?.trim() || !editData.institution?.trim() || !editData.department?.trim()) {
        return toast.error("Mobile, institution, and department are required!");
      }
      if (editData.category === 'UG/PG STUDENTS' && !editData.yearOfStudy?.trim()) {
        return toast.error("Year of study is required for students!");
      }
      if ((editData.category === 'FACULTY/RESEARCH SCHOLARS' || editData.category === 'INDUSTRY PERSONNEL') && !editData.designation?.trim()) {
        return toast.error("Designation is required!");
      }

      // Team / Co-author validation
      for (let i = 0; i < editData.teamMembers.length; i++) {
        const m = editData.teamMembers[i];
        if (!m.name?.trim() || !m.email?.trim() || !m.mobile?.trim() || !(m.affiliation?.trim() || m.institution?.trim()) || !m.department?.trim()) {
          return toast.error(`Please fill in all core details for co-author ${i + 1}`);
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(m.email)) {
          return toast.error(`Invalid email format for co-author ${i + 1}`);
        }
        if (m.mobile.length < 10) {
          return toast.error(`Invalid mobile number for co-author ${i + 1}`);
        }
        if (m.category === 'UG/PG STUDENTS' && !m.yearOfStudy?.trim()) {
          return toast.error(`Year/Course is required for co-author ${i + 1}`);
        }
        if ((m.category === 'FACULTY/RESEARCH SCHOLARS' || m.category === 'INDUSTRY PERSONNEL') && !m.designation?.trim()) {
          return toast.error(`Designation is required for co-author ${i + 1}`);
        }
      }

      try {
        setIsSavingDetails(true);
        const submitPayload = {
          personalDetails: { ...registration.personalDetails, mobile: editData.mobile, institution: editData.institution, department: editData.department, areaOfSpecialization: editData.areaOfSpecialization, yearOfStudy: editData.yearOfStudy, designation: editData.designation, category: editData.category, profilePicture: editData.profilePicture },
          teamMembers: editData.teamMembers,
          paperDetails: { ...registration.paperDetails, title: editData.title, abstract: editData.abstract, keywords: editData.keywords.split(',').map(k => k.trim()).filter(k => k), track: editData.track }
        };
        await axios.post('/api/registrations/draft', submitPayload, { headers: { Authorization: `Bearer ${user.token}` } });
        await fetchRegistration();
        setEditData(null);
        toast.success("Details updated successfully!");
      } catch (error) {
        toast.error("Failed to update details");
      } finally {
        setIsSavingDetails(false);
      }
    };

    const updateEditTeamMember = (index, field, value) => {
      const newMembers = [...editData.teamMembers];
      newMembers[index][field] = value;
      setEditData({ ...editData, teamMembers: newMembers });
    };

    const paperDetailsSection = (
      <>
        {/* Registration Details Group */}
        {editData ? (
          <motion.div variants={overviewItemVariants} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-glass border border-white/80 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-100/50 pb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Edit Registration Details</h3>
            </div>

            <div className="space-y-6">
              {/* Paper Details Section */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">Paper Details</h4>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Title</label>
                    <input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Paper Title" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Abstract</label>
                    <textarea rows="4" value={editData.abstract} onChange={e => setEditData({ ...editData, abstract: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Paper Abstract" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Track</label>
                    <select value={editData.track} onChange={e => setEditData({ ...editData, track: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                      <option value="CIDT">Track 1: Computing, Intelligence & Digital Technologies</option>
                      <option value="ESSI">Track 2: Engineering, Science & Sustainable Innovations</option>
                      <option value="EAHSS">Track 3: Education, Arts, Humanities & Social Sciences</option>
                      <option value="MBHSD">Track 4: Management, Business & Health Sciences</option>
                    </select>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-800 mb-3">Principal Author Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3 mb-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Participant Category</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries({
                        'UG/PG STUDENTS': { fee: 500 },
                        'FACULTY/RESEARCH SCHOLARS': { fee: 750 },
                        'EXTERNAL / ONLINE PRESENTATION': { fee: 300 },
                        'INDUSTRY PERSONNEL': { fee: 900 }
                      }).map(([key, data]) => (
                        <div
                          key={key}
                          className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 flex flex-col gap-1 bg-white hover:border-slate-300 hover:bg-slate-50 relative overflow-hidden group ${editData.category === key ? 'border-indigo-600 bg-indigo-50/50 shadow-sm shadow-indigo-500/5' : 'border-slate-200'}`}
                          onClick={() => setEditData({ ...editData, category: key })}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${editData.category === key ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400 font-black'}`}>
                              <div className={`w-1.5 h-1.5 bg-white rounded-full transition-all ${editData.category === key ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                            </div>
                            <span className={`font-black text-[0.6rem] uppercase tracking-wider leading-tight ${editData.category === key ? 'text-indigo-700' : 'text-slate-700'}`}>{key}</span>
                          </div>
                          <div className="pl-5 flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">₹{data.fee}</span>
                            <span className="text-[0.55rem] text-slate-400 font-bold uppercase tracking-tight">Fee</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mobile</label>
                    <input value={editData.mobile} onChange={e => setEditData({ ...editData, mobile: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Mobile number" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Institution</label>
                    <select
                      value={
                        ["Coimbatore Institute of Engineering and Technology", "Coimbatore Institute of Management and Technology", "Kovai Kalaimagal Arts and Science College"].includes(editData.institution)
                          ? editData.institution
                          : 'External'
                      }
                      onChange={e => {
                        if (e.target.value !== 'External') setEditData({ ...editData, institution: e.target.value });
                        else setEditData({ ...editData, institution: '' });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all mb-2"
                    >
                      <option value="Coimbatore Institute of Engineering and Technology">Coimbatore Institute of Engineering and Technology</option>
                      <option value="Coimbatore Institute of Management and Technology">Coimbatore Institute of Management and Technology</option>
                      <option value="Kovai Kalaimagal Arts and Science College">Kovai Kalaimagal Arts and Science College</option>
                      <option value="External">External Institution...</option>
                    </select>
                    {!["Coimbatore Institute of Engineering and Technology", "Coimbatore Institute of Management and Technology", "Kovai Kalaimagal Arts and Science College"].includes(editData.institution) && (
                      <input autoFocus value={editData.institution} onChange={e => setEditData({ ...editData, institution: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white ring-2 ring-indigo-500/10 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all mt-1" placeholder="Enter External Institution" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                    <input value={editData.department} onChange={e => setEditData({ ...editData, department: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Department" />
                  </div>
                  {(editData.category === 'UG/PG STUDENTS') && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Year of Study</label>
                      <input value={editData.yearOfStudy} onChange={e => setEditData({ ...editData, yearOfStudy: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Year of Study" />
                    </div>
                  )}
                  {(editData.category === 'FACULTY/RESEARCH SCHOLARS' || editData.category === 'INDUSTRY PERSONNEL') && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Designation</label>
                      <input value={editData.designation} onChange={e => setEditData({ ...editData, designation: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Designation" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Area of Specialization</label>
                    <input value={editData.areaOfSpecialization} onChange={e => setEditData({ ...editData, areaOfSpecialization: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Area of Specialization" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800">Co-Authors</h4>
                  {editData.teamMembers.length < 3 && (
                    <button onClick={() => setEditData({ ...editData, teamMembers: [...editData.teamMembers, { name: '', email: '', mobile: '', affiliation: '', category: 'UG/PG STUDENTS' }] })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 bg-indigo-50 rounded-lg transition-colors border border-indigo-100">+ Add Co-author</button>
                  )}
                </div>
                <div className="space-y-4">
                  {editData.teamMembers.length === 0 && <p className="text-xs text-slate-400 italic">No co-authors added yet.</p>}
                  {editData.teamMembers.map((m, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                      <button onClick={() => {
                        const newM = [...editData.teamMembers]; newM.splice(idx, 1); setEditData({ ...editData, teamMembers: newM })
                      }} className="absolute top-4 right-4 text-red-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest transition-colors">Remove</button>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Co-author {idx + 1}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Full Name *</label><input value={m.name} onChange={e => updateEditTeamMember(idx, 'name', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 outline-none" placeholder="Name" /></div>
                        <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Email *</label><input value={m.email} onChange={e => updateEditTeamMember(idx, 'email', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 outline-none" placeholder="Email" /></div>
                        <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Mobile *</label><input value={m.mobile} onChange={e => updateEditTeamMember(idx, 'mobile', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 outline-none" placeholder="Mobile" /></div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Category *</label>
                          <select value={m.category} onChange={e => updateEditTeamMember(idx, 'category', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-700 bg-white focus:border-indigo-500 outline-none">
                            <option value="UG/PG STUDENTS">UG/PG STUDENTS</option>
                            <option value="FACULTY/RESEARCH SCHOLARS">FACULTY/RESEARCH SCHOLARS</option>
                            <option value="EXTERNAL / ONLINE PRESENTATION">EXTERNAL / ONLINE PRESENTATION</option>
                            <option value="INDUSTRY PERSONNEL">INDUSTRY PERSONNEL</option>
                          </select>
                        </div>
                        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase ml-1">Institution</label>
                            <select
                              value={
                                ["Coimbatore Institute of Engineering and Technology", "Coimbatore Institute of Management and Technology", "Kovai Kalaimagal Arts and Science College"].includes(m.affiliation || m.institution)
                                  ? (m.affiliation || m.institution)
                                  : 'External'
                              }
                              onChange={e => {
                                if (e.target.value !== 'External') {
                                  updateEditTeamMember(idx, 'affiliation', e.target.value);
                                } else if (!(m.affiliation || m.institution) || ["Coimbatore Institute of Engineering and Technology", "Coimbatore Institute of Management and Technology", "Kovai Kalaimagal Arts and Science College"].includes(m.affiliation || m.institution)) {
                                  updateEditTeamMember(idx, 'affiliation', '');
                                }
                              }}
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 outline-none mb-1"
                            >
                              <option value="Coimbatore Institute of Engineering and Technology">Coimbatore Institute of Engineering and Technology</option>
                              <option value="Coimbatore Institute of Management and Technology">Coimbatore Institute of Management and Technology</option>
                              <option value="Kovai Kalaimagal Arts and Science College">Kovai Kalaimagal Arts and Science College</option>
                              <option value="External">External Institution...</option>
                            </select>
                            {!["Coimbatore Institute of Engineering and Technology", "Coimbatore Institute of Management and Technology", "Kovai Kalaimagal Arts and Science College"].includes(m.affiliation || m.institution) && (
                              <input value={m.affiliation || m.institution} onChange={e => updateEditTeamMember(idx, 'affiliation', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-indigo-200 ring-2 ring-indigo-500/10 text-xs focus:border-indigo-500 outline-none" placeholder="External Institution Name" />
                            )}
                          </div>
                          {(m.category === 'FACULTY/RESEARCH SCHOLARS' || m.category === 'INDUSTRY PERSONNEL') && (
                            <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Designation</label><input value={m.designation} onChange={e => updateEditTeamMember(idx, 'designation', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 outline-none" placeholder="Designation" /></div>
                          )}
                          <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Area of Specialization</label><input value={m.areaOfSpecialization} onChange={e => updateEditTeamMember(idx, 'areaOfSpecialization', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 outline-none" placeholder="Specialization" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Paper Keywords</h4>
                <p className="text-[10px] text-slate-400 font-medium mb-3">Comma separated keywords relevant to your paper.</p>
                <input value={editData.keywords} onChange={e => setEditData({ ...editData, keywords: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="e.g. AI, Machine Learning, Robotics" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button onClick={() => setEditData(null)} disabled={isSavingDetails} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm">Cancel</button>
                <button onClick={handleSaveDetails} disabled={isSavingDetails} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50">
                  {isSavingDetails ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle size={16} />}
                  {isSavingDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={overviewItemVariants} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-50 pb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Registration Details</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" /> Submitted: {registration?.createdAt ? new Date(registration.createdAt).toLocaleDateString() : 'N/A'}
                </span>
                {registration?.status !== 'Accepted' && (
                  <button
                    onClick={handleEditDetails}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-indigo-100/50 hover:border-indigo-200"
                  >
                    <Edit2 size={12} /> Edit Details
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Paper Details Display */}
              <div className="bg-white rounded-3xl overflow-hidden px-2 sm:px-4">
                <div className="pb-4 border-b border-slate-50 pt-2">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight mb-4">{registration?.paperDetails?.title || 'Untitled Research Submission'}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider">{registration?.paperDetails?.track || 'General track'}</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">{registration?.personalDetails?.category || 'Student'}</span>
                  </div>
                </div>
                <div className="py-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Abstract Overview</h3>
                  <div className="text-slate-600 text-base leading-relaxed font-serif italic text-justify">
                    <p>{registration?.paperDetails?.abstract || 'No abstract content available at this moment.'}</p>
                  </div>
                </div>
                {registration?.paperDetails?.reviewerComments && (
                  <div className={`py-6 border-t ${registration.status === 'Accepted' ? 'border-blue-50' : registration.status === 'Rejected' ? 'border-red-50' : 'border-slate-50'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${registration.status === 'Accepted' ? 'text-blue-500' : registration.status === 'Rejected' ? 'text-red-500' : 'text-slate-400'}`}>
                      Admin Remarks
                    </h3>
                    <div className={`p-4 rounded-2xl border ${registration.status === 'Accepted' ? 'bg-blue-50/50 border-blue-100 text-blue-800' : registration.status === 'Rejected' ? 'bg-red-50/50 border-red-100 text-red-800' : 'bg-slate-50 border-slate-100 text-slate-700'} text-sm font-medium leading-relaxed`}>
                      <p>{registration.paperDetails.reviewerComments}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Principal Author Details */}
              <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden group/author">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[100px] -z-10 group-hover/author:scale-110 transition-transform duration-500"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-200 shrink-0">{registration?.personalDetails?.name?.charAt(0) || user?.name?.charAt(0)}</div>
                    <div>
                      <span className="font-extrabold text-slate-800 text-lg block">{registration?.personalDetails?.name || user?.name}</span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest rounded-md mt-0.5 inline-block bg-indigo-50 px-2 py-0.5">Principal Author</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email</span>
                    <p className="text-xs font-semibold text-slate-700 truncate" title={registration?.personalDetails?.email || user?.email}>{registration?.personalDetails?.email || user?.email}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mobile</span>
                    <p className="text-xs font-semibold text-slate-700 truncate">{registration?.personalDetails?.mobile || user?.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Institution</span>
                    <p className="text-xs font-semibold text-slate-700 truncate" title={registration?.personalDetails?.institution}>{registration?.personalDetails?.institution || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Department</span>
                    <p className="text-xs font-semibold text-slate-700 truncate" title={registration?.personalDetails?.department}>{registration?.personalDetails?.department || 'N/A'}</p>
                  </div>
                  {(registration?.personalDetails?.category === 'UG/PG STUDENTS') && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Year of Study</span>
                      <p className="text-xs font-semibold text-slate-700 truncate" title={registration?.personalDetails?.yearOfStudy}>{registration?.personalDetails?.yearOfStudy || 'N/A'}</p>
                    </div>
                  )}
                  {(registration?.personalDetails?.category === 'FACULTY/RESEARCH SCHOLARS' || registration?.personalDetails?.category === 'INDUSTRY PERSONNEL') && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Designation</span>
                      <p className="text-xs font-semibold text-slate-700 truncate" title={registration?.personalDetails?.designation}>{registration?.personalDetails?.designation || 'N/A'}</p>
                    </div>
                  )}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Specialization</span>
                    <p className="text-xs font-semibold text-slate-700 truncate" title={registration?.personalDetails?.areaOfSpecialization}>{registration?.personalDetails?.areaOfSpecialization || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Co-Authors Details */}
              {registration?.teamMembers && registration.teamMembers.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Co-Authors
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {registration.teamMembers.map((member, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3.5 min-w-[220px]">
                          <div className="w-10 h-10 bg-slate-50 text-slate-500 border border-slate-100 rounded-xl flex items-center justify-center font-bold text-base shrink-0">{member.name?.charAt(0)}</div>
                          <div>
                            <span className="font-extrabold text-slate-700 text-sm block">{member.name}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.category}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 flex-1 w-full border-t border-slate-50 xl:border-t-0 pt-4 xl:pt-0">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email</span>
                            <p className="text-xs font-semibold text-slate-600 truncate" title={member.email}>{member.email}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile</span>
                            <p className="text-xs font-semibold text-slate-600">{member.mobile}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Institution</span>
                            <p className="text-xs font-semibold text-slate-600 truncate" title={member.affiliation || member.institution}>{member.affiliation || member.institution || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department</span>
                            <p className="text-xs font-semibold text-slate-600 truncate" title={member.department}>{member.department || 'N/A'}</p>
                          </div>
                          {(member.category === 'UG/PG STUDENTS') && (
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Year of Study</span>
                              <p className="text-xs font-semibold text-slate-600 truncate" title={member.yearOfStudy}>{member.yearOfStudy || 'N/A'}</p>
                            </div>
                          )}
                          {(member.category === 'FACULTY/RESEARCH SCHOLARS' || member.category === 'INDUSTRY PERSONNEL') && (
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Designation</span>
                              <p className="text-xs font-semibold text-slate-600 truncate" title={member.designation}>{member.designation || 'N/A'}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Specialization</span>
                            <p className="text-xs font-semibold text-slate-600 truncate" title={member.areaOfSpecialization}>{member.areaOfSpecialization || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords Metadata */}
              <div className="pt-6 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block mb-3 pl-2">Paper Keywords</span>
                <div className="flex flex-wrap gap-2 px-2">
                  {registration?.paperDetails?.keywords?.map((keyword, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold border border-slate-100">{keyword}</span>
                  )) || <span className="text-sm font-medium text-slate-400 italic">No keywords specified</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </>
    );

    const actionSection = (
      <motion.div variants={overviewItemVariants} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-glass border border-white/80 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
          <Layers size={14} className="text-slate-400" /> Manuscript Actions
        </h3>

        {registration?.status !== 'Accepted' && (
          <div className="flex flex-col gap-4">
            {registration?.status === 'Rejected' && registration?.paperDetails?.reuploadRequestStatus !== 'Approved' ? (
              <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-red-800 mb-4">
                  Your manuscript was rejected. You must request approval to re-upload a revised version.
                </p>
                {registration?.paperDetails?.reuploadRequestStatus === 'Pending' ? (
                  <button className="w-full sm:w-auto px-6 py-3 bg-red-200 text-red-700 font-bold rounded-xl pointer-events-none">
                    Re-upload Request Pending
                  </button>
                ) : (
                  <button onClick={handleRequestReupload} className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-200">
                    Request Re-upload
                  </button>
                )}
              </div>
            ) : !registration?.paperDetails?.fileUrl ? (
              <div className="relative">
                <input
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFullPaperUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait z-10"
                  disabled={uploading}
                />
                <button className="w-full relative z-0 flex items-center justify-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 pointer-events-none">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : <Upload size={18} />}
                  {uploading ? 'Uploading...' : 'Upload Manuscript (Word)'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={handleDownload} className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-lg hover:shadow-slate-200">
                  <Download size={18} />
                  Download Manuscript
                </button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".doc,.docx"
                    onChange={handleFullPaperUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait z-10"
                    disabled={uploading}
                  />
                  <button className="w-full h-full flex items-center justify-center gap-2 bg-slate-50 text-slate-500 border border-slate-200 px-6 py-4 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all pointer-events-none">
                    {uploading ? 'Updating...' : 'Update Manuscript'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {registration?.status === 'Accepted' && registration?.paperDetails?.fileUrl && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={handleDownload} className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-lg hover:shadow-slate-200">
              <Download size={18} />
              Download Manuscript
            </button>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center">
              <p className="text-xs font-bold text-amber-700 flex items-center gap-2">
                <ShieldCheck size={14} /> Editing locked after {registration.status.toLowerCase()}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    );

    const hasFileUrl = !!registration?.paperDetails?.fileUrl;

    return (
      <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6 pb-12">
        {!hasFileUrl && actionSection}
        {paperDetailsSection}
        {hasFileUrl && actionSection}
      </motion.div>
    );
  };

  const renderPayment = () => (
    <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible">
      <motion.div variants={overviewItemVariants} className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><CreditCard size={24} /></div>
        <h3 className="text-2xl font-bold text-slate-800">Billing Dashboard</h3>
      </motion.div>

      <div className="flex flex-col gap-6 relative z-10">
        <div className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-glass border border-white/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Payment Balance</p>
            <p className="text-3xl font-black text-slate-800">₹ {registration?.paymentStatus === 'Completed' ? '0' : currentFee}</p>
          </div>
          <div className="sm:text-right w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Verification</p>
            <div className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wide inline-block ${registration?.paymentStatus === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {registration?.paymentStatus || 'Awaiting'}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-glass border border-white/80 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5">
            <h4 className="font-extrabold text-slate-800 mb-6 text-lg">Fee Breakdown</h4>
            <div className="flex justify-between py-3 border-b border-slate-50">
              <span className="text-slate-500 font-medium text-sm">Main Author ({registration?.personalDetails?.category})</span>
              <span className="font-bold text-slate-700">₹ {categoryAmounts[registration?.personalDetails?.category] || 1000}</span>
            </div>
            {registration?.teamMembers?.map((member, idx) => (
              <div key={idx} className="flex justify-between py-3 border-b border-slate-50">
                <span className="text-slate-500 font-medium text-sm">Co-Author {idx + 1} ({member.category})</span>
                <span className="font-bold text-slate-700">₹ {categoryAmounts[member.category] || 1000}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 border-b border-slate-50">
              <span className="text-slate-500 font-medium text-sm">Processing Fee (0%)</span>
              <span className="font-bold text-slate-700">₹ 0</span>
            </div>
            <div className="flex justify-between pt-6 mt-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-widest text-xs">Total Amount</span>
              <p className="text-xl font-black text-slate-900">₹ {currentFee}</p>
            </div>
          </div>

          <div className="rounded-[2.5rem] p-6 md:p-10 bg-indigo-50/40 backdrop-blur-md border border-indigo-100/50 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-glass transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10">
            {/* Decor */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"></div>

            {registration?.paymentStatus === 'Completed' ? (
              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <CheckCircle size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Paid in Full</h4>
                <p className="text-slate-500 text-sm font-medium">Your registration is confirmed. We look forward to seeing you!</p>
              </div>
            ) : registration?.status === 'Accepted' ? (
              <div className="relative z-10 w-full">
                <h4 className="text-xl font-bold text-slate-800 mb-2">Checkout Ready</h4>

                {settings?.onlinePaymentEnabled === false ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center shadow-inner my-6">
                    <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-800 font-bold text-sm mb-1">Online Payments Unavailable</p>
                    <p className="text-amber-700 text-xs">Please pay the registration fee at the venue during verification.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 mb-8 text-sm font-medium">Securely pay using UPI, Card or Internet Banking.</p>
                    <button
                      onClick={handlePayment}
                      disabled={paymentLoading}
                      className="w-full btn btn-primary py-3.5 rounded-xl shadow-lg shadow-indigo-200 font-bold flex items-center justify-center gap-2"
                    >
                      {paymentLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CreditCard size={18} />}
                      {paymentLoading ? 'Processing...' : 'Continue to Payment'}
                    </button>
                  </>
                )}
              </div>
            ) : registration?.status === 'Draft' ? (
              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <FileText size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Registration in Draft</h4>
                <p className="text-slate-500 text-sm font-medium mb-6">You haven't completed your application yet.</p>
                <Link to="/register" className="inline-block bg-white text-indigo-600 border border-indigo-200 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">Resume Registration</Link>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <Clock size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Verification in Progress</h4>
                <p className="text-slate-500 text-sm font-medium">Reviewing your paper. Payment will be enabled once accepted.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderCertificate = () => (
    <div className="animate-fade-in max-w-4xl mx-auto h-full flex items-center justify-center pt-10">
      <div className="bg-white/60 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-glass border border-white/80 relative overflow-hidden text-center w-full">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100">
          <Lock size={40} />
        </div>

        <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight mb-4">
          E-Certificate Locked
        </h3>

        <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
          Your participation E-certificate will be generated and made available here automatically upon the successful completion of the conference.
        </p>

        <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50 mb-8 max-w-sm mx-auto">
          <div className="flex items-center gap-4 opacity-50">
            <div className="shrink-0 w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400">
              <FileBadge size={24} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <h4 className="font-bold text-slate-700 truncate">Participation_Certificate.pdf</h4>
              <p className="text-xs text-slate-500">Document ready after conference</p>
            </div>
          </div>
        </div>

        <button
          disabled
          className="inline-flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed border-2 border-slate-200"
        >
          <Download size={16} /> Download Certificate
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-slate-100 flex flex-col h-full z-50 transition-all duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 outline-none' : '-translate-x-full shadow-2xl'}`}>
        {/* Logo/Brand */}
        <div className="p-6 md:p-8 pb-6 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-2 font-display hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <LayoutDashboard size={20} />
            </div>
            <span>CIETM <span className="text-indigo-600">2026</span></span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 mb-6 relative">
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50 flex items-center gap-3">
            <div
              className="w-11 h-11 bg-white text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border border-slate-100 shrink-0 overflow-hidden cursor-pointer group hover:border-indigo-200 transition-all"
              onClick={() => setShowProfilePopup(!showProfilePopup)}
            >
              {registration?.personalDetails?.profilePicture ? (
                <img src={registration.personalDetails.profilePicture} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              ) : user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-800 text-xs truncate uppercase tracking-wider">{user?.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest truncate">{user?.role} portal</span>
              </div>
            </div>
          </div>
          {/* Profile Picture Popup */}
          <AnimatePresence>
            {showProfilePopup && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-20 left-6 w-52 bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 p-2 z-50 origin-top-left"
              >
                {registration?.personalDetails?.profilePicture && (
                  <a href={registration.personalDetails.profilePicture} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors w-full text-left">
                    <User size={14} /> View Avatar
                  </a>
                )}
                <button
                  onClick={() => { setShowProfilePopup(false); setActiveTab('settings'); }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors w-full text-left"
                >
                  <Camera size={14} /> Update Avatar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-1.5 overflow-y-auto pt-2">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
            { id: 'paper', icon: FileText, label: 'Submission' },
            { id: 'payment', icon: CreditCard, label: 'Payments' },
            { id: 'notifications', icon: Bell, label: 'Updates' },
            { id: 'idcard', icon: Award, label: 'ID Card' },
            { id: 'certificate', icon: FileBadge, label: 'E-Certificate' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'idcard') {
                  if (registration) {
                    setShowIDCard(true);
                  } else {
                    toast.error("Please start your registration to access the ID Card");
                  }
                } else {
                  setActiveTab(item.id);
                }
                setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 text-left group relative w-full overflow-hidden ${activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-black'
                : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
                }`}
            >
              <div className={`absolute inset-0 transition-all duration-500 ${activeTab === item.id ? 'bg-[length:200%_200%] bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 animate-gradient' : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-500/5 group-hover:to-transparent w-0 group-hover:w-full'}`}></div>
              <item.icon size={20} className={`relative z-10 transition-transform duration-300 ${activeTab !== item.id && 'group-hover:scale-110 group-hover:text-indigo-600 shrink-0'}`} />
              <span className="text-sm tracking-tight relative z-10">{item.label}</span>
              {activeTab === item.id && (
                <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full relative z-10"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50/50">
          <button
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl text-slate-500 font-black text-[0.7rem] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all group"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-1" /> Logout Account
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-slate-50/10">
        {/* Header */}
        <header className="px-4 md:px-10 py-4 md:py-5 shrink-0 flex justify-between items-center bg-white/60 backdrop-blur-2xl border-b border-white shadow-sm sticky top-0 z-30 transition-all duration-500">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              className="lg:hidden p-2 text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <div className="hidden md:block mb-1">
                {renderBreadcrumbs()}
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                {activeTab === 'paper' ? 'Submission details' : activeTab}
              </h1>
              <div className="flex items-center gap-2 mt-1 hidden md:flex">
                <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  Last synced: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {/* Small Logo for mobile right side if needed, or just stay as is */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 md:hidden">
              <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-[0.5rem] text-white font-bold">C</div>
              <span className="text-[0.6rem] font-bold text-slate-800">CIETM</span>
            </div>

            {activeTab === 'paper' && registration && (
              <div className={`px-4 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-widest hidden sm:flex items-center gap-2 shadow-sm border ${registration?.paperDetails?.reviewStatus === 'Accepted'
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${registration?.paperDetails?.reviewStatus === 'Accepted' ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'}`}></div>
                {registration?.paperDetails?.reviewStatus || 'In Review'}
              </div>
            )}

            <Link
              to="/"
              title="Main Website"
              className="w-11 h-11 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 cursor-pointer hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-md active:scale-95 group"
            >
              <Home size={20} className="group-hover:scale-110 transition-transform" />
            </Link>

            <div className="relative group">
              <div
                className="w-11 h-11 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 cursor-pointer hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-md active:scale-95"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell size={20} />
                {notifications.some(n => !n.isRead) && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto pb-10">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'paper' && renderSubmissionTab()}
            {activeTab === 'payment' && renderPayment()}
            {activeTab === 'certificate' && renderCertificate()}
            {activeTab === 'notifications' && (
              <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Recent Updates</h3>
                  {notifications.some(n => !n.isRead) && (
                    <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Mark all as read</button>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer ${n.isRead ? 'bg-white border-slate-100' : 'bg-indigo-50/50 border-indigo-100 shadow-sm'}`}
                        onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                      >
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-blue-100 text-blue-600' :
                            n.type === 'error' ? 'bg-red-100 text-red-600' :
                              n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            <Bell size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-800">{n.title}</h4>
                              {!n.isRead && <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>}
                            </div>
                            <p className="text-sm text-slate-600 font-medium mb-2">{n.message}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-6">
                      <Bell size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No notifications yet</h3>
                    <p className="text-slate-500 text-center max-w-sm">We'll alert you here when there's an update on your paper or payment.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="animate-fade-in">
                <div className="bg-white/60 backdrop-blur-2xl p-6 md:p-10 rounded-[2.5rem] shadow-glass border border-white/80 max-w-4xl relative overflow-hidden">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <h3 className="text-2xl font-black mb-8 md:mb-10 flex items-center gap-3 text-slate-800 uppercase tracking-tight relative z-10">
                    <span className="p-2 bg-slate-100 rounded-lg"><Settings size={24} className="text-slate-500" /></span> Account Settings
                  </h3>
                  <div className="space-y-12">
                    <div>
                      <h4 className="text-[0.65rem] font-black uppercase text-slate-400 mb-6 tracking-[0.2em]">Profile Information</h4>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                          <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700">{user.name}</div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                          <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700 break-words">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                      <h4 className="text-[0.65rem] font-black uppercase text-slate-400 mb-6 tracking-[0.2em]">Profile Avatar</h4>
                      <div className="flex items-center gap-6 mb-2 group">
                        <div className="relative w-24 h-24 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                          {registration?.personalDetails?.profilePicture ? (
                            <img src={registration?.personalDetails?.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User size={32} className="text-slate-400" />
                          )}
                          {uploadingProfilePic && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                return toast.error("Image must be less than 5MB");
                              }

                              setUploadingProfilePic(true);
                              const uploadData = new FormData();
                              uploadData.append('image', file);

                              try {
                                const { data } = await axios.post('/api/registrations/upload-profile-picture', uploadData, {
                                  headers: {
                                    'Content-Type': 'multipart/form-data',
                                    Authorization: `Bearer ${user?.token}`
                                  }
                                });

                                await axios.put('/api/registrations/profile-picture', { profilePicture: data.url }, {
                                  headers: {
                                    Authorization: `Bearer ${user?.token}`
                                  }
                                });

                                setRegistration(prev => ({
                                  ...prev,
                                  personalDetails: {
                                    ...(prev?.personalDetails || {}),
                                    profilePicture: data.url
                                  }
                                }));
                                toast.success("Avatar updated successfully!", { icon: '📸' });
                              } catch (error) {
                                toast.error("Failed to upload image. Please try again.");
                              } finally {
                                setUploadingProfilePic(false);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                            disabled={uploadingProfilePic}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 mb-1">Update Author Avatar</h4>
                          <p className="text-xs text-slate-500 mb-2">Upload a professional headshot for your Digital ID Card.</p>
                          <label className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md tracking-wider">JPG, PNG, WebP (Max 5MB)</label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                      <h4 className="text-[0.65rem] font-black uppercase text-slate-400 mb-6 tracking-[0.2em]">Security</h4>
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-8 py-4 rounded-xl border-2 border-slate-100 text-slate-600 font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95 shadow-sm hover:shadow-md"
                      >
                        Change Account Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
              {/* Decor */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all z-20"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Security Update</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">Ensure your account remains secure with a strong password.</p>

                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Min. 6 characters"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>

                  <button
                    disabled={changingPassword}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-[0.98]"
                  >
                    {changingPassword ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ShieldCheck size={16} />}
                    {changingPassword ? 'Updating...' : 'Save New Password'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Digital ID Card Modal */}
        {showIDCard && registration && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in print:bg-white print:p-0">
            <div className="flex flex-col gap-6 max-w-[28rem] w-full animate-scale-in print:hidden perspective-1000">
              <div className="relative" id="printable-id-card">
                {/* ID Card Front */}
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: 5, rotateX: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="rounded-[2.5rem] p-[3px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden shadow-2xl"
                  style={{ transformPerspective: 1000 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md z-0"></div>
                  <div className="bg-white/90 backdrop-blur-2xl rounded-[2.3rem] p-8 relative z-10 h-full flex flex-col justify-between border border-white/50">

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                      <Award size={200} />
                    </div>

                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-8 relative z-20">
                      <div>
                        <h4 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 leading-none tracking-tight">CIETM <span className="text-indigo-900">2026</span></h4>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">Conclave on Innovation</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-700 font-bold shadow-inner border border-white">
                        <span className="text-2xl">C</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex gap-6 mb-8 relative z-20 items-center">
                      <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 overflow-hidden shadow-inner border-2 border-white relative group">
                        {registration?.personalDetails?.profilePicture ? (
                          <img src={registration.personalDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={56} className="group-hover:scale-110 transition-transform duration-500" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <h5 className="text-2xl font-black text-slate-800 truncate leading-tight uppercase tracking-tight mb-2">{user.name}</h5>

                        <div className="inline-flex mt-1 mb-4">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md">
                            {registration.personalDetails.category}
                          </span>
                        </div>

                        <div className="space-y-2.5 bg-white/50 p-3 rounded-xl border border-white/60">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600"><MapPin size={12} /></div>
                            <span className="text-[11px] font-bold text-slate-700 truncate">{registration.personalDetails.institution}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-50 rounded-md text-purple-600"><Layers size={12} /></div>
                            <span className="text-[11px] font-bold text-slate-700 truncate">{registration.paperDetails.track}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex justify-between items-end relative z-20 mt-auto pt-6 border-t border-slate-200/50">
                      <div className="flex bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white shadow-sm items-center gap-4">
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                          <QRCode value={registration._id} size={70} viewBox={`0 0 256 256`} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Participant ID</p>
                          <p className="text-sm font-black text-slate-800 tracking-wider font-mono bg-slate-100 px-2 py-1 rounded-md">
                            {registration.authorId || `#CMP-26-${registration._id.slice(-6).toUpperCase()}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2 shadow-sm border border-green-100">
                          <CheckCircle size={20} className="text-green-500" />
                        </div>
                        <p className="text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-md">Official Entry</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                  <Download size={18} /> Print pass
                </button>
                <button
                  onClick={() => setShowIDCard(false)}
                  className="px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print-only version (cleaner for PDF export) */}
            <div className="hidden print:block bg-white p-10">
              <div className="w-[85.6mm] h-[53.98mm] border-[1px] border-slate-300 rounded-[3mm] p-[5mm] bg-white flex flex-col justify-between shadow-none mx-auto mb-10">
                <div className="flex justify-between items-start border-b-[0.5mm] border-slate-100 pb-[2mm]">
                  <div>
                    <h4 className="text-[5mm] font-black text-slate-800 leading-none">CIETM <span className="text-indigo-600">2026</span></h4>
                    <p className="text-[2.5mm] font-bold text-slate-400 uppercase tracking-widest mt-[0.5mm]">Conclave on Innovation</p>
                  </div>
                  <div className="w-[8mm] h-[8mm] bg-indigo-50 rounded-[1.5mm] flex items-center justify-center text-indigo-600 font-bold text-[3mm]">C</div>
                </div>

                <div className="flex gap-[4mm]">
                  <div className="w-[18mm] h-[18mm] bg-slate-50 border-[0.3mm] border-slate-100 rounded-[2mm] flex items-center justify-center text-slate-300 overflow-hidden shrink-0">
                    {registration?.personalDetails?.profilePicture ? (
                      <img src={registration.personalDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h5 className="text-[4mm] font-black text-slate-800 truncate leading-tight uppercase">{user.name}</h5>
                    <span className="text-[2.5mm] font-black text-indigo-600 uppercase tracking-tighter mb-[1mm]">{registration.personalDetails.category}</span>
                    <p className="text-[2.5mm] font-bold text-slate-500">{registration.personalDetails.institution}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-[3mm]">
                    <div className="bg-white p-[1mm] border-[0.2mm] border-slate-100 rounded-[1.5mm]">
                      <QRCode value={registration._id} size={45} style={{ height: "12mm", width: "12mm" }} />
                    </div>
                    <div>
                      <p className="text-[2mm] font-black text-slate-400 uppercase tracking-widest mb-[0.5mm]">Participant ID</p>
                      <p className="text-[3mm] font-black text-slate-800 tracking-wider font-mono">
                        {registration.authorId || `#CMP-26-${registration._id.slice(-6).toUpperCase()}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right pb-[1mm]">
                    <p className="text-[2.5mm] font-black text-blue-600 uppercase tracking-widest">Verified Delegate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Decor */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-50 rounded-full blur-3xl opacity-50"></div>

              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogOut size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Sign Out?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">Are you sure you want to end your current session?</p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={logout}
                    className="w-full py-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                  >
                    Confirm Logout
                  </button>
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Keep Session
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
