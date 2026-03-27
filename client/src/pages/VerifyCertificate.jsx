import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, ShieldCheck, Calendar, User, FileText, Info, Search, ArrowRight, Award, Globe, BadgeCheck, LayoutDashboard, MapPin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VerifyCertificate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [verificationData, setVerificationData] = useState(null);
    const [error, setError] = useState(null);
    const [manualId, setManualId] = useState('');

    const verify = async (certId) => {
        if (!certId) return;
        setLoading(true);
        setError(null);
        setVerificationData(null);
        try {
            const response = await axios.get(`/api/certificate/verify/${certId}`);
            setVerificationData(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. This certificate might be invalid.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            verify(id);
        }
    }, [id]);

    const handleManualVerify = (e) => {
        e.preventDefault();
        if (manualId.trim()) {
            navigate(`/verify-certificate/${manualId.trim()}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none -mr-40 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-3xl pointer-events-none -ml-40 -mb-20"></div>

            <div className="max-w-4xl mx-auto px-6 py-10 relative z-10 flex flex-col min-h-screen">
                {/* Header Section (Compact) */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 md:mb-16">
                    <Link to="/" className="flex items-center gap-4 group">
                        <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-100/50 group-hover:-rotate-3 transition-transform duration-500">
                             <Award size={24} />
                        </div>
                        <div>
                             <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">CIETM <span className="text-indigo-600">2026</span></h2>
                             <div className="flex items-center gap-2 mt-0.5">
                                <div className="h-0.5 w-6 bg-indigo-500 rounded-full"></div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Validation Hub</p>
                             </div>
                        </div>
                    </Link>

                    <form onSubmit={handleManualVerify} className="relative group w-full max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                            <Search size={18} />
                        </div>
                        <input 
                            type="text"
                            placeholder="Enter Registry ID or Paper Reference..."
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-full py-3.5 pl-14 pr-6 outline-none focus:border-indigo-500/50 focus:shadow-xl focus:shadow-indigo-100 transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300 shadow-sm"
                        />
                        {manualId && (
                            <button type="submit" className="absolute right-2 top-1.5 bottom-1.5 px-5 bg-slate-900 hover:bg-indigo-600 rounded-full text-white font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-200">
                                Verify
                            </button>
                        )}
                    </form>
                </div>

                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        {id ? (
                            loading ? (
                                <motion.div 
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-12 min-h-[300px]"
                                >
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-indigo-50 rounded-full animate-spin"></div>
                                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <ShieldCheck className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={28} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Locating Record</h3>
                                    <p className="text-slate-400 text-[8px] mt-2 font-black uppercase tracking-[0.3em]">Accessing CIETM Database Registry Authority...</p>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="result"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
                                >
                                    {/* Status Column (Compact) */}
                                    <div className="lg:col-span-5 space-y-6">
                                        {verificationData?.isValid ? (
                                            <div className="space-y-6 animate-fade-in text-center lg:text-left">
                                                <div className="inline-flex p-4 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 transform hover:-rotate-6 transition-transform duration-500">
                                                    <BadgeCheck size={40} />
                                                </div>
                                                <div className="space-y-3">
                                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">VERIFIED<br/><span className="text-indigo-600">AUTHENTIC</span></h1>
                                                    <div className="h-1 w-16 bg-indigo-600 rounded-full mx-auto lg:mx-0"></div>
                                                    <p className="text-slate-500 text-sm font-semibold italic max-w-sm mx-auto lg:mx-0">
                                                        This digital credential is authenticated and registered in the CIETM-2026 database.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 text-center lg:text-left">
                                                <div className="inline-flex p-4 rounded-3xl bg-red-500 text-white shadow-xl shadow-red-100">
                                                    <XCircle size={40} />
                                                </div>
                                                <div className="space-y-3">
                                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase text-center lg:text-left">FAILED<br/><span className="text-red-500 text-center lg:text-left">INVALID</span></h1>
                                                    <div className="h-1 w-16 bg-red-500 rounded-full mx-auto lg:mx-0"></div>
                                                    <p className="text-slate-500 text-sm font-semibold italic max-w-sm mx-auto lg:mx-0 text-center lg:text-left">
                                                        {error || 'The identity record could not be found or has been revoked by the authority.'}
                                                    </p>
                                                </div>
                                                <Link to="/verify-certificate" className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                                                    <Search size={14} /> New Lookup
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Column (Compact) */}
                                    {verificationData?.success && (
                                        <div className="lg:col-span-7 space-y-10 py-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8">
                                                {/* Entry 1 */}
                                                <div className="space-y-2 group">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block opacity-70 group-hover:opacity-100 transition-opacity">Certified Holder</span>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-indigo-50 transition-colors">
                                                            <User size={20} />
                                                        </div>
                                                        <p className="text-xl font-black text-slate-900 tracking-tight">{verificationData.data.participantName}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 group">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block opacity-70 group-hover:opacity-100 transition-opacity">Record ID</span>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                                            <Globe size={20} />
                                                        </div>
                                                        <p className="text-lg font-black text-slate-800 tracking-tight uppercase font-mono">{id?.toUpperCase()}</p>
                                                    </div>
                                                </div>

                                                {/* Full Width Paper Title */}
                                                <div className="md:col-span-2 space-y-2 group">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block opacity-70 group-hover:opacity-100 transition-opacity">Authenticated Research Contribution</span>
                                                    <div className="flex gap-6 items-start">
                                                        <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform duration-700">
                                                            <FileText size={28} />
                                                        </div>
                                                        <div className="flex-1 border-l-2 border-indigo-600 pl-6 py-1">
                                                            <p className="text-xl md:text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">
                                                                {verificationData.data.paperTitle}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-4">
                                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest">CIETM-2026</span>
                                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest uppercase">Verified Participant</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 group pt-4">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block opacity-70 group-hover:opacity-100 transition-opacity">Issue & Authority</span>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                                            <Calendar size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-black text-slate-800 tracking-tight">
                                                                {new Date(verificationData.data.issuedAt || '2026-05-05').toLocaleDateString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Validated Issue Date</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 group pt-4">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block opacity-70 group-hover:opacity-100 transition-opacity">Hosting Venue</span>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                                            <MapPin size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 leading-tight">CIET Coimbatore</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Campus Registry Authority</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Formal Statement (Ultra Compact) */}
                                                <div className="md:col-span-2 pt-8">
                                                    <div className="p-6 rounded-3xl bg-indigo-50/40 border border-indigo-100/50 flex gap-5 items-start">
                                                        <div className="w-10 h-10 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                                                            <Sparkles size={18} />
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold italic">
                                                            Authenticated via the CIETM-2026 Public Registry. This record serves as official confirmation of conference participación. Alteration of this digital record is strictly prohibited.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-10 min-h-[400px] text-center"
                            >
                                <div className="space-y-8">
                                    <div className="inline-flex p-6 rounded-3xl bg-white border border-slate-100 text-indigo-600 shadow-xl relative mb-2 group hover:scale-105 transition-transform">
                                        <div className="absolute inset-0 bg-indigo-100/30 blur-2xl rounded-full"></div>
                                        <ShieldCheck size={64} className="relative z-10 opacity-80" />
                                    </div>
                                    <div className="space-y-4">
                                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4 uppercase">Registry<br/><span className="text-indigo-600">Portal</span></h1>
                                        <p className="text-slate-500 text-base font-semibold max-w-sm mx-auto leading-relaxed">
                                            Institutional gateway for verifying participation and credential authenticity for CIETM-2026.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 pt-8">
                                        <div className="h-[2px] w-12 bg-slate-100"></div>
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                        </div>
                                        <div className="h-[2px] w-12 bg-slate-100"></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* Footer (Compact) */}
                <footer className="mt-16 pt-8 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-6 pb-12 opacity-80">
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <div className="text-[9px] font-black text-slate-900 uppercase tracking-widest">CIETM-2026 Registry</div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">Coimbatore Institute of Engineering & Technology &copy; 2026</p>
                    </div>
                    
                    <Link to="/" className="group flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-slate-200 hover:border-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest text-slate-500 hover:text-indigo-600">
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /> Back to Conference
                    </Link>
                </footer>
            </div>
        </div>
    );
};

export default VerifyCertificate;
