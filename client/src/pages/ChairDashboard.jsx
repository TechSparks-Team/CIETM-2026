import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  FileCheck, Clock, CheckCircle,
  XCircle, Search, Home,
  LayoutDashboard, PieChart,
  Settings, Bell, Shield, ChevronRight,
  TrendingUp, Download, Menu, X, Users, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ChairDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get('/api/registrations', config);
      setRegistrations(data);
    } catch (error) {
      toast.error("Failed to sync dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    const remarks = prompt(`Enter evaluation remarks for ${status}:`);
    if (remarks === null) return;

    try {
      await axios.put(`/api/registrations/${id}/review`, { status, remarks }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      toast.success(`Submission updated to: ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Review action failed");
    }
  };

  const filteredData = registrations.filter(reg => {
    const authorName = reg.personalDetails?.name || reg.userId?.name || '';
    const paperTitle = reg.paperDetails?.title || '';
    return authorName.toLowerCase().includes(search.toLowerCase()) ||
           paperTitle.toLowerCase().includes(search.toLowerCase());
  }).filter(reg => reg.status !== 'Draft');

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50">Loading Editor / Chair Dashboard...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-[70] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter text-slate-800 leading-none">CIETM</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Chair / Editor</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Monitor Board', icon: LayoutDashboard },
              { id: 'submissions', label: 'All Submissions', icon: Layers },
              { id: 'decisions', label: 'Final Decisions', icon: FileCheck },
              { id: 'assignments', label: 'Assign Reviewers', icon: Users },
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
          <Link to="/" className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Home size={12} /> Exit to Site
          </Link>
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
            <span className="text-xs font-bold text-slate-400">Welcome, {user?.name} (Chair/Editor)</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
                <p className="text-3xl font-black text-slate-800">{filteredData.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-green-600">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Finalized</p>
                <p className="text-3xl font-black">{filteredData.filter(r => r.status === 'Accepted').length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-amber-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Review</p>
                <p className="text-3xl font-black">{filteredData.filter(r => r.status === 'Under Review').length}</p>
              </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-blue-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Assignments</p>
                <p className="text-3xl font-black">{filteredData.filter(r => r.status === 'Submitted' && !r.paperDetails?.reviewerComments).length}</p>
              </div>
            </div>
          )}

          {(activeTab === 'submissions' || activeTab === 'decisions') && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search papers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-sm"
                />
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Research Title</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map(reg => (
                      <tr key={reg._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{reg.personalDetails?.name || reg.userId?.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{reg.authorId}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 truncate max-w-sm">{reg.paperDetails?.title}</p>
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
                             <a 
                                href={`/api/registrations/download/${reg._id}?token=${user.token}`} 
                                target="_blank" rel="noreferrer"
                                className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg"
                                title="Download Manuscript"
                             >
                                <Download size={16} />
                             </a>
                            {activeTab === 'decisions' && (
                              <>
                                <button onClick={() => handleReview(reg._id, 'Accepted')} className="p-2 bg-green-50 text-green-600 rounded-lg" title="Final Acceptance"><CheckCircle size={16} /></button>
                                <button onClick={() => handleReview(reg._id, 'Rejected')} className="p-2 bg-red-50 text-red-600 rounded-lg" title="Final Rejection"><XCircle size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
             <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
                <Users size={48} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">Reviewer Assignment Tool</h3>
                <p className="text-slate-500 text-sm max-w-md text-center">Admin can manage Reviewer accounts. This tool will allow Chairs to map specific submissions to active Reviewers.</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChairDashboard;
