import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle,
  XCircle, Search, Home,
  LayoutDashboard, Award, Layers,
  Settings, Bell, Shield, ChevronRight,
  TrendingUp, Download, Menu, X, Edit2, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { downloadFile } from '../utils/downloadHelper';

const ReviewerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: '', remarks: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    college: user?.college || '',
    password: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
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

    // Mark as read if it's not already
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    // Check if it's a deep link for a paper
    if (notification.link.includes('paperId=')) {
      const paperId = notification.link.split('paperId=')[1];
      setActiveTab('assigned');
      setExpandedRow(paperId);
      
      // Find the registration to set the form state if needed
      const reg = registrations.find(r => r._id === paperId);
      if (reg) {
        setReviewForm({ 
          status: reg.status === 'Submitted' ? 'Under Review' : reg.status, 
          remarks: reg.paperDetails?.reviewerComments || '' 
        });
      }
    } else if (notification.link === '/reviewer/dashboard') {
      setActiveTab('assigned');
    }
  };

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      // Sync both registrations and notifications
      const [regRes, notifRes] = await Promise.all([
        axios.get('/api/registrations', config),
        axios.get('/api/notifications', config)
      ]);
      setRegistrations(regRes.data);
      setNotifications(notifRes.data);
    } catch (error) {
       toast.error("Failed to sync dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReviewToggle = (reg) => {
    if (expandedRow === reg._id) {
      setExpandedRow(null);
      setReviewForm({ status: '', remarks: '' });
    } else {
      setExpandedRow(reg._id);
      setReviewForm({ 
        status: reg.status === 'Submitted' ? 'Under Review' : reg.status, 
        remarks: reg.paperDetails?.reviewerComments || '' 
      });
    }
  };

  const submitReview = async (id) => {
    if (!reviewForm.status) return toast.error("Please select a status");
    if (!reviewForm.remarks) return toast.error("Please add some comments");

    setSubmittingReview(true);
    const loadingToast = toast.loading("Submitting review...");
    try {
      await axios.put(`/api/registrations/${id}/review`, { 
        status: reviewForm.status, 
        remarks: reviewForm.remarks 
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(`Submission updated to ${reviewForm.status}`, { id: loadingToast });
      setExpandedRow(null);
      setReviewForm({ status: '', remarks: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Review action failed", { id: loadingToast });
    } finally {
      setSubmittingReview(false);
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

  const filteredData = registrations.filter(reg => {
    // Only show submissions from users who are still authors
    const isStillAuthor = reg.userId?.role === 'author';
    if (!isStillAuthor) return false;

    // Security Check: Only show papers actively assigned to THIS reviewer
    const assignedReviewerId = reg.paperDetails?.assignedReviewer?._id || reg.paperDetails?.assignedReviewer;
    if (assignedReviewerId !== user?._id) return false;

    const paperID = reg.paperId || (reg.personalDetails?.authorId || '');
    const paperTitle = reg.paperDetails?.title || '';
    const delegateId = reg.userId?.delegateId || '';
    
    return paperID.toLowerCase().includes(search.toLowerCase()) ||
           paperTitle.toLowerCase().includes(search.toLowerCase()) ||
           delegateId.toLowerCase().includes(search.toLowerCase());
  }).filter(reg => reg.status !== 'Draft'); // Reviewers don't see drafts

  if (loading) return <DashboardSkeleton />;

  const overviewContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const overviewItemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-[70] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 leading-none">CIETM <span className="text-indigo-600">2026</span></h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
                Reviewer Portal
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'assigned', label: 'My Reviews', icon: Award },
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
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg overflow-hidden shadow-inner border border-white">
                {(() => {
                  const myReg = registrations.find(r => (r.userId?._id || r.userId) === user?._id);
                  return myReg?.personalDetails?.profilePicture ? (
                    <img src={myReg.personalDetails.profilePicture} alt="" className="w-full h-full object-cover" />
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
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between z-40">
           <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu size={20} /></button>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-4">
            {refreshing && <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>}
            <button onClick={fetchData} className="p-3 md:px-4 md:py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
               <TrendingUp size={14} /> Force Sync
            </button>
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">Reviewer: {user?.name}</span>
            <button
              onClick={logout}
              className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-all shadow-sm flex items-center gap-2"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <motion.div 
              variants={overviewContainerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Welcome Card */}
              <motion.div variants={overviewItemVariants} className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 shrink-0"></div>
                 <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-white/10 text-indigo-300">Reviewer Portal active</span>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-2 text-white drop-shadow-sm">Welcome Back,<br />{user?.name.split(' ')[0]}</h2>
                    <p className="text-slate-400 text-sm font-medium max-w-md">Your expertise helps maintain the high standards of CIETM-2026. You have <span className="text-white font-bold">{filteredData.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length} papers</span> awaiting your evaluation.</p>
                 </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div variants={overviewItemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Total Assigned', value: filteredData.length, icon: Layers, color: 'indigo' },
                  { label: 'Pending Review', value: filteredData.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length, icon: Clock, color: 'amber' },
                  { label: 'Completed', value: filteredData.filter(r => r.status === 'Accepted' || r.status === 'Rejected').length, icon: CheckCircle, color: 'blue' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-3xl font-black text-slate-800`}>{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Recent Action List */}
              <motion.div variants={overviewItemVariants} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Priority Assignments</h3>
                  <button onClick={() => setActiveTab('assigned')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredData.filter(r => r.status === 'Submitted' || r.status === 'Under Review').slice(0, 3).length > 0 ? (
                    filteredData.filter(r => r.status === 'Submitted' || r.status === 'Under Review').slice(0, 3).map(reg => (
                      <div key={reg._id} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-100 uppercase tracking-tighter shrink-0">
                            {reg.personalDetails?.authorId?.slice(-2) || '??'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate max-w-xs">{reg.paperDetails?.title}</p>
                             <div className="flex flex-col gap-0.5 mt-1 font-mono">
                               <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Delegate: {reg.userId?.delegateId || 'N/A'}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Paper: {reg.paperId || 'N/A'}</p>
                             </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setActiveTab('assigned');
                            setExpandedRow(reg._id);
                            setReviewForm({ 
                              status: reg.status === 'Submitted' ? 'Under Review' : reg.status, 
                              remarks: reg.paperDetails?.reviewerComments || '' 
                            });
                          }}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          Start Review
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-8 py-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <CheckCircle size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">All caught up!</p>
                      <p className="text-xs text-slate-400 mt-1">Check back later for new assignments.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'assigned' && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by ID or Title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-sm"
                />
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paper ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredData.map(reg => (
                       <React.Fragment key={reg._id}>
                         <tr className={`hover:bg-slate-50 transition-colors ${expandedRow === reg._id ? 'bg-indigo-50/30' : ''}`}>
                           <td className="px-6 py-4">
                             <div className="flex flex-col gap-0.5 font-mono">
                               <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">DEG: {reg.userId?.delegateId || 'N/A'}</p>
                               <p className="text-[10px] font-bold text-slate-800 tracking-tighter">PAP: {reg.paperId || 'N/A'}</p>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] uppercase overflow-hidden border border-slate-100 shadow-sm">
                                 {reg.personalDetails?.profilePicture ? (
                                   <img src={reg.personalDetails.profilePicture} alt="" className="w-full h-full object-cover" />
                                 ) : (reg.personalDetails?.name || reg.userId?.name)?.charAt(0)}
                               </div>
                               <p className="text-xs font-black text-slate-700 truncate max-w-[120px]">{reg.personalDetails?.name || reg.userId?.name}</p>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <p className="text-sm font-bold text-slate-700 truncate max-w-xs">{reg.paperDetails?.title || 'Untitled Submission'}</p>
                             {reg.paperDetails?.track && (
                               <span className="mt-1.5 inline-block px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[250px] shadow-sm">
                                 {reg.paperDetails.track}
                               </span>
                             )}
                           </td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                reg.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                                reg.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                reg.status === 'Under Review' ? 'bg-amber-100 text-amber-700' :
                                'bg-indigo-50 text-indigo-600'
                              }`}>
                                {reg.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                                 <button
                                    onClick={async () => {
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
                                    className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-lg transition-all shadow-sm border border-slate-100"
                                    title="Download Manuscript"
                                 >
                                   <Download size={16} />
                                </button>
                               <button 
                                 onClick={() => handleReviewToggle(reg)} 
                                 className={`p-2 rounded-lg transition-all shadow-sm border ${expandedRow === reg._id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-600'}`} 
                                 title="Post Review"
                               >
                                   <Edit2 size={16} />
                               </button>
                             </div>
                           </td>
                         </tr>
                         {expandedRow === reg._id && (
                           <tr>
                             <td colSpan="4" className="px-6 py-0 bg-indigo-50/30">
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden pb-8 pt-2"
                               >
                                 <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm space-y-4">
                                   <div className="flex items-center justify-between mb-2">
                                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submission Review Form</h4>
                                     <button onClick={() => setExpandedRow(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                     <div className="md:col-span-1">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Review Decision</label>
                                       <div className="flex flex-col gap-2.5">
                                         {['Under Review', 'Accepted', 'Rejected'].map((s) => (
                                           <button
                                             key={s}
                                             type="button"
                                             onClick={() => setReviewForm({ ...reviewForm, status: s })}
                                             className={`w-full py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-300 text-left flex items-center justify-between group ${
                                               reviewForm.status === s 
                                               ? (s === 'Accepted' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' : s === 'Rejected' ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/20' : 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-500/20')
                                               : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-indigo-200'
                                             }`}
                                           >
                                             {s}
                                             {reviewForm.status === s && <CheckCircle size={14} className="animate-in zoom-in" />}
                                           </button>
                                         ))}
                                       </div>
                                     </div>
                                      <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Reviewer Comments</label>
                                       <textarea 
                                         value={reviewForm.remarks}
                                         onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                                         placeholder="Provide detailed feedback for the author..."
                                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all min-h-[175px] resize-none shadow-inner"
                                       />
                                     </div>
                                   </div>

                                   <div className="flex justify-end gap-3 pt-2">
                                     <button 
                                       onClick={() => setExpandedRow(null)}
                                       className="px-5 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                     >
                                       Cancel
                                     </button>
                                     <button 
                                       onClick={() => submitReview(reg._id)}
                                       disabled={submittingReview}
                                       className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                     >
                                       {submittingReview ? 'Submitting...' : 'Submit Final Review'}
                                     </button>
                                   </div>
                                 </div>
                               </motion.div>
                             </td>
                           </tr>
                         )}
                       </React.Fragment>
                     ))}
                  </tbody>
                </table>
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
                             {(n.link?.includes('paperId=') || 
                               (n.link === '/reviewer/dashboard' && 
                                (n.title?.includes('Assigned') || n.title?.includes('Assignment'))
                               )) && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationAction(n);
                                  }} 
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                  Review Submission <ChevronRight size={10} />
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

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                   <Settings className="text-indigo-600" /> Account Settings
                </h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Full Name</label>
                     <input
                       type="text"
                       value={profileData.name}
                       onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                       className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                          className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. Computer Science"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">College/Institution</label>
                        <input
                          type="text"
                          value={profileData.college}
                          onChange={(e) => setProfileData({ ...profileData, college: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. CIET"
                        />
                      </div>
                   </div>
                   <div className="pt-4 border-t border-slate-100">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">New Password (Optional)</label>
                     <input
                       type="password"
                       placeholder="Leave blank to keep current password"
                       value={profileData.password}
                       onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                       className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                     />
                   </div>
                   <div className="pt-4">
                     <button
                       disabled={updatingProfile}
                       className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all disabled:opacity-50"
                     >
                       {updatingProfile ? 'Saving...' : 'Update Account Profile'}
                     </button>
                   </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReviewerDashboard;
