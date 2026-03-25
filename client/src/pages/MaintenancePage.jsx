import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Sparkles, Clock, Globe, ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const MaintenancePage = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 py-12 text-center pointer-events-auto">
        {/* Logo/Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-300 text-xs font-black uppercase tracking-[0.2em] mb-12"
        >
          <Sparkles size={14} className="text-amber-400" />
          <span>CIETM 2026</span>
        </motion.div>

        {/* Floating Icon */}
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="mb-10 relative inline-block"
        >
            <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl rotate-3">
                <Settings className="w-12 h-12 md:w-16 md:h-16 text-indigo-400 animate-spin-slow" />
            </div>
            <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 p-3 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl border border-white/20 shadow-xl"
            >
                <Clock className="w-6 h-6 text-white" />
            </motion.div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h1 className="text-4xl md:text-7xl font-black mb-6 text-white tracking-tighter uppercase leading-tight">
            Under <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-600">Maintenance</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed mb-12">
            We're fine-tuning <span className="text-indigo-300">CIETM-2026</span> to provide you with a more premium experience. We'll be back shortly!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-slate-300 font-bold text-sm uppercase tracking-widest whitespace-nowrap">Systems: Optimizing</span>
              </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12"
        >
          <Link to="/" className="group inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_50px_rgba(99,102,241,0.6)] transition-all hover:scale-105">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <a href="mailto:support@cietm2026.com" className="inline-flex items-center gap-2 px-10 py-5 bg-white/5 border border-white/10 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all hover:border-white/20">
            <Mail size={18} />
            Contact Support
          </a>
        </motion.div>

        {/* Footer info */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-24 pt-8 border-t border-white/5 flex flex-col items-center gap-4"
        >
            <div className="flex items-center gap-6">
                <Globe className="text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer" size={20} />
                <Settings className="text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer" size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">
                &copy; 2026 CIETM. All Rights Reserved.
            </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
