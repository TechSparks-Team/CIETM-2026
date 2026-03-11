import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('#hero');

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Intersection Observer for highlighting sections
    // We use IDs directly for observation
    const sectionIds = ['hero', 'about-conference', 'conference', 'tracks', 'speakers', 'about', 'developers'];
    
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px', // Detect when middle of section is in middle of viewport
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = `#${entry.target.id}`;
          // Map sub-sections to their parent nav links if necessary
          if (id === '#about-conference') {
            setActiveSection('#hero');
          } else {
            setActiveSection(id);
          }
        }
      });
    }, observerOptions);

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const scrollToSection = (id) => {
    setIsOpen(false);
    setActiveSection(id); // Immediate visual feedback
    
    // Give the menu a moment to start closing before scrolling
    setTimeout(() => {
      if (location.pathname !== '/') {
        navigate('/' + id);
        return;
      }
      
      const element = document.querySelector(id);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 150);
  };

  const isHome = location.pathname === '/';
  
  // Always use the "scrolled" look for consistency and visibility
  const navBgClass = 'bg-white/70 backdrop-blur-2xl border-b border-indigo-100/50 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)]';
  const textColorClass = "text-slate-700";
  const logoColorClass = "text-indigo-950";
  const buttonBorderClass = "border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/50";

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'Conference', href: '#conference' },
    { name: 'Tracks', href: '#tracks' },
    { name: 'Speakers', href: '#speakers' },
    { name: 'About College', href: '#about' },
    { name: 'Developers', href: '#developers' }
  ];
  const getDashboardLink = () => {
    if (!user) return '/login';
    const normalizedRole = user.role?.toLowerCase().trim();
    switch (normalizedRole) {
      case 'admin': return '/admin/dashboard';
      case 'chair': return '/chair/dashboard';
      case 'reviewer': return '/reviewer/dashboard';
      default: return '/dashboard';
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`sticky top-0 z-50 h-20 flex items-center transition-all duration-500 ${navBgClass}`}
    >
      {/* Scroll Progress Bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 origin-left z-50"
        style={{ scaleX }}
      />

      <div className="w-full max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link 
          to="/" 
          className={`group relative text-2xl font-extrabold tracking-tighter flex items-center gap-2 ${logoColorClass} transition-colors duration-300 overflow-hidden px-2 py-1 rounded-lg`}
          onClick={(e) => { e.preventDefault(); scrollToSection('#hero'); }}
        >
          <motion.span 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1"
          >
            CIETM 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 font-black relative">
              2026
            </span>
          </motion.span>
          
          {/* Shine Effect */}
          <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-35deg] group-hover:left-[200%] transition-all duration-1000 ease-in-out pointer-events-none"></div>
          
          {/* Bottom underline */}
          <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-indigo-600 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-1">
            {navLinks.filter(item => isHome || item.name === 'Home').map((item) => {
              const isActive = isHome ? activeSection === item.href : false;
              return (
              <a 
                key={item.name} 
                href={item.href} 
                onClick={(e) => { e.preventDefault(); scrollToSection(item.href); }}
                className={`relative px-4 py-2 text-sm font-bold tracking-wide transition-all duration-300 group ${
                  isActive 
                    ? 'text-indigo-600' 
                    : `${textColorClass} hover:text-indigo-500`
                }`}
              >
                {item.name}
                {isActive && (
                  <motion.span 
                    layoutId="activeNav"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-600 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-600/30 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${isActive ? 'hidden' : ''}`} />
              </a>
            )})}
          </div>
          
          <div className="flex items-center gap-4 pl-6 border-l border-slate-200 transition-colors duration-500">
            {user ? (
              <div className="flex items-center gap-3">
                <Link 
                  to={getDashboardLink()} 
                  className={`btn border-2 px-5 py-2 text-[0.7rem] uppercase tracking-widest font-black ${buttonBorderClass} transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg`}
                >
                  Dashboard
                </Link>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout} 
                  className="p-2 text-slate-500 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                  title="Logout"
                >
                  <LogOut size={18} />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className={`px-5 py-2 text-[0.7rem] uppercase tracking-widest font-black transition-all ${textColorClass} hover:text-indigo-600`}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-[0.7rem] uppercase tracking-widest font-black shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:translate-y-[-2px] transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className="md:hidden z-50 cursor-pointer text-slate-800 p-2.5 bg-slate-100/80 backdrop-blur-md rounded-xl border border-white shadow-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </motion.div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-2xl md:hidden z-50 transform-gpu"
          >
            <div className="p-6 flex flex-col gap-2 bg-white">
              <div className="flex flex-col gap-1 mb-6">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 px-2">Menu</span>
                {navLinks.filter(item => isHome || item.name === 'Home').map((item) => {
                  const isActive = isHome ? activeSection === item.href : false;
                  return (
                  <a 
                    key={item.name} 
                    href={item.href} 
                    onClick={(e) => { e.preventDefault(); scrollToSection(item.href); }}
                    className={`flex items-center justify-between p-4 rounded-xl text-base font-bold transition-all ${
                      isActive 
                        ? 'text-indigo-600 bg-indigo-50 border-l-4 border-indigo-600 pl-3' 
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {item.name}
                    <ChevronRight size={16} className={isActive ? 'opacity-100' : 'opacity-20'} />
                  </a>
                )})}
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                {user ? (
                  <>
                    <Link 
                      to={getDashboardLink()} 
                      className="w-full bg-indigo-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md shadow-indigo-100"
                      onClick={() => setIsOpen(false)}
                    >
                      <User size={18} /> Dashboard
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      to="/login" 
                      className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm text-center"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm text-center shadow-md shadow-indigo-100"
                      onClick={() => setIsOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
