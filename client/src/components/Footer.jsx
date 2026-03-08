import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, 
  Facebook, Twitter, Linkedin, Instagram,
  ChevronRight, Sparkles 
} from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/' + id);
      return;
    }
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const socialLinkClass = "w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all duration-300 border border-transparent hover:bg-white hover:text-indigo-600 hover:border-indigo-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10";
  const footerLinkClass = "text-slate-500 font-semibold text-sm flex items-center justify-center lg:justify-start gap-2 transition-colors hover:text-indigo-600 group";

  return (
    <footer className="bg-white pt-24 pb-0 relative overflow-hidden border-t border-slate-100">
      {/* Visual Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 pb-20 text-center lg:text-left">
          {/* Brand & Mission - Spans 4 columns */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
            <Link to="/" className="text-3xl font-black text-slate-900 tracking-tighter mb-2 flex items-center gap-2 group" onClick={() => scrollToSection('#hero')}>
              CIETM <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 p-1">2026</span>
            </Link>
            <p className="text-slate-500 leading-relaxed mb-10 text-base max-w-sm font-medium text-justify">
              Join the global dialogue at the prestigious International Conference on Engineering, Technology and Management. 
              Driving innovation through multidisciplinary excellence.
            </p>
            <div className="flex gap-4 justify-center lg:justify-start">
              <a href="#" aria-label="Facebook" className={socialLinkClass}><Facebook size={20} /></a>
              <a href="#" aria-label="Twitter" className={socialLinkClass}><Twitter size={20} /></a>
              <a href="#" aria-label="LinkedIn" className={socialLinkClass}><Linkedin size={20} /></a>
              <a href="#" aria-label="Instagram" className={socialLinkClass}><Instagram size={20} /></a>
            </div>
          </div>
    
          {/* Quick Links Group */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8 w-full">
            <div>
              <h4 className="text-sm font-black mb-8 text-slate-900 uppercase tracking-widest px-1 border-l-4 border-indigo-500 inline-block">Navigation</h4>
              <ul className="space-y-4">
                <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('#about'); }} className={footerLinkClass}>Host Institution</a></li>
                <li><a href="#speakers" onClick={(e) => { e.preventDefault(); scrollToSection('#speakers'); }} className={footerLinkClass}>Keynote Speakers</a></li>
                <li><a href="#conference" onClick={(e) => { e.preventDefault(); scrollToSection('#conference'); }} className={footerLinkClass}>Call for Papers</a></li>
                <li><a href="#advisory-board" onClick={(e) => { e.preventDefault(); scrollToSection('#advisory-board'); }} className={footerLinkClass}>Advisory Board</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-black mb-8 text-slate-900 uppercase tracking-widest px-1 border-l-4 border-purple-500 inline-block">Support</h4>
              <ul className="space-y-4">
                <li><Link to="/login" className={footerLinkClass}>Author Login</Link></li>
                <li><Link to="/register" className={footerLinkClass}>Registration</Link></li>
                <li><Link to="/terms" className={footerLinkClass}>Terms & Conditions</Link></li>
                <li><a href="#" className={footerLinkClass}>Paper Template</a></li>
                <li><a href="#" className={footerLinkClass}>Contact Support</a></li>
              </ul>
            </div>
          </div>

          {/* Contact Info - Spans 4 columns */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
            <h4 className="text-sm font-black mb-8 text-slate-900 uppercase tracking-widest px-1 border-l-4 border-sky-500 inline-block">General Enquiry</h4>
            <div className="bg-slate-50/50 p-6 md:p-8 rounded-[32px] border border-slate-100 backdrop-blur-sm w-full">
              <ul className="space-y-6">
                <li className="flex group/item">
                  <a 
                    href="https://www.google.com/maps/place/Coimbatore+Institute+of+Engineering+and+Technology/@10.998811,76.7731654,1217m/data=!3m1!1e3!4m6!3m5!1s0x3ba86104b8f60b01:0x75c28a0ddc379a9d!8m2!3d10.9957852!4d76.7716835!16s%2Fm%2F03y8_13?entry=ttu&g_ep=EgoyMDI2MDIxMS4wIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-5 w-full group/link"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-indigo-500 shrink-0 shadow-sm border border-slate-100 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-300">
                      <MapPin size={20} />
                    </div>
                    <span className="leading-relaxed lg:pt-1 group-hover/link:text-indigo-600 transition-colors text-center lg:text-left font-bold">Vellimalaipattinam, Narasipuram, Thondamuthur, Coimbatore - 641109.</span>
                  </a>
                </li>
                <li className="flex group/item">
                  <a 
                    href="mailto:info@cietm2026.com"
                    className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-5 w-full group/link"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-indigo-500 shrink-0 shadow-sm border border-slate-100 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-300">
                      <Mail size={20} />
                    </div>
                    <span className="lg:pt-2 hover:text-indigo-600 transition-colors text-center lg:text-left font-bold">info@cietcbe.edu.in</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="py-10 bg-slate-900 border-t border-white/5">
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-slate-400 font-bold tracking-tight">&copy; 2026 National Conference CIETM. All rights reserved.</p>
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white text-xs font-black shadow-xl">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="uppercase tracking-widest">Innovation Powered</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
