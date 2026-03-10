import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, MapPin, FileText, ArrowRight,
  Globe, Users, Award, Sparkles,
  GraduationCap, BookOpen, CheckCircle, Download, FileCheck, Layers,
  Linkedin, Twitter, ChevronLeft, ChevronRight, ChevronUp, User, Github
} from 'lucide-react';

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;
      if (distance < 0) {
        clearInterval(timer);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-2 md:gap-4 justify-center flex-wrap backdrop-blur-md bg-white/5 p-3 md:p-4 rounded-3xl border border-white/10 shadow-2xl">
      {Object.entries(timeLeft).map(([label, value]) => (
        <div key={label} className="flex flex-col min-w-[60px] md:min-w-[80px] items-center">
          <div className="relative group overflow-hidden bg-white/10 w-full py-2 rounded-2xl border border-white/5 mb-1.5 transition-all duration-300 group-hover:bg-white/20">
            <span className="text-2xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none block">
              {value.toString().padStart(2, '0')}
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <span className="text-[0.55rem] md:text-[0.6rem] font-black text-indigo-300 tracking-[0.2em] uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
};

const SpeakerCard = ({ s, width = "w-[220px]" }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`${width} shrink-0 bg-white rounded-[20px] overflow-hidden border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.2)] transition-all duration-500 group/card h-[310px] flex flex-col mx-auto`}
  >
    <div className="relative h-[200px] overflow-hidden bg-slate-100 flex items-center justify-center">
      <img src={s.img} alt={s.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
    </div>
    <div className="p-4 text-center flex flex-col items-center justify-center flex-1">
      <h3 className="text-[1.05rem] font-bold mb-1 text-slate-900 leading-tight">{s.name}</h3>
      <span className="block font-bold text-slate-500 text-[0.7rem] leading-snug">{s.affiliation}</span>
    </div>
  </motion.div>
);

const HomePage = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [themePage, setThemePage] = useState(0);
  const [activeDev, setActiveDev] = useState(null);

  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 3 : 6);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    const handleResize = () => {
      const newItemsPerPage = window.innerWidth < 768 ? 3 : 6;
      if (newItemsPerPage !== itemsPerPage) {
        setItemsPerPage(newItemsPerPage);
        setThemePage(0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [itemsPerPage]);

  // Global click handler to dismiss developer popovers
  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeDev !== null) {
        setActiveDev(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [activeDev]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tracks = [
    {
      id: '01',
      title: 'Engineering Innovations',
      desc: 'Advancements in Civil, Computer Science, Electrical, Electronics, Mechanical & Mechatronics Engineering.',
      icon: <Layers className="w-12 h-12 text-indigo-600 mb-6" />
    },
    {
      id: '02',
      title: 'Economic Sustainability',
      desc: 'Innovative models for Economic Sustainability, Circular Economy, and ESG-driven strategies.',
      icon: <Globe className="w-12 h-12 text-indigo-600 mb-6" />
    },
    {
      id: '03',
      title: 'IT, AI & Communication',
      desc: 'Pioneering work in Information Technology, Artificial Intelligence, and Communication Engineering.',
      icon: <Sparkles className="w-12 h-12 text-indigo-600 mb-6" />
    },
    {
      id: '04',
      title: 'Green Technology',
      desc: 'Research in Renewable Energy, Green Technology, and Sustainable Infrastructure development.',
      icon: <Award className="w-12 h-12 text-indigo-600 mb-6" />
    }
  ];

  const speakers = [
    {
      name: "Dr. M. Omkumar",
      role: "Keynote Speaker",
      affiliation: "Professor - Manufacturing Engineering, Anna University, Chennai.",
      bio: "Academician with expertise in manufacturing technologies and industrial innovations.",
      img: "/speakers/omkumar.jpeg"
    },
    {
      name: "Mr. T. V. Arjunan",
      role: "Keynote Speaker",
      affiliation: "Professor - Mechanical Engineering, Guru Ghasidas Vishwavidyalaya, Bilaspur.",
      bio: "Researcher focusing on advanced mechanical systems and thermal engineering applications.",
      img: "/speakers/arjunan.jpeg"
    }
  ];

  const advisoryBoard = [
    { name: "Dr. S. Gokul", affiliation: "Associate Professor and Head - EEE, Dean - Affiliations and Approvals", img: "/advisory/Gokul Shanmugan.jpeg" },
    { name: "Dr. N. R. Deepa", affiliation: "Associate Professor and Head - IT", img: "/advisory/dheepa.jpeg" },
    { name: "Dr. S. Priyadharshini", affiliation: "Associate Professor and Head - Management Studies", img: "/advisory/priyadharshini.jpg" },
    { name: "Dr. K. Pushpalatha", affiliation: "Dean, Associate Professor and Head - CSE", img: "/advisory/pushpalatha.png" },
    { name: "Dr. A. Umaamaheshvari", affiliation: "Associate Professor and Head - ECE", img: "/advisory/umaamaheshvari.png" },
    { name: "Dr.N.Mohan Raj", affiliation: "Professor & Head - MCT", img: "/advisory/mohan.jpeg" },
    { name: "Mrs. K. Velumani", affiliation: "Dean, Head - S&H", img: "/advisory/velumani.png" },
    { name: "Dr. E. Gomathi", affiliation: "Associate Professor & Head - AI&DS", img: "/advisory/gomathi.jpeg" },
    { name: "Dr. D. Seenivasan", affiliation: "Professor & Head - MECH", img: "/advisory/seenivasan.jpg" },
  ];

  // Calculate duration based on total width to maintain constant velocity (80px/s)
  const duration = (speakers.length * (window.innerWidth > 968 ? 252 : window.innerWidth > 768 ? 236 : 220)) / 80;
  const advisoryDuration = (advisoryBoard.length * (window.innerWidth > 968 ? 252 : window.innerWidth > 768 ? 236 : 220)) / 80;

  return (
    <div className="relative overflow-x-hidden bg-slate-50">
      {/* Hero Section */}
      <section id="hero" className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full h-full"
          >
            <img
              src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1470&auto=format&fit=crop"
              alt="Modern Tech Conference"
              className="w-full h-full object-cover"
            />
          </motion.div>
          {/* Lighter, more vibrant overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
        </div>

        <div className="w-full max-w-7xl mx-auto px-6 text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-5xl mx-auto flex flex-col items-center -mt-24"
          >
            <div className="section-tag mb-4 text-xs md:text-sm bg-white/10 backdrop-blur-md border-white/20 text-white">
              <Sparkles size={14} className="text-amber-400" />
              <span>National Conference 2026</span>
            </div>

            <p className="text-indigo-300 text-base md:text-lg font-bold mb-2 tracking-[0.2em] uppercase">
              Innovating the Future of Technology & Management
            </p>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-6 tracking-normal text-white drop-shadow-2xl max-w-4xl">
              Contemporary Innovations in <br className="hidden md:block" />
              Engineering, Technology & <br className="hidden md:block" />
              Management - <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-600 font-black">CIETM-2026</span>
            </h1>

            <div className="flex flex-col md:flex-row gap-5 mb-10 justify-center w-full max-w-md md:max-w-none">
              <Link to="/register" className="btn btn-primary px-10 py-5 text-lg shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                Join the Conference <ArrowRight size={22} />
              </Link>
              <a href="#about-conference" className="btn glass group px-10 py-5 text-lg border-white/20 hover:border-white/40 text-black shadow-2xl bg-white/5 hover:bg-white/10" onClick={(e) => {
                e.preventDefault();
                document.querySelector('#about-conference')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Explore Details
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </a>
            </div>

            <div className="mt-0">
              <CountdownTimer targetDate="2026-04-29T00:00:00" />
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest text-white">Scroll to explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-indigo-500 to-transparent"></div>
        </motion.div>
      </section>

      {/* About Conference Section */}
      <section id="about-conference" className="py-16 md:py-24 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none -mr-40 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl pointer-events-none -ml-40 -mb-20"></div>

        <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-20">
            {/* Centered Text Content */}
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5 border border-indigo-100">Introduction</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-slate-900 tracking-tight leading-tight uppercase">
              About the <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Conference</span>
            </h2>
            <p className="text-lg md:text-2xl text-slate-600 leading-relaxed font-semibold mb-8 px-2 max-w-4xl mx-auto">
              The conference will focus on the contemporary cutting edge trends and advances in the field of Science, Engineering, Technology and Management domains.
            </p>
            <div className="w-20 h-1 bg-indigo-600 mx-auto mb-8 rounded-full"></div>
            <div className="flex flex-col gap-6 text-base text-slate-600 leading-relaxed mb-10 max-w-4xl mx-auto px-4">
              <p>
                The conference aims to address the issues by providing a platform for the exchange of innovative ideas and information on recent advancements.
                This Conference provides a forum for undergraduates, post graduates, research scholars, faculty members and Personnel's from industry to come together and discuss the latest developments and innovations in Science, Engineering, Technology and Management.
              </p>
              <p>
                This helps the delegates to update their knowledge and provide a platform for future research. This also serves as a workshop for young researchers to build their research.
              </p>
            </div>

          </div>

          {/* Topics of Interest - Updated to support pagination for 13 programs */}
          <div className="relative group p-1 max-w-5xl mx-auto" id="themes-pagination">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[20px] md:rounded-[30px] blur-md opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="bg-slate-950 rounded-[30px] md:rounded-[40px] p-4 sm:p-6 md:p-8 text-white relative overflow-hidden shadow-2xl border border-white/5 w-full">
              <div className="absolute top-0 right-0 w-[400px] h-full bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-full h-[200px] bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>

              <div className="relative z-10 text-center mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-white/5 mb-6 text-indigo-400 backdrop-blur-md border border-white/10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Sparkles size={32} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                </div>
                <h3 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter relative inline-block text-white leading-tight">
                  Themes <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Unlimited</span>
                </h3>

                <div className="relative px-8 md:px-16">
                  {/* Theme Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-6 min-h-[350px]">
                    {[
                      { id: "01", dept: "AI & Data Science", tech: "Artificial Intelligence & Data Science", desc: "Digital Applications & Innovations in Computer Science." },
                      { id: "02", dept: "Civil", tech: "Civil Engineering", desc: "Innovations in Civil Engineering, Sustainable Housing and Other Infrastructure Intelligence." },
                      { id: "03", dept: "Computer Science", tech: "Computer Science & Engineering", desc: "Digital Applications & Innovations in Computer Science." },
                      { id: "04", dept: "CSE (AI & ML)", tech: "Artificial Intelligence & Machine Learning", desc: "Digital Applications & Innovations in Computer Science." },
                      { id: "05", dept: "CSE (Cyber Security)", tech: "Cyber Security", desc: "Digital Applications & Innovations in Computer Science." },
                      { id: "06", dept: "Electrical & Electronics", tech: "Electrical & Electronics Engineering", desc: "Technology for Renewable Energy and Innovations in Electrical Engineering." },
                      { id: "07", dept: "Electronics & VLSI", tech: "Electronics & VLSI Design", desc: "Innovations in Information Technology, Communication Engineering & VLSI Design." },
                      { id: "08", dept: "Information Tech", tech: "Information Technology", desc: "Innovations in Information Technology & Digital Applications." },
                      { id: "09", dept: "Mechanical", tech: "Mechanical Engineering", desc: "Innovations in Mechanical Engineering." },
                      { id: "10", dept: "Mechatronics", tech: "Mechatronics Engineering", desc: "Innovations in Mechatronics Engineering." },
                      { id: "11", dept: "Science & Humanities", tech: "Science & Humanities", desc: "Application of Green Technology and Innovative Models for Economic Sustainability." },
                      { id: "12", dept: "Management", tech: "MBA - Business Administration", desc: "Innovative Models for Economic Sustainability & Operations Management." }
                    ].slice(themePage * itemsPerPage, (themePage * itemsPerPage) + itemsPerPage).map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-4 md:p-6 rounded-[20px] bg-white/10 hover:bg-white/20 transition-all border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(255,255,255,0.05)] group/item relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-400 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                        <div className="flex gap-3 items-start mb-2">
                          <span className="text-indigo-300/60 font-black text-xl drop-shadow-md shrink-0 w-8 mt-0.5">{item.id}</span>
                          <div>
                            <h4 className="text-white font-bold text-base md:text-lg leading-tight drop-shadow-md mb-0.5">{item.tech}</h4>
                            <p className="text-indigo-300 font-extrabold text-[0.6rem] uppercase tracking-widest opacity-80">{item.dept}</p>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed pl-11 italic opacity-90">
                          "{item.desc}"
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Left Button */}
                  <button
                    onClick={() => setThemePage(Math.max(0, themePage - 1))}
                    disabled={themePage === 0}
                    className="absolute left-0 md:left-2 top-[45%] -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 hover:border-white/30 disabled:opacity-0 transition-all backdrop-blur-md shadow-xl"
                  >
                    <ChevronLeft className="text-white w-6 h-6 md:w-8 md:h-8" />
                  </button>

                  {/* Right Button */}
                  <button
                    onClick={() => setThemePage(Math.min(Math.ceil(12 / itemsPerPage) - 1, themePage + 1))}
                    disabled={themePage === Math.ceil(12 / itemsPerPage) - 1}
                    className="absolute right-0 md:right-2 top-[45%] -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 hover:border-white/30 disabled:opacity-0 transition-all backdrop-blur-md shadow-xl"
                  >
                    <ChevronRight className="text-white w-6 h-6 md:w-8 md:h-8" />
                  </button>

                  {/* Pagination Dots */}
                  <div className="flex items-center justify-center gap-2 mt-6">
                    {Array.from({ length: Math.ceil(12 / itemsPerPage) }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i === themePage ? 'w-8 bg-indigo-400' : 'w-2 bg-white/20'}`}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conference Guidelines Section */}
      <section id="conference" className="py-16 md:py-24 bg-slate-50">
        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Submission Guide</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Conference <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Guidelines</span></h2>
            <p className="text-lg text-slate-500 font-medium">Everything you need to know about participating in CIETM 2026.</p>
          </div>

          <div className="bg-[#020b1c] rounded-[30px] md:rounded-[40px] p-6 sm:p-10 md:p-12 text-white relative overflow-hidden shadow-2xl border border-white/5 max-w-6xl mx-auto">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_60%)] pointer-events-none"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-start relative z-10">
              {/* Guidelines Pane */}
              <div>
                <h3 className="text-2xl md:text-4xl font-extrabold mb-8 text-white text-center md:text-left">Author Guidelines</h3>
                <ul className="flex flex-col gap-8 md:gap-10">
                  <li className="flex gap-6 text-lg text-slate-400 leading-relaxed font-medium">
                    <CheckCircle className="text-sky-400 mt-1 shrink-0" size={26} />
                    <div className="flex flex-col gap-3">
                      <span>Original work not published elsewhere and must follow IEEE formatting.</span>
                      <a
                        href="https://www.ieee.org/content/dam/ieee-org/ieee/web/org/conferences/Conference-template-A4.doc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors w-fit"
                      >
                        <Download size={18} /> Download IEEE Template (.doc)
                      </a>
                    </div>
                  </li>
                  <li className="flex gap-6 text-lg text-slate-400 leading-relaxed font-medium">
                    <CheckCircle className="text-sky-400 mt-1 shrink-0" size={26} />
                    <span>Maximum 6 pages allowed with a strict double-blind peer review process.</span>
                  </li>
                  <li className="flex gap-6 text-lg text-slate-400 leading-relaxed font-medium">
                    <CheckCircle className="text-sky-400 mt-1 shrink-0" size={26} />
                    <span>Plagiarism must be under 15% to be considered for evaluation.</span>
                  </li>
                </ul>
                <div className="mt-10 md:mt-12 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
                  <div className="text-sm font-black text-sky-400 uppercase tracking-widest mb-8 border-b border-white/10 pb-5">Registration Fee</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 bg-sky-400/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-400/20 shrink-0"><GraduationCap size={20} /></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UG/PG Students</span>
                        <span className="text-xl font-extrabold text-white">₹ 500</span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 bg-sky-400/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-400/20 shrink-0"><Users size={20} /></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faculty/Research Scholars</span>
                        <span className="text-xl font-extrabold text-white">₹ 750</span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 bg-sky-400/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-400/20 shrink-0"><Globe size={20} /></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">External / Online Presentation</span>
                        <span className="text-xl font-extrabold text-white">₹ 300</span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 bg-sky-400/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-400/20 shrink-0"><Award size={20} /></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Industry Personnel</span>
                        <span className="text-xl font-extrabold text-white">₹ 900</span>
                      </div>
                    </div>
                  </div>
                </div>


              </div>

              {/* Vertical Timeline Pane */}
              <div className="relative">
                <div className="flex flex-col gap-0">
                  {[
                    { icon: <Users size={22} />, title: 'Abstract submission', date: 'March 8, 2026' },
                    { icon: <FileText size={22} />, title: 'Full paper submission', date: 'March 16, 2026' },
                    { icon: <Award size={22} />, title: 'Acceptance notification', date: 'March 24, 2026' },
                    { icon: <CheckCircle size={22} />, title: 'Camera ready', date: 'April 2, 2026' },
                    { icon: <Sparkles size={22} />, title: 'Payment confirmation deadline', date: 'April 12, 2026' },
                    { icon: <GraduationCap size={22} />, title: 'Conference date', date: 'April 29, 2026', active: true }
                  ].map((item, index, arr) => (
                    <div key={index} className={`relative pl-16 pb-10 ${index === arr.length - 1 ? 'pb-0' : ''}`}>
                      {index !== arr.length - 1 && (
                        <div className="absolute left-[20px] top-[30px] bottom-0 w-0.5 bg-white/10"></div>
                      )}
                      <div className={`absolute left-0 top-0 w-[42px] h-[42px] rounded-full border-2 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(0,0,0,0.4)] ${item.active ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-slate-800 border-white/20 text-amber-500'}`}>
                        {item.icon}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xl font-bold text-white">{item.title}</span>
                        <span className="text-lg font-semibold text-orange-400">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex justify-center lg:justify-start">
                  <Link to="/register" className="btn btn-primary px-10 py-4 text-base shadow-xl shadow-indigo-500/20">
                    Register Now <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracks Section */}
      <section id="tracks" className="py-12 md:py-20">
        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Academic Tracks</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Research Focus Areas</h2>
            <p className="text-lg text-slate-500 font-medium">We invite high-quality original research papers in the following tracks</p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {tracks.map((track, i) => (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -12, scale: 1.02 }}
                key={track.id}
                className="bg-white p-8 md:p-10 rounded-[32px] relative text-center flex flex-col items-center border border-slate-100 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.12)] hover:border-indigo-200 group h-full justify-between"
              >
                <div className="absolute top-8 right-8 text-5xl font-black text-slate-100 group-hover:text-indigo-500/10 transition-colors pointer-events-none">{track.id}</div>
                <div className="p-5 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 mb-6 group-hover:scale-110 group-hover:rotate-3">
                  {React.cloneElement(track.icon, { className: "w-10 h-10 mb-0 transition-colors" })}
                </div>
                <h3 className="text-xl font-black mb-4 text-slate-900 leading-tight">{track.title}</h3>
                <p className="text-slate-500 text-[0.95rem] leading-relaxed font-medium mb-4">{track.desc}</p>
                <div className="w-10 h-1 bg-slate-100 group-hover:w-20 group-hover:bg-indigo-500 transition-all duration-500 rounded-full"></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Patrons Section */}
      <section id="patrons" className="pt-12 pb-16 md:pt-16 md:pb-24 relative bg-white overflow-hidden">
        {/* Mesh Backgrounds */}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-500/15 rounded-full blur-[60px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/15 rounded-full blur-[60px] -z-10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(244,63,94,0.05)_0%,transparent_60%)] -z-10 pointer-events-none"></div>

        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Leadership</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Our <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Patrons</span></h2>
            <p className="text-lg text-slate-500 font-medium">Visionary leadership guiding CIETM 2026 towards excellence.</p>
          </div>

          <div className="mt-16">
            <h3 className="text-2xl font-bold text-slate-500 uppercase tracking-[0.2em] text-center mb-12 flex items-center justify-center gap-6 before:content-[''] before:h-px before:w-[0px] before:bg-slate-300 after:content-[''] after:h-px after:w-[60px] after:bg-slate-300">Chief Patron</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto justify-center">
              {[
                { name: "Dr. K. A. Chinnaraju", role: "Director", img: "/assets/Director.jpg" },
                { name: "Thiru. M. Thangavelu", role: "Trustee", img: "/assets/Thangavelu.png" },
                { name: "Dr. P. Natarajan", role: "Academic Director", img: "/assets/Natarajan.jpeg" }
              ].map((p, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8 }}
                  className="bg-white p-12 md:p-8 rounded-2xl text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] border border-slate-200 hover:border-indigo-500 transition-all duration-300 relative overflow-hidden group h-full"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="mb-7 inline-block relative">
                    {p.img ? (
                      <img src={p.img} alt={p.name} className="w-[440px] h-[340px] rounded-[20px] object-cover border-4 border-slate-50 bg-slate-100 shadow-sm transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-[140px] h-[140px] rounded-[20px] bg-slate-100 text-slate-500 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <User size={36} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-[1.35rem] font-bold text-slate-800 mb-2 leading-tight">{p.name}</h3>
                  <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider border-b-2 border-transparent group-hover:border-indigo-600 transition-colors pb-0.5 inline-block">{p.role}</span>
                </motion.div>
              ))}
            </div>

            <h3 className="text-2xl font-bold text-slate-500 uppercase tracking-[0.2em] text-center mb-12 mt-20 flex items-center justify-center gap-6 before:content-[''] before:h-px before:w-[60px] before:bg-slate-300 after:content-[''] after:h-px after:w-[60px] after:bg-slate-300">Patron</h3>
            <div className="max-w-sm mx-auto">
              {[
                { name: "Dr. K. Manikanda Subramanian", role: "Principal", img: "assets/Principal1.png" }
              ].map((p, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8 }}
                  className="bg-white p-12 md:p-8 rounded-2xl text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] border border-slate-200 hover:border-indigo-500 transition-all duration-300 relative overflow-hidden group h-full"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="mb-7 inline-block relative">
                    {p.img ? (
                      <img src={p.img} alt={p.name} className="w-[440px] h-[340px] rounded-[20px] object-cover border-4 border-slate-50 bg-indigo-50 text-indigo-600 shadow-sm transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-[140px] h-[140px] rounded-[20px] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <User size={36} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-[1.35rem] font-bold text-slate-800 mb-2 leading-tight">{p.name}</h3>
                  <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider border-b-2 border-transparent group-hover:border-indigo-600 transition-colors pb-0.5 inline-block">{p.role}</span>
                </motion.div>
              ))}
            </div>

            <h3 className="text-2xl font-bold text-slate-500 uppercase tracking-[0.2em] text-center mb-12 mt-20 flex items-center justify-center gap-6 before:content-[''] before:h-px before:w-[60px] before:bg-slate-300 after:content-[''] after:h-px after:w-[60px] after:bg-slate-300">Convenor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl mx-auto justify-center">
              {[
                { name: "Dr. P. Magudeaswaran", role: "Head Of the Department - Civil Engineering", img: "/convenor/magudeaswaran.jpg" },
                { name: "Dr. V. Rajkumar", role: "Associate Professor - Mechanical Engineering", img: "/convenor/rajkumar.jpeg" }
              ].map((p, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8 }}
                  className="bg-white p-12 md:p-8 rounded-2xl text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] border border-slate-200 hover:border-indigo-500 transition-all duration-300 relative overflow-hidden group h-full"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="mb-7 inline-block relative">
                    {p.img ? (
                      <img src={p.img} alt={p.name} className="w-[240px] h-[240px] rounded-[20px] object-cover object-top border-4 border-slate-50 bg-blue-50 shadow-sm transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-[240px] h-[240px] rounded-[20px] bg-blue-50 text-indigo-600 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <User size={36} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-[1.35rem] font-bold text-slate-800 mb-2 leading-tight">{p.name}</h3>
                  <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider border-b-2 border-transparent group-hover:border-indigo-600 transition-colors pb-0.5 inline-block">{p.role}</span>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Speakers Section */}
      <section id="speakers" className="py-12 md:py-20 bg-white">
        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Experts</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Keynote <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Speakers</span></h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">Meet the visionary leaders sharing their insights at CIETM 2026.</p>
          </div>

          <div className="relative max-w-6xl mx-auto py-6 group overflow-hidden">
            {speakers.length > 4 ? (
              <>
                {/* Fading Edges Mask */}
                <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                <div
                  className="flex gap-8 hover:[animation-play-state:paused]"
                  style={{
                    animation: `scroll ${duration}s linear infinite`,
                    width: 'max-content'
                  }}
                >
                  {/* 3 sets for smooth infinity scroll */}
                  {[...speakers, ...speakers, ...speakers].map((s, i) => (
                    <SpeakerCard key={i} s={s} width="w-[220px] shrink-0" />
                  ))}
                </div>
              </>
            ) : (
              <div className={`grid gap-6 justify-center items-stretch mx-auto ${
                speakers.length === 1 ? 'max-w-md grid-cols-1' :
                speakers.length === 2 ? 'max-w-2xl grid-cols-1 sm:grid-cols-2' :
                speakers.length === 3 ? 'max-w-3xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                'max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              }`}>
                {speakers.map((s, i) => (
                  <SpeakerCard key={i} s={s} />
                ))}
              </div>
            )}
          </div>
          <style>{`
            @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(calc(-100% / 3)); }
            }
          `}</style>
        </div>
      </section>

      {/* Advisory Board Section */}
      <section id="advisory-board" className="py-12 md:py-20 bg-slate-50">
        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Guidance</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Advisory <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Board</span></h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">Distinguished global leaders providing expert guidance for the conference.</p>
          </div>

          <div className="relative max-w-6xl mx-auto py-6 group overflow-hidden">
            {/* Fading Edges Mask */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none"></div>

            <div
              className="flex gap-8 hover:[animation-play-state:paused]"
              style={{
                animation: `board-scroll ${advisoryDuration}s linear infinite`,
                width: 'max-content'
              }}
            >
              {/* 3 sets for smooth infinity scroll */}
              {[...advisoryBoard, ...advisoryBoard, ...advisoryBoard].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="w-[220px] shrink-0 bg-white rounded-[20px] overflow-hidden border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.2)] transition-all duration-500 group/card h-[310px] flex flex-col"
                >
                  <div className="relative h-[200px] overflow-hidden bg-slate-100">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                  </div>
                  <div className="p-4 text-center flex flex-col items-center justify-center flex-1">
                    <h3 className="text-[1.05rem] font-bold mb-1 text-slate-900 leading-tight">{item.name}</h3>
                    <span className="block font-bold text-slate-500 text-[0.7rem] leading-snug">{item.affiliation}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes board-scroll {
                0% { transform: translateX(calc(-100% / 3)); }
                100% { transform: translateX(0); }
            }
          `}</style>
        </div>
      </section>

      {/* Organizing Team Section */}
      <section id='organizing-team' className='py-12 md:py-20 bg-white'>
        <div className='w-full max-w-7xl mx-auto px-6'>
          <div className='mt-0'>
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-[0.2em] text-center mb-12 mt-24 flex items-center justify-center gap-6 before:content-[''] before:h-px before:w-[40px] before:bg-slate-200 after:content-[''] after:h-px after:w-[40px] after:bg-slate-200">Organizing Team</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto px-4">
              {[
                { name: "Mr. G. R. Seenivasan", role: "Assistant Professor", dept: "Civil Engineering", img: "/organizing team/G R Seenivasan.jpeg" },
                { name: "Ms. N. Mithraa", role: "Assistant Professor", dept: "Information Technology", img: "/organizing team/Nmithra.jpeg" },
                { name: "Ms. R. Yoga", role: "Assistant Professor", dept: "Computer Science & Engineering", img: "/organizing team/Yoga.png" },
                { name: "Ms. M. Abirami", role: "Assistant Professor", dept: "Computer Science & Engineering", img: "/organizing team/Abirami.png" },
                { name: "Ms. P. Chandralakshmi", role: "Assistant Professor", dept: "Electrical & Electronics Engineering", img: "/organizing team/Chandralakshmi.jpeg" },
                { name: "Mr. S. Arunkumar ", role: "Assistant Professor", dept: "Electronics Engineering - VLSI", img: "/organizing team/Arunkumar .jpeg" },
                { name: "Ms. R. R. Yuganandhine", role: "Assistant Professor", dept: "Electronics & Communication Engineering", img: "/organizing team/Yuganandhine.png" },
                { name: "Dr. L. Venkatesh", role: "Associate Professor", dept: "Mechanical Engineering", img: "/organizing team/venkatesh.jpeg" },
                { name: "Mr. K. Senthilkumar", role: "Assistant Professor", dept: "Mechatronics Engineering", img: "/organizing team/Senthilkumar K.jpg.jpeg" },
                { name: "Ms. T. Malarvizhi", role: "Assistant Professor", dept: "Artificial Intelligence & Data Science", img: "/organizing team/Malarvizhi.png" },
                { name: "Dr. M. Arunmozhi", role: "Associate Professor", dept: "Master of Business Administration", img: "/organizing team/Arunmozhi.jpeg" },
                { name: "Ms. S. R. Sarvada", role: "Assistant Professor", dept: "Science & Humanities - English", img: "/organizing team/S.R.Sarvada.jpeg" },
                { name: "Ms. V. Mohana Priya", role: "Assistant Professor", dept: "Science & Humanities - Mathematics", img: "/organizing team/Mohana-Priya .jpeg" },
                { name: "Ms. Sangavi", role: "Assistant Professor", dept: "Science & Humanities - Mathematics", img: "/organizing team/Sangavi.jpeg" },
              ].map((m, idx, arr) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -8 }}
                  className={`bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-500 flex flex-col items-center text-center group h-full col-span-1 ${arr.length % 4 === 2 && idx === arr.length - 2 ? 'lg:col-start-2' : ''}`}
                >
                  <div className="w-36 h-44 md:w-40 md:h-52 mb-5 relative">
                    {m.img ? (
                      <img
                        src={m.img}
                        alt={m.name}
                        className="w-full h-full rounded-[1.25rem] object-cover object-top border-4 border-slate-50 group-hover:border-indigo-100 shadow-md group-hover:shadow-xl transition-all duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 text-slate-400 rounded-[1.25rem] flex items-center justify-center border-4 border-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-500 shadow-md group-hover:shadow-xl transition-all duration-500 group-hover:scale-105">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">{m.name}</h4>
                  <span className="text-[0.75rem] font-bold text-indigo-600 uppercase tracking-wider mb-2">{m.role}</span>
                  <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">{m.dept}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About College Section */}
      <section id="about" className="py-16 md:py-24">
        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Host Institution</span>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">An autonomous institution driving academic excellence and professional development since 2001.</p>
          </div>

          <div className="w-full mb-14 group">
            <div className="relative w-full max-w-7xl min-h-[500px] md:min-h-[500px] rounded-[40px] md:rounded-[60px] overflow-hidden shadow-2xl flex items-center justify-center border border-slate-200">
              <img src="/assets/ciet.jpeg" alt="College Campus" className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-[2s] group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 z-10 transition-opacity group-hover:opacity-80"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent z-10"></div>

              <div className="relative z-20 p-8 pt-10 pb-28 md:p-20 max-w-4xl text-center text-white">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-6 md:mb-8"
                >
                  <h2 className="text-3xl sm:text-4xl md:text-7xl font-black mb-4 md:mb-6 leading-[1.1] tracking-tighter text-white drop-shadow-2xl">
                    Coimbatore Institute <br /> of <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Engineering and Technology</span>
                  </h2>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="text-base sm:text-lg md:text-2xl font-medium leading-relaxed opacity-90 mb-0 text-slate-200"
                >
                  The Coimbatore Institute of Engineering and Technology (CIET), Coimbatore, Tamil Nadu, is an autonomous institution established in 2001 by the Kovai Kalaimagal Educational Trust (KKET). The institute is dedicated to providing high-quality education in the fields of Engineering, Technology, and Management, fostering academic excellence and professional development. CIET is affiliated with Anna University, approved by AICTE, and accredited with an ‘A’ Grade by NAAC.
                </motion.p>
              </div>
              <a
                href="https://www.google.com/maps/place/Coimbatore+Institute+of+Engineering+and+Technology/@10.998811,76.7731654,1217m/data=!3m1!1e3!4m6!3m5!1s0x3ba86104b8f60b01:0x75c28a0ddc379a9d!8m2!3d10.9957852!4d76.7716835!16s%2Fm%2F03y8_13?entry=ttu&g_ep=EgoyMDI2MDIxMS4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-6 md:bottom-10 left-6 right-6 sm:left-10 sm:right-auto md:left-20 bg-white/10 backdrop-blur-md border border-white/20 py-3 px-6 rounded-2xl z-20 flex items-center justify-center sm:justify-start gap-3 font-black text-sm shadow-2xl text-white hover:bg-white/20 transition-all group/loc"
              >
                <MapPin size={20} className="text-sky-400 group-hover/loc:scale-110 transition-transform" /> CIET COIMBATORE
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto items-stretch">
            {[
              {
                icon: <Award className="w-10 h-10 text-indigo-500" />,
                title: "Heritage & Trust",
                desc: "Established in 2001 by the Kovai Kalaimagal Educational Trust (KKET). An Autonomous institute dedicated to world-class engineering education."
              },
              {
                icon: <GraduationCap className="w-10 h-10 text-indigo-500" />,
                title: "Academic Excellence",
                desc: "Accredited with 'A' Grade by NAAC. Offering 11 UG and Post Graduate courses including MBA, focusing on innovation and research."
              },
              {
                icon: <Sparkles className="w-10 h-10 text-indigo-500" />,
                title: "Infrastructure",
                desc: "Sprawling 25-acre green campus located 25 kms from Coimbatore. Features a serene atmosphere surrounded by picturesque hillocks."
              }
            ].map((pillar, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-500 flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  {pillar.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">{pillar.title}</h3>
                <p className="text-slate-500 text-base leading-relaxed font-medium text-justify">{pillar.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Developers Section */}
      <section id="developers" className="pt-4 pb-16 md:pt-8 md:pb-24 bg-slate-50 relative overflow-hidden border-t border-slate-100">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-[80px] pointer-events-none -mt-20 -mr-40"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-50/60 rounded-full blur-[80px] pointer-events-none -mb-20 -ml-40"></div>

        <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs tracking-widest uppercase mb-5">Innovation Hub</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Meet the <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Developers</span></h2>
            <p className="text-lg text-slate-500 font-medium">The visionary student team behind the digital architecture of CIETM 2026.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Left Side: Developers Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-full max-w-md mx-auto lg:mx-0 lg:max-w-none"
            >
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
              <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
              <div className="relative rounded-[2.5rem] overflow-hidden border-[8px] border-white shadow-2xl bg-white group aspect-[4/5] md:aspect-[3/4]">
                {/* Click outside overlay */}
                {activeDev !== null && (
                  <div 
                    className="absolute inset-0 z-10 cursor-default" 
                    onClick={() => setActiveDev(null)} 
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10 opacity-70 group-hover:opacity-50 transition-opacity duration-500"></div>
                <img
                  src="/assets/developers.jpg"
                  alt="IT Department Developers"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = "/assets/developers.png"; 
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Interactive Area Hitboxes for Developers */}
                {[
                  { id: 1, name: "Vijaya Prasath", quote: "Dreaming in Code", pos: { top: '20%', left: '9%', width: '40%', height: '40%' }, align: 'right', linkedin: "#", github: "#", portfolio: "#" },
                  { id: 2, name: "Gowshik K", quote: "Crafting Experiences", pos: { top: '20%', right: '13%', width: '45%', height: '50%' }, align: 'left', linkedin: "#", github: "#", portfolio: "#" },
                  { id: 3, name: "Jenisha J", quote: "Designing the Web", pos: { bottom: '15%', left: '0', width: '35%', height: '45%' }, align: 'right', linkedin: "#", github: "#", portfolio: "#" },
                  { id: 4, name: "Rithika R", quote: "Breaking Boundaries", pos: { bottom: '20%', right: '0', width: '30%', height: '45%' }, align: 'left', linkedin: "#", github: "#", portfolio: "#" }
                ].map((dev, idx) => {
                  const isActive = activeDev === dev.id;
                  const isOtherActive = activeDev !== null && activeDev !== dev.id;

                  return (
                    <div key={idx} className={`absolute group/hotspot ${isActive ? 'z-40' : 'z-30'}`} style={dev.pos}>
                      {/* Invisible Hitbox Area */}
                      <button 
                        tabIndex="0" 
                        className={`absolute inset-0 w-full h-full cursor-pointer outline-none transition-colors duration-300 rounded-[2.5rem] z-20 ${
                          isActive ? 'bg-white/10' : 
                          'focus:bg-white/10 hover:bg-white/10'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDev(isActive ? null : dev.id);
                        }}
                        aria-label={`View ${dev.name}'s profile`}
                      ></button>
                      
                      {/* Popover Card */}
                      <div className={`absolute transition-all duration-300 transform z-50 w-40 md:w-48 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/40 top-1/2 -translate-y-1/2 ${dev.align === 'right' ? 'left-full ml-2 md:ml-4' : 'right-full mr-2 md:mr-4'} ${
                        isActive ? 'opacity-100 pointer-events-auto scale-100' :
                        isOtherActive ? 'opacity-0 pointer-events-none scale-95' :
                        'opacity-0 pointer-events-none scale-95 group-hover/hotspot:opacity-100 group-hover/hotspot:pointer-events-auto group-hover/hotspot:scale-100'
                      }`}>
                        {/* Arrow */}
                        <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white/95 rotate-45 ${dev.align === 'right' ? '-left-2 border-b border-l border-white/40' : '-right-2 border-t border-r border-white/40'}`}></div>
                        <div className="relative text-center">
                          <h5 className="font-bold text-slate-800 text-sm mb-0.5">{dev.name}</h5>
                          <p className="text-[0.65rem] font-bold tracking-wider uppercase text-indigo-500 mb-3 hover:text-indigo-600 transition-colors">"{dev.quote}"</p>
                          <div className="flex gap-2 justify-center">
                            <a href={dev.github} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white transition-colors border border-slate-200" title="GitHub">
                              <Github size={14} />
                            </a>
                            <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-600 hover:text-white transition-colors border border-slate-200" title="LinkedIn">
                              <Linkedin size={14} />
                            </a>
                            <a href={dev.portfolio} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-sky-500 hover:text-white transition-colors border border-slate-200" title="Portfolio">
                              <Globe size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Floating Badge */}
                <div className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/50 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black text-slate-800 tracking-wider">IT BATCH '27</span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 md:p-8">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <p className="text-white font-black text-center uppercase tracking-[0.2em] text-sm md:text-base mb-1 drop-shadow-lg">Creative Minds</p>
                    <p className="text-indigo-200 text-xs md:text-sm text-center font-bold tracking-widest uppercase">Dept. of Information Technology</p>
                  </div>
                </div>
              </div>
              </motion.div>
            </motion.div>

            {/* Right Side: Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex flex-col text-center lg:text-left"
            >
              <div className="mb-4 lg:mb-6">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 mb-6 shadow-sm overflow-hidden relative group">
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 font-extrabold text-xs tracking-[0.2em] uppercase">
                    Who We Are
                  </span>
                </span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6 relative">
                  Engineered by <br className="hidden lg:block"/>
                  <span className="relative inline-block">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x">IT Students</span>
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-indigo-400/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 -5 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
                    </svg>
                  </span>
                </h2>
                <div className="w-20 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto lg:mx-0 mb-8 shadow-md"></div>
              </div>

              <div className="space-y-6 text-base md:text-lg text-slate-600 font-medium leading-relaxed mb-8">
                <p className="border-l-4 border-indigo-500 pl-4 py-1 italic text-slate-700 bg-gradient-to-r from-indigo-50/50 to-transparent pr-4">
                  We are a passionate team of student developers from the <strong className="text-indigo-700 font-extrabold tracking-wide">Department of Information Technology</strong> at the Coimbatore Institute of Engineering and Technology.
                </p>
                <p className="px-4 border-l-4 border-transparent">
                  Driven by innovation and a shared enthusiasm for building modern digital experiences, this entire platform was architected, designed, and deployed from the ground up by our department's students to comprehensively support CIETM-2026.
                </p>
              </div>

              <div className="relative group perspective-1000">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border border-white p-6 md:p-8 rounded-[2rem] shadow-xl text-left transform transition-transform duration-500 group-hover:-translate-y-1">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="relative w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden group-hover:shadow-inner">
                      <div className="absolute inset-0 bg-indigo-600/10 scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full"></div>
                      <Layers className="w-7 h-7 text-indigo-600 relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">Built with Purpose</h4>
                      <p className="text-sm md:text-base text-slate-500 leading-relaxed">From intuitive UI/UX design to robust backend architecture, this platform stands as a testament to the practical skills and technological excellence cultured within the IT department.</p>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white mt-16">
        <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col">
            <h2 className="text-[3.5rem] font-bold mb-2 tracking-tight leading-none">20+</h2>
            <p className="opacity-90 font-bold uppercase tracking-[0.1rem] text-sm">Experts</p>
          </div>
          <div className="flex flex-col">
            <h2 className="text-[3.5rem] font-bold mb-2 tracking-tight leading-none">150+</h2>
            <p className="opacity-90 font-bold uppercase tracking-[0.1rem] text-sm">Original Papers</p>
          </div>
          <div className="flex flex-col">
            <h2 className="text-[3.5rem] font-bold mb-2 tracking-tight leading-none">10+</h2>
            <p className="opacity-90 font-bold uppercase tracking-[0.1rem] text-sm">Industry Partners</p>
          </div>
        </div>
      </section>

      {showScrollTop && (
        <button
          className="fixed bottom-10 right-10 w-[60px] h-[60px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-indigo-500/40 shadow-xl z-50 hover:-translate-y-2 hover:scale-110 transition-all duration-300 border-none cursor-pointer"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

export default HomePage;
