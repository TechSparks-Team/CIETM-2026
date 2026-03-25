import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, AlertCircle,
  Settings, Bell, Download, Menu, X, Search, ChevronRight, LogOut, Lock,
  LayoutDashboard, Calendar, MapPin, ShieldCheck, Award, Layers,
  Upload, Home, Edit2, Camera, User, CreditCard, TrendingUp, MessageSquare, Trash2, PlusCircle, FileUp,
  Sparkles, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import SubmissionFormSingle from '../components/SubmissionFormSingle';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { downloadFile } from '../utils/downloadHelper';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [activeRegistrationId, setActiveRegistrationId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
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
      setRegistrations(data || []);
      
      // If we have an active ID, find that registration, otherwise default to first if exists
      if (activeRegistrationId) {
        // stay on current
      } else if (data && data.length > 0) {
        setActiveRegistrationId(data[0]._id);
      }
    } catch (error) {
      console.error("Failed to fetch registrations", error);
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
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'paper', 'payment', 'drafts', 'notifications'].includes(tab)) {
      setActiveTab(tab);
    }
    fetchRegistration();
    fetchNotifications();
    fetchSettings();
  }, [fetchRegistration, fetchNotifications, fetchSettings, location.search]);

  useEffect(() => {
    const activeReg = registrations.find(r => r._id === activeRegistrationId);
    if (activeReg && ['Accepted', 'Rejected'].includes(activeReg.status) && activeTab === 'drafts') {
      setActiveTab('paper');
    }
  }, [registrations, activeRegistrationId, activeTab]);

  const handleForceSync = async () => {
    const loadingToast = toast.loading("Synchronizing dashboard...");
    try {
      await Promise.all([
        fetchRegistration(),
        fetchNotifications(),
        fetchSettings()
      ]);
      toast.success("Dashboard synced", { id: loadingToast });
    } catch (error) {
      toast.error("Sync failed", { id: loadingToast });
    }
  };

  const handleDownload = async (regId) => {
    const targetId = regId || activeRegistrationId;
    if (!targetId) return;

    const reg = registrations.find(r => r._id === targetId);
    const paperId = reg?.paperId || targetId.slice(-6).toUpperCase();
    const ext = reg?.paperDetails?.originalName?.split('.').pop() || 'docx';
    const filename = `${paperId}.${ext}`;

    const loadingToast = toast.loading('Preparing download...');
    try {
      await downloadFile(`/api/registrations/download/${targetId}`, filename, user.token);
      toast.success('Download started!', { id: loadingToast });

      // Auto-refresh if the paper was just submitted
      if (reg?.status === 'Submitted') {
        setTimeout(fetchRegistration, 2000);
      }
    } catch (err) {
      toast.error(err.message || 'Download failed. Please try again.', { id: loadingToast });
    }
  };



  const handleFullPaperUpload = async (e, regId) => {
    const file = e.target.files[0];
    if (!file) return;

    const targetId = regId || activeRegistrationId;
    if (!targetId) return;

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
        id: targetId,
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
  
  const handleDeleteRegistration = async (id) => {
    if (!window.confirm("Are you sure you want to delete this submission? This action cannot be undone.")) return;

    try {
      await axios.delete(`/api/registrations/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Submission deleted successfully");
      
      // If we deleted the active registration, clear it
      if (activeRegistrationId === id) {
        setActiveRegistrationId(null);
      }
      
      fetchRegistration();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete submission");
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

  const handlePayment = async (regId) => {
    const targetId = regId || registration?._id;
    if (!targetId) return;

    if (settings && settings.onlinePaymentEnabled === false) {
      return toast.error("Online payment gateway is temporarily disabled. Please contact the conference desk for manual options.");
    }

    setPaymentLoading(targetId); // Store ID to show loading on specific button
    try {
      const { data } = await axios.post('/api/payments/init', {
        registrationId: targetId
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

  const registration = registrations.find(r => r._id === activeRegistrationId) || registrations[0];

  const calculateCurrentFee = (reg) => {
    if (!reg) return 0;
    let total = categoryAmounts[reg.personalDetails?.category] || 0;
    if (reg.teamMembers && reg.teamMembers.length > 0) {
      reg.teamMembers.forEach(member => {
        total += categoryAmounts[member.category] || 0;
      });
    }
    return total;
  };

  const currentFee = calculateCurrentFee(registration);
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

  if (loading) return <DashboardSkeleton />;

  const overviewContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
  };

  const overviewItemVariants = {
    hidden: { y: 25, opacity: 0, scale: 0.98 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 120, damping: 14 } }
  };

  const renderOverview = () => (
    <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible" className="space-y-6 relative pb-10">
      {/* Header */}
      <motion.div variants={overviewItemVariants} className="flex items-center justify-between relative z-10 mb-8 px-1">
        <div>
          <p className="text-sm font-bold text-slate-500">Welcome back, <span className="text-indigo-600">{user.name}</span>. Here is your conference summary.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Status Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Minimal Status Card */}
          <motion.div variants={overviewItemVariants} className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full justify-between gap-8 md:gap-10">
              <div className="flex flex-col md:flex-row items-start justify-between gap-6 md:gap-0">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 border ${
                    registration?.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    registration?.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {registration?.status === 'Accepted' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {registration?.status === 'Submitted' && !registration?.paperDetails?.fileUrl ? 'Awaiting Upload' : (registration?.status || 'Not Submitted')}
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-tight">
                    {registration?.status === 'Accepted' ? 'Manuscript Accepted' :
                      registration?.status === 'Under Review' ? 'Under External Review' :
                      (registration?.status === 'Submitted' && registration?.paperDetails?.fileUrl) ? 'Submission Received' :
                      'Incomplete Submission'}
                  </h2>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-3 text-left md:text-right w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t border-slate-50 md:border-none">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delegate ID</p>
                    <p className="font-mono text-xl font-bold text-indigo-600">{registration?.userId?.delegateId || user.delegateId || '----'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paper ID</p>
                    <p className="font-mono text-lg font-bold text-slate-700">{registration?.paperId || '----'}</p>
                  </div>
                </div>
              </div>

              {registration?.paperDetails?.reviewerComments && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                    <MessageSquare size={12} /> Institutional Feedback
                  </h3>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    {registration.paperDetails.reviewerComments}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      registration?.status === 'Accepted' ? 'bg-emerald-500' :
                      registration?.status === 'Rejected' ? 'bg-red-500' : 'bg-slate-800'
                    }`}
                    style={{ 
                      width: `${registration?.status === 'Accepted' || registration?.status === 'Rejected' ? '100%' : 
                        registration?.paymentStatus === 'Completed' ? '100%' :
                        registration?.paperDetails?.fileUrl ? '50%' : '15%'}` 
                    }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-1 text-center md:flex md:justify-between px-1">
                  {[
                    { label: 'Registration', active: !!registration?.paperDetails?.abstract },
                    { label: 'Manuscript', active: !!registration?.paperDetails?.fileUrl },
                    { label: 'Evaluation', active: ['Under Review', 'Accepted', 'Rejected'].includes(registration?.paperDetails?.reviewStatus) },
                    { label: 'Result', active: ['Accepted', 'Rejected'].includes(registration?.status) }
                  ].map((step, i) => (
                    <span key={i} className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={overviewItemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers size={16} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Track</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate" title={registration?.paperDetails?.track}>
                {registration?.paperDetails?.track || 'General Domain'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finance</span>
              </div>
              <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                {registration?.paymentStatus === 'Completed' ? 'Verified' : 'Unpaid'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Date</span>
              </div>
              <p className="text-sm font-bold text-slate-800">5th May 2026</p>
            </div>

            <button 
              onClick={() => { setIsAddingNew(true); setActiveTab('paper'); }} 
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-2 group active:scale-[0.98] text-white"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">New Presentation</span>
            </button>
          </motion.div>

          {/* Deadlines List */}
          {/* Deadlines List */}
          <motion.div variants={overviewItemVariants} className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm relative overflow-hidden group/timeline">
            <h3 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <Clock size={18} />
              </div>
              <span className="uppercase tracking-widest text-xs">Conference Timeline</span>
            </h3>

            <div className="relative space-y-0">
              {/* Vertical Connector Line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-slate-50"></div>

              {[
                { label: 'Abstract Submission', date: '2026-03-30' },
                { label: 'Full Paper Submission', date: '2026-04-06' },
                { label: 'Acceptance Notification', date: '2026-04-13' },
                { label: 'Payment Confirmation', date: '2026-04-24' },
                { label: 'Conference Date', date: '2026-05-05' }
              ].map((item, i, arr) => {
                const now = new Date();
                const isPast = (dateStr) => {
                  const d = new Date(dateStr);
                  d.setHours(23, 59, 59, 999);
                  return now > d;
                };

                const done = isPast(item.date);
                const active = !done && (i === 0 || isPast(arr[i-1].date));

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative flex items-center justify-between py-4 group/item cursor-default z-10"
                  >
                    <div className="flex items-center gap-5 relative">
                      {/* Status Node */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-20 shrink-0 border-2 transition-all ${
                        done ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-100' :
                        active ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm' :
                        'bg-white border-slate-100 text-slate-300'
                      }`}>
                        {done ? <CheckCircle size={16} strokeWidth={3} /> : 
                         active ? <Clock size={16} strokeWidth={2.5} /> : 
                         <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>}
                      </div>

                      <div className="flex flex-col">
                        <span className={`text-sm font-bold tracking-tight ${
                          active ? 'text-indigo-600' : done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-600'
                        }`}>
                          {item.label}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          active ? 'text-indigo-400' : 'text-slate-400'
                        }`}>
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {active && (
                      <div className="hidden sm:block px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Active Phase</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Next Action Card */}





          <motion.div variants={overviewItemVariants} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm group">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                {registration?.paymentStatus === 'Completed' ? <ShieldCheck size={32} /> :
                  registration?.status === 'Accepted' ? <CreditCard size={32} /> :
                  registration?.paperDetails?.fileUrl ? <Clock size={32} /> :
                  <FileUp size={32} />}
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 text-lg mb-1">
                  {registration?.paymentStatus === 'Completed' ? 'Ready for CIETM' :
                    registration?.status === 'Accepted' ? 'Registration Awaiting' :
                    registration?.paperDetails?.fileUrl ? 'Review Ongoing' :
                    'Action Required'}
                </h4>
                <p className="text-xs text-slate-500 font-medium px-4">
                  {registration?.paymentStatus === 'Completed' ? 'Your attendance is confirmed.' :
                    registration?.status === 'Accepted' ? 'Complete payment to secure spot.' :
                    registration?.paperDetails?.fileUrl ? 'Evaluation in progress.' :
                    'Please upload your manuscript.'}
                </p>
              </div>

              {registration?.paymentStatus !== 'Completed' && (
                <div className="w-full">
                  <button
                    onClick={() => {
                      const tab = registration?.status === 'Accepted' ? 'payment' : 'paper';
                      setActiveTab(tab);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={registration?.status === 'Accepted' && settings?.onlinePaymentEnabled === false}
                    className={`w-full py-3.5 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-slate-200 ${
                      registration?.status === 'Accepted' && settings?.onlinePaymentEnabled === false
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {registration?.status === 'Accepted' 
                      ? (settings?.onlinePaymentEnabled === false ? 'Payment Offline' : 'Proceed to Payment')
                      : (registration?.paperDetails?.fileUrl ? 'Open Submission' : 'Upload Manuscript')}
                  </button>
                  {registration?.status === 'Accepted' && settings && settings.onlinePaymentEnabled === false && (
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mt-3 animate-pulse">
                      Only Offline Payment Accepted
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ID Card / Verification */}
          <motion.div variants={overviewItemVariants} className="rounded-[2rem] p-8 border transition-all duration-300 bg-slate-900 text-white border-slate-800 shadow-xl group">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Digital Identity</span>
              <ShieldCheck size={20} className="text-indigo-400" />
            </div>
            <div className="mb-10">
              <p className="text-3xl font-black tracking-tight mb-2">DELEGATE PASS</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified Admission</p>
            </div>
            <button
              onClick={() => registration && setShowIDCard(true)}
              className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
            >
              Access ID Card
            </button>
          </motion.div>

          {/* Author Guidelines Card (Full Content) */}
          <motion.div variants={overviewItemVariants} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm group">


            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <FileText size={20} />
              </div>
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-tight">Submission<br />Guidelines</h3>
            </div>

            <div className="space-y-6">
              <ul className="space-y-4">
                <li className="flex gap-4 text-xs text-slate-500 font-medium leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0"></div>
                  <span>Original work must follow IEEE conference formatting standards.</span>
                </li>
                <li className="flex gap-4 text-xs text-slate-500 font-medium leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0"></div>
                  <span>Double-blind peer review with maximum plagiarism of 15%.</span>
                </li>
              </ul>

              <a
                href="https://www.ieee.org/content/dam/ieee-org/ieee/web/org/conferences/Conference-template-A4.doc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-all"
              >
                <Download size={16} /> Word Template
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
    if (isAddingNew || registrations.length === 0) {
      return (
        <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible">
          <motion.div variants={overviewItemVariants} className="bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-glass border border-white/60 max-w-5xl mx-auto relative cursor-default overflow-hidden">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black text-slate-800">New Submission</h2>
               {registrations.length > 0 && (
                 <button onClick={() => setIsAddingNew(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <X size={20} />
                 </button>
               )}
            </div>
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <SubmissionFormSingle
              registration={null}
              user={user}
              onSuccess={(newReg) => {
                setIsAddingNew(false);
                if (newReg?._id) setActiveRegistrationId(newReg._id);
                fetchRegistration();
              }}
            />
          </motion.div>
        </motion.div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Paper Selector List */}
        <motion.div variants={overviewItemVariants} initial="hidden" animate="visible" className="bg-white/40 backdrop-blur-xl p-3 rounded-3xl border border-white/60 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {registrations.map((reg) => (
            <div
              key={reg._id}
              onClick={() => setActiveRegistrationId(reg._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveRegistrationId(reg._id); }}
              className={`cursor-pointer px-4 py-2 rounded-xl flex items-center gap-2.5 transition-all shrink-0 whitespace-nowrap border-2 ${activeRegistrationId === reg._id 
                ? 'bg-indigo-600 text-white border-indigo-200 shadow-md shadow-indigo-100' 
                : 'bg-white/80 text-slate-600 border-transparent hover:bg-white hover:border-slate-100 shadow-sm'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${activeRegistrationId === reg._id ? 'bg-white' : (reg.status === 'Accepted' ? 'bg-emerald-400' : reg.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400')}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{reg.paperId || `#${reg._id.slice(-6).toUpperCase()}`}</span>
              {!['Accepted', 'Rejected'].includes(reg.status) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRegistration(reg._id);
                  }}
                  className="p-1 hover:bg-white/20 rounded text-white/40 hover:text-white transition-colors"
                  title="Delete Paper"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={() => setIsAddingNew(true)}
            className="px-4 py-2 rounded-xl flex items-center gap-2 bg-slate-900 text-white transition-all shadow-md shadow-slate-200 hover:bg-slate-800 shrink-0 whitespace-nowrap sm:ml-auto"
          >
            <PlusCircle size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Submit New Paper</span>
          </button>
        </motion.div>

        {activeRegistrationId && renderMyPaper(registrations.find(r => r._id === activeRegistrationId))}
      </div>
    );
  };


  const renderMyPaper = (registration) => {
    if (!registration) return null;

    const handleEditDetails = () => {
      setEditData(true);
    };
    
    const isMissingDetails = !registration.personalDetails?.institution || !registration.paperDetails?.abstract;
    
    if (isMissingDetails) {
        return (
          <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible">
            <motion.div variants={overviewItemVariants} className="bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-glass border border-white/60 max-w-5xl mx-auto relative cursor-default overflow-hidden">
               <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
               <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 relative z-10">
                 <AlertCircle size={20} className="text-amber-500 shrink-0" />
                 <p className="text-sm font-semibold text-amber-800">Please complete all required registration details before proceeding to upload your manuscript.</p>
               </div>
               <SubmissionFormSingle
                 registration={registration}
                 user={user}
                 onSuccess={(newReg) => {
                   if (newReg?._id) setActiveRegistrationId(newReg._id);
                   fetchRegistration();
                 }}
               />
            </motion.div>
          </motion.div>
        );
    }

    const paperDetailsSection = (
      <>
        {/* Registration Details Group */}
        {editData ? (
          <motion.div variants={overviewItemVariants} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
             <SubmissionFormSingle 
                registration={registration} 
                user={user} 
                onSuccess={(newReg) => {
                    fetchRegistration();
                    if (newReg?._id) setActiveRegistrationId(newReg._id);
                    setEditData(null);
                }}
                onCancel={() => setEditData(null)}
             />
          </motion.div>
        ) : (

          <motion.div variants={overviewItemVariants} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
            {/* Combined Manuscript Actions */}
            <div className="mb-8 pb-8 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileUp size={14} className="text-slate-400" /> Full Paper Management
              </h3>

              {registration?.status !== 'Accepted' && (
                <div className="flex flex-col gap-4">
                  {registration?.status === 'Rejected' ? (
                    <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center">
                      <AlertCircle size={32} className="text-red-500 mb-3" />
                      <p className="text-sm font-bold text-red-800">
                        This manuscript has been rejected. The decision is final and no further re-submissions are permitted.
                      </p>
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
                        ) : <FileUp size={18} />}
                        {uploading ? 'Uploading...' : 'Upload Full Paper (.docx)'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button onClick={() => handleDownload(registration._id)} className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-lg hover:shadow-slate-200">
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
                  <button onClick={() => handleDownload(registration._id)} className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-lg hover:shadow-slate-200">
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
            </div>
            <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-50 pb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Registration Details</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5" title="Submission Date">
                  <Clock size={12} className="text-slate-400" /> {registration?.createdAt ? new Date(registration.createdAt).toLocaleDateString() : 'N/A'}
                </span>
                {!['Accepted', 'Rejected'].includes(registration?.status) && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleEditDetails}
                      title="Edit Details"
                      className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/50 hover:border-indigo-200"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteRegistration(registration._id)}
                      title="Delete Submission"
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100/50 hover:border-red-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
              <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block mb-3 pl-2">Paper Keywords</span>
                  <div className="flex flex-wrap gap-2 px-2">
                    {registration?.paperDetails?.keywords?.map((keyword, i) => (
                      <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold border border-slate-100">{keyword}</span>
                    )) || <span className="text-sm font-medium text-slate-400 italic">No keywords specified</span>}
                  </div>
                </div>
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block mb-3 pl-2">Academic Governance</span>
                   <div className="space-y-3 px-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Reviewer</span>
                         <span className="text-xs font-bold text-slate-600">{registration?.paperDetails?.assignedReviewer?.name || 'In Evaluation Queue'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Track Chair</span>
                         <span className="text-xs font-bold text-slate-600">{registration?.paperDetails?.assignedChair?.name || 'Conference Chair'}</span>
                      </div>
                   </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </>
      );

      return (
      <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6 pb-12">
        {paperDetailsSection}
      </motion.div>
    );
  };

  const renderPayment = () => {
    const totalBalance = registrations.reduce((acc, reg) => {
      if (reg.paymentStatus !== 'Completed' && reg.status === 'Accepted') {
        return acc + calculateCurrentFee(reg);
      }
      return acc;
    }, 0);

    return (
      <motion.div variants={overviewContainerVariants} initial="hidden" animate="visible" className="space-y-6 pb-12">
        {/* Simplified Header */}
        <motion.div variants={overviewItemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outstanding Balance</p>
              <p className="text-xl font-black text-slate-800 tracking-tight">₹ {totalBalance}</p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Portfolio</p>
             <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{registrations.length} Submissions</p>
          </div>
        </motion.div>

        {/* Offline Payment Instruction Banner */}
        {settings && settings.onlinePaymentEnabled === false && (
          <motion.div variants={overviewItemVariants} className="bg-amber-50 border border-amber-200 p-6 md:p-8 rounded-[2rem] flex items-start gap-5 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 shrink-0 transform -rotate-3">
               <AlertCircle size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                 <ShieldCheck size={16} className="text-amber-600" />
                 Online Gateway Disabled - Offline Payment Only
               </h4>
               <p className="text-xs font-semibold text-amber-800/80 leading-relaxed max-w-2xl">
                 The automated registration gateway is currently offline. For this phase, only <strong>Offline Payments (On-site / Spot Registration)</strong> are being processed. 
                 Please visit the conference registration desk or contact the organizing committee to complete your fee payment and receive your official credentials.
               </p>
               <div className="mt-4 flex gap-3">
                  <div className="px-3 py-1.5 bg-white/60 rounded-lg border border-amber-200 text-[10px] font-black text-amber-700 uppercase tracking-widest">At-Venue Registration Desk</div>
                  <div className="px-3 py-1.5 bg-white/60 rounded-lg border border-amber-200 text-[10px] font-black text-amber-700 uppercase tracking-widest">Spot Payment Only</div>
               </div>
            </div>
          </motion.div>
        )}

        {/* Simplified Paper List */}
        <div className="space-y-4">
          {registrations.map((reg, idx) => {
            const fee = calculateCurrentFee(reg);
            const isIndividualLoading = paymentLoading === reg._id;
            
            return (
              <motion.div key={reg._id} variants={overviewItemVariants} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden border-l-4 border-l-slate-200">
                <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
                  {/* Status & Title */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(reg.status)}`}>{reg.status}</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{reg.paperId || `Submission ${idx+1}`}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-800 truncate mb-1" title={reg.paperDetails?.title}>{reg.paperDetails?.title || 'No Title Provided'}</h4>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.1em]">{reg.personalDetails?.category}</p>
                  </div>

                  {/* Pricing Breakdown (Compact) */}
                  <div className="flex gap-4 px-6 md:border-x border-slate-50 w-full md:w-auto">
                     <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Fee per Author</p>
                        <p className="text-xs font-bold text-slate-700">₹{fee}</p>
                     </div>
                  </div>

                  {/* Precise Action Button */}
                  <div className="w-full md:w-48 shrink-0">
                    {reg.paymentStatus === 'Completed' ? (
                      <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-2.5 rounded-xl border border-emerald-100">
                        <CheckCircle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Paid</span>
                      </div>
                    ) : reg.status === 'Accepted' ? (
                        <button
                          onClick={() => handlePayment(reg._id)}
                          disabled={(paymentLoading && paymentLoading !== reg._id) || (settings && settings.onlinePaymentEnabled === false)}
                          className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
                        >
                          {isIndividualLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CreditCard size={14} />}
                          {settings && settings.onlinePaymentEnabled === false ? 'Online Payment Disabled' : (isIndividualLoading ? 'Wait...' : 'Pay Now')}
                        </button>
                    ) : (
                      <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reviewing</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const CertificateContent = ({ user, acceptedReg }) => (
    <div className="cert-border-main">
      <div className="cert-border-inner">
        {/* Corner Accents - Double Lines */}
        <div className="line-tl-h1"></div><div className="line-tl-h2"></div><div className="line-tl-v1"></div><div className="line-tl-v2"></div>
        <div className="line-tr-h1"></div><div className="line-tr-h2"></div><div className="line-tr-v1"></div><div className="line-tr-v2"></div>
        <div className="line-bl-h1"></div><div className="line-bl-h2"></div><div className="line-bl-v1"></div><div className="line-bl-v2"></div>
        <div className="line-br-h1"></div><div className="line-br-h2"></div><div className="line-br-v1"></div><div className="line-br-v2"></div>

        <div className="cert-print-header">
          <div className="text-center">
            <h1 className="font-serif-premium text-[clamp(1.8rem,5vw,3.2rem)] font-extrabold tracking-[0.15em] text-gold-premium uppercase leading-none mb-1">Certificate</h1>
            <p className="font-sans text-[clamp(0.7rem,2.2vw,1.5rem)] font-light tracking-[0.4em] text-gold-premium uppercase">of participation</p>
          </div>
        </div>

        <div className="cert-print-body flex flex-col justify-center items-center">
          <p className="font-lora text-[0.85rem] font-semibold tracking-[0.2em] text-white/80 uppercase mb-2">This certificate is proudly presented to :</p>
          <h2 className="font-script-premium text-[clamp(2.5rem,8vw,5.2rem)] text-gold-light leading-none mb-1">{user.name}</h2>
          <div className="w-[300px] h-[1px] bg-gold-premium/40 mx-auto mb-4"></div>
          <div className="font-sans text-[0.8rem] leading-relaxed max-w-[85%] mx-auto text-gold-sand/90 text-center font-normal">
            For their active and valued participation in the <strong className="text-gold-premium font-bold text-[0.85rem]">National Conference on Contemporary Innovations in Engineering, Technology & Management (CIETM 2026)</strong>. Their contribution titled <strong className="text-gold-premium font-bold italic">"{acceptedReg?.paperDetails?.title || 'Untitled Research'}"</strong> has significantly enriched the academic discourse of this national convention held on 29th April 2026.
          </div>
        </div>

        <div className="cert-print-footer flex justify-between items-end px-12 pb-4">
          <div className="flex flex-col items-center w-40 text-center">
            <div className="h-[1.2px] bg-gold-premium/60 w-full mb-1.5"></div>
            <p className="font-sans text-[0.85rem] font-black text-white leading-none mb-1">Dr. A. Ramesh</p>
            <p className="font-sans text-[0.55rem] font-bold text-gold-premium uppercase tracking-widest opacity-90">Conference Chair</p>
          </div>

          <div className="cert-seal-container scale-90">
            <div className="cert-gold-seal flex items-center justify-center">
              <Award size={32} className="text-white/30" />
            </div>
          </div>

          <div className="flex flex-col items-center w-40 text-center">
            <div className="h-[1.2px] bg-gold-premium/60 w-full mb-1.5"></div>
            <p className="font-sans text-[0.85rem] font-black text-white leading-none mb-1">Dr. S. Priya</p>
            <p className="font-sans text-[0.55rem] font-bold text-gold-premium uppercase tracking-widest opacity-90">Organizing Secretary</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCertificate = () => {
    const acceptedReg = registrations.find(r => r.status === 'Accepted') || registrations[0];
    
    if (false && !acceptedReg) {
      return (
        <div className="animate-fade-in max-w-4xl mx-auto h-full flex items-center justify-center pt-10">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden text-center w-full">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-amber-100">
              <Lock size={40} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-4">Verification in Progress</h3>
            <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
              Your participation E-certificate will be generated automatically upon the successful acceptance of your manuscript and completion of the conference.
            </p>
            <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50 mb-8 max-w-sm mx-auto">
              <div className="flex items-center gap-4 opacity-50">
                <div className="shrink-0 w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                  <Award size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h4 className="font-bold text-slate-700 truncate">Participation_Certificate.pdf</h4>
                  <p className="text-xs text-slate-500">Document ready after conference</p>
                </div>
              </div>
            </div>
            <button disabled className="inline-flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed border-2 border-slate-200">
              <Download size={16} /> Download Certificate
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade-in space-y-8 pb-10">
        {/* Header Section with Success Badge */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1100px] mx-auto px-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl items-center justify-center shadow-inner border border-emerald-100/50 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Finalized</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Conference E-Certificate</h3>
              </div>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" /> 
                Validated official recognition for CIETM 2026 Participation
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => window.print(), 100);
              }}
              className="group px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 transition-all flex items-center gap-3 active:scale-95 border-b-4 border-slate-700 hover:border-slate-600"
            >
              <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> 
              Save as High-Res PDF
            </button>
          </div>
        </div>

        {/* Certificate Display Stage */}
        <div className="relative max-w-[1200px] mx-auto px-4 md:px-8">
          {/* Decorative Abstract Backgrounds */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-[500px] bg-indigo-50/50 rounded-[4rem] blur-2xl -z-10"></div>
          
          <div className="relative bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/60 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* Glossy Reflection Line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
            
            <div className="certificate-outer-wrapper overflow-hidden flex flex-col items-center">
              <div className="certificate-preview-container flex justify-center items-center py-10 w-full relative">
                {/* Certificate Showcase Shadow */}
                <div className="absolute w-[80%] h-[60%] bg-slate-900/5 blur-[100px] bottom-10 rounded-full"></div>
                
                <div className="certificate-paper scale-[0.38] sm:scale-[0.52] md:scale-[0.62] lg:scale-[0.82] origin-center shadow-[0_40px_100px_-40px_rgba(4,30,66,0.6)] transition-all duration-700 hover:scale-[0.4] sm:hover:scale-[0.54] md:hover:scale-[0.64] lg:hover:scale-[0.84]">
                  <CertificateContent user={user} acceptedReg={acceptedReg} />
                  {/* Subtle Sheen Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none rounded-[inherit]"></div>
                </div>
              </div>
            </div>

            {/* Bottom Insight Bar */}
            <div className="bg-slate-50/80 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-3">
                <FileText size={14} /> 297mm x 210mm (A4 Landscape)
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={14} className="text-emerald-500" /> Digital Integrity Verified
              </div>
              <div className="flex items-center gap-3">
                <Award size={14} className="text-amber-500" /> Official CIETM Seal Attached
              </div>
            </div>
          </div>

          {/* Print Portal */}
          {typeof document !== 'undefined' && ReactDOM.createPortal(
            <div className="print-certificate-view no-screen">
              <div className="certificate-paper print-only">
                <CertificateContent user={user} acceptedReg={acceptedReg} />
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    );
  };

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
              <div className="flex items-center gap-1.5 mt-1 border-t border-slate-200/50 pt-1">
                <span className="text-[0.55rem] font-black text-indigo-600 font-mono tracking-tight">{registration?.userId?.delegateId || user.delegateId || '----'}</span>
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
            { id: 'certificate', icon: Award, label: 'E-Certificate' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setShowIDCard(item.id === 'idcard');
                setActiveTab(item.id);
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
            <button onClick={handleForceSync} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[0.65rem] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all">
               <TrendingUp size={14} /> Force Sync
            </button>
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

            <button
               onClick={() => setShowLogoutModal(true)}
               className="w-11 h-11 bg-red-50 rounded-xl border border-red-100 shadow-sm flex items-center justify-center text-red-600 cursor-pointer hover:bg-red-100 transition-all hover:shadow-md active:scale-95 transition-all"
               title="Sign Out"
            >
               <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto pb-10">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'paper' && renderSubmissionTab()}
            {activeTab === 'payment' && renderPayment()}
            {activeTab === 'certificate' && renderCertificate()}
            {activeTab === 'idcard' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                  <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                      <Award size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Digital ID Identity</h3>
                  <p className="text-slate-500 font-medium mb-8 max-w-sm">Access your official conference delegate pass and verify your identity on-site.</p>
                  <button 
                      onClick={() => setShowIDCard(true)}
                      className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center translate-y-0 active:scale-95 gap-2"
                  >
                      <LayoutDashboard size={18} /> Open ID Card Modal
                  </button>
              </div>
            )}
            {activeTab === 'notifications' && (
              <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="flex justify-end items-center mb-6">
                  {notifications.some(n => !n.isRead) && (
                    <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all">Mark all as read</button>
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
                <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 max-w-4xl relative overflow-hidden">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="space-y-12 pt-4">
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
                                await fetchRegistration();
                                toast.success("Avatar updated successfully!", { icon: '📸' });
                              } catch (error) {
                                 console.error("Avatar Upload Error:", error);
                                 const message = error.response?.data?.message || "Failed to upload image. Please try again.";
                                 toast.error(message);
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
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in print:bg-white print:p-0 cursor-pointer"
            onClick={() => {
              setShowIDCard(false);
              setIsFlipped(false);
            }}
          >
            <div 
              className="flex flex-col gap-6 max-w-[28rem] w-full animate-scale-in print:hidden perspective-1000 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >

              <div
                className="relative cursor-pointer transition-all duration-700 ease-in-out"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  height: '280px'
                }}
              >
                {/* ID Card Front - identity focused */}
                <div
                  className="absolute inset-0 w-full h-full backface-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200">
                    <div className="h-[45%] w-full flex relative overflow-hidden">
                      <div className="w-[45%] h-full bg-[#1a237e] relative z-10 flex flex-col justify-center px-6">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-1">
                            <Award className="text-white" size={24} />
                          </div>
                          <h4 className="text-white font-black text-sm tracking-widest text-center leading-tight">CIETM<br />2026</h4>
                        </div>
                        {/* Angled Divider */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-[#1a237e] transform translate-x-1/2 -skew-x-[20deg] z-0"></div>
                      </div>
                      <div className="flex-1 h-full relative">
                        <img src="/assets/ciet.jpeg" alt="CIET" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-indigo-900/10"></div>
                      </div>
                    </div>

                    {/* Profile Picture overlay - adjusted size and position */}
                    <div className="absolute top-[22%] right-[8%] w-[34%] flex flex-col items-center gap-4 z-40">
                      <div className="w-full aspect-square ring-[6px] ring-white rounded-2xl overflow-hidden shadow-xl bg-slate-50 border border-slate-100/50">
                        {registration?.personalDetails?.profilePicture ? (
                          <img src={registration.personalDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-50"><User size={60} /></div>
                        )}
                      </div>
                      
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 rounded-md shadow-md">
                         <span className="text-[7px] font-black text-white uppercase tracking-[0.1em] whitespace-nowrap">Official Delegate</span>
                      </div>
                    </div>

                    <div className="h-[40%] w-full px-10 flex flex-col justify-center pt-10">
                      <div className="max-w-[60%]">
                        <h5 className="text-xl font-black text-indigo-950 leading-tight uppercase tracking-tight line-clamp-2">{user.name}</h5>
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs font-black text-indigo-600 tracking-wider font-mono">
                            {registration?.userId?.delegateId || user.delegateId || 'DELEGATE'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-80">Date: 29.04.2026</p>
                        </div>

                        {/* Barcode in previous badge location - increased size */}
                        <div className="mt-6 flex flex-col gap-1.5 opacity-40">
                          <div className="flex gap-[1.5px] h-8">
                            {[2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1].map((w, i) => (
                              <div key={i} style={{ width: `${w * 2}px` }} className="bg-slate-900" />
                            ))}
                          </div>
                          <span className="text-[7px] font-black tracking-[0.3em] font-mono">{registration?.userId?.delegateId || user.delegateId || 'CIETM-2026'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ID Card Back - technical details */}
                <div
                  className="absolute inset-0 w-full h-full backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="w-full h-full bg-[#1a237e] rounded-3xl shadow-2xl overflow-hidden relative border border-indigo-800 text-white p-8 px-10 flex gap-10 items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-2xl shrink-0 border-4 border-white/10 ring-1 ring-white/20">
                      <QRCode value={registration?.userId?.delegateId || user.delegateId || user._id} size={110} />
                    </div>

                    <div className="flex-1 h-full flex flex-col justify-between py-2">
                      <div className="space-y-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Department</span>
                          <span className="text-xs font-bold leading-tight line-clamp-1">{registration?.personalDetails?.department || 'Academic'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Institution</span>
                          <span className="text-[10px] font-bold line-clamp-2 leading-tight uppercase opacity-90">{registration?.personalDetails?.institution || 'CIET INSTITUTION'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Presentation Track</span>
                          <span className="text-xs font-bold leading-tight text-amber-400">{registration?.paperDetails?.track || 'CONFERENCE TRACK'}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10 mt-auto flex justify-between items-end">
                        <div>
                          <p className="text-xs italic font-serif opacity-80 border-b border-indigo-400 px-2">Gowsik</p>
                          <span className="text-[7px] font-black uppercase tracking-widest opacity-40 block mt-1.5">Authorized Sign</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[7px] font-black uppercase tracking-widest opacity-40 block mb-1">CIETM 2026 OFFICIAL</span>
                          <div className="flex items-center gap-1 justify-end">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-black tracking-widest uppercase">Verified</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-500 px-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></div> Click card to flip
                </p>
                <div className="flex gap-2">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${!isFlipped ? 'w-4 bg-indigo-600' : 'bg-slate-300'}`}></div>
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isFlipped ? 'w-4 bg-indigo-600' : 'bg-slate-300'}`}></div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                  <Download size={18} /> Print pass
                </button>
                <button
                  onClick={() => {
                    setShowIDCard(false);
                    setIsFlipped(false);
                  }}
                  className="px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Layout: Both sides shown clearly on one page */}
            <div className="hidden print:flex flex-col gap-10 bg-white p-10 h-screen justify-center">
              {/* Card Front */}
              <div className="w-[85.6mm] h-[53.98mm] bg-white rounded-[4mm] overflow-hidden relative border-[0.5mm] border-slate-200 mx-auto font-sans shadow-none">
                <div className="h-[42%] w-full flex relative overflow-hidden">
                  <div className="w-[45%] h-full bg-[#1a237e] relative z-10 flex flex-col justify-center px-[6mm]">
                    <div className="flex flex-col items-center">
                      < Award className="text-white mb-[1mm]" size={18} />
                      <h4 className="text-white font-black text-[3.2mm] tracking-widest text-center leading-tight uppercase">CIETM<br />2026</h4>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-[12mm] bg-[#1a237e] transform translate-x-1/2 -skew-x-[20deg]"></div>
                  </div>
                  <div className="flex-1 h-full">
                    <img src="/assets/ciet.jpeg" className="w-full h-full object-cover brightness-[0.95]" />
                  </div>
                </div>
                <div className="absolute top-[26%] right-[8%] w-[33%] flex flex-col items-center gap-[4mm] z-40">
                  <div className="w-full aspect-square ring-[1.2mm] ring-white rounded-[3mm] overflow-hidden bg-slate-100 border-[0.4mm] border-slate-200">
                    {registration?.personalDetails?.profilePicture ? (
                      <img src={registration.personalDetails.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={36} /></div>
                    )}
                  </div>
                  <div className="inline-block px-[3mm] py-[1.2mm] bg-indigo-600 rounded-[1mm]">
                    <span className="text-white text-[1.8mm] font-black uppercase tracking-[0.5mm]">Official Delegate</span>
                  </div>
                </div>
                <div className="h-[58%] w-full px-[10mm] flex flex-col justify-center pt-[10mm]">
                  <div className="w-[60%]">
                    <h5 className="text-[4.2mm] font-black text-indigo-950 uppercase leading-tight line-clamp-2">{user.name}</h5>
                    <div className="mt-[2mm] space-y-[0.5mm]">
                      <span className="text-[2.2mm] font-black text-indigo-600 tracking-widest block font-mono">
                        {registration?.userId?.delegateId || user.delegateId || 'DELEGATE'}
                      </span>
                      <span className="text-[1.8mm] font-bold text-slate-400 uppercase tracking-widest block">Date: 29.04.2026</span>
                    </div>
                    {/* Barcode - increased size */}
                    <div className="mt-[6mm] flex flex-col gap-[1mm] opacity-40">
                      <div className="flex gap-[0.3mm] h-[6mm]">
                        {[2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1].map((w, i) => (
                          <div key={i} style={{ width: `${w}mm` }} className="bg-slate-900" />
                        ))}
                      </div>
                      <span className="text-[2mm] font-black tracking-[0.3em] font-mono">{registration?.userId?.delegateId || user.delegateId || 'CIETM-2026'}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute left-0 bottom-0 bg-indigo-600 px-[5mm] py-[1.5mm] rounded-tr-[3mm]">
                  <span className="text-white text-[2mm] font-black uppercase tracking-widest">Delegate Pass Front</span>
                </div>
              </div>

              {/* Card Back */}
              <div className="w-[85.6mm] h-[53.98mm] bg-[#1a237e] rounded-[4mm] overflow-hidden relative border-[0.5mm] border-indigo-900 mx-auto font-sans shadow-none text-white p-[8mm] px-[10mm] flex gap-[8mm] items-center">
                <div className="bg-white p-[1.5mm] rounded-[3mm] shrink-0 border-[1mm] border-white/10">
                  <QRCode value={registration?.userId?.delegateId || user.delegateId || user._id} size={42} style={{ height: "18mm", width: "18mm" }} />
                </div>
                <div className="flex-1 flex flex-col justify-between py-[1mm]">
                  <div className="space-y-[3mm]">
                    <div className="flex flex-col text-[2.5mm]">
                      <span className="font-black text-indigo-300 uppercase tracking-widest mb-[0.5mm]">Institution Name</span>
                      <span className="font-bold uppercase line-clamp-2 leading-tight">{registration?.personalDetails?.institution || 'CIET INSTITUTION'}</span>
                    </div>
                    <div className="flex flex-col text-[2.5mm]">
                      <span className="font-black text-indigo-300 uppercase tracking-widest mb-[0.5mm]">Department & Track</span>
                      <span className="font-bold line-clamp-1 leading-tight">{registration?.personalDetails?.department || 'Academic'} - {registration?.paperDetails?.track || 'Track'}</span>
                    </div>
                  </div>
                  <div className="pt-[4mm] mt-auto flex justify-between items-end border-t border-white/10">
                    <div>
                      <p className="text-[3mm] italic font-serif border-b-[0.2mm] border-indigo-400 opacity-70">Gowsik</p>
                      <span className="text-[2.2mm] font-black uppercase opacity-50 block mt-[0.5mm]">Authorized Sign</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[3.2mm] font-bold text-amber-400">29.04.2026</span>
                    </div>
                  </div>
                </div>
                <div className="absolute left-0 bottom-0 bg-indigo-500 px-[5mm] py-[1.5mm] rounded-tr-[3mm]">
                  <span className="text-white text-[2mm] font-black uppercase tracking-widest">Delegate Pass Back</span>
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
