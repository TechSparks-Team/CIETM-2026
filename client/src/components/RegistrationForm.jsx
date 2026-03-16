import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { ChevronRight, ChevronLeft, Upload, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { CONFERENCE_TRACKS } from '../constants/conferenceData';

const RegistrationForm = ({ startStep = 1, showAccountCreation = true, onSuccess }) => {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(startStep);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [registrationId, setRegistrationId] = useState(null);
  const [errors, setErrors] = useState({});
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const scrollableRef = React.useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    institution: 'Coimbatore Institute of Engineering and Technology',
    department: '',
    designation: '',
    areaOfSpecialization: '',
    yearOfStudy: '',
    category: 'UG/PG STUDENTS',
    teamMembers: [],
    paperTitle: '',
    abstract: '',
    keywords: '',
    track: 'CIDT',
    password: '',
    confirmPassword: '',
    role: 'author', // Default role
    agreedToTerms: false
  });

  // Fetch draft on mount
  useEffect(() => {
    if (user) {
      const fetchDraft = async () => {
        try {
          const { data } = await axios.get('/api/registrations/my', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          if (data && data.length > 0) {
            const latest = data[0];
            setRegistrationId(latest._id);
            setFormData(prev => ({
              ...prev,
              name: latest.personalDetails?.name || user.name,
              email: latest.personalDetails?.email || user.email,
              mobile: latest.personalDetails?.mobile || user.phone || '',
              institution: latest.personalDetails?.institution || '',
              department: latest.personalDetails?.department || '',
              designation: latest.personalDetails?.designation || '',
              areaOfSpecialization: latest.personalDetails?.areaOfSpecialization || '',
              yearOfStudy: latest.personalDetails?.yearOfStudy || '',
              category: latest.personalDetails?.category || 'External Student',
              teamMembers: latest.teamMembers || [],
              paperTitle: latest.paperDetails?.title || '',
              abstract: latest.paperDetails?.abstract || '',
              keywords: latest.paperDetails?.keywords?.join(', ') || '',
              track: latest.paperDetails?.track || 'CIDT'
            }));

            // If starting from step 1 but user logged in and has draft/data
            if (step === 1) setStep(2);
          } else {
            // user logged in but no draft
            setFormData(prev => ({
              ...prev,
              name: user.name,
              email: user.email,
              mobile: user.phone || ''
            }));
            if (step === 1) setStep(2);
          }
        } catch (error) {
          console.error("Failed to fetch draft", error);
        }
      };
      fetchDraft();
    }
  }, [user]);

  // Timer for resend code
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: false });
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};
    let isValid = true;

    switch (currentStep) {
      case 1:
        if (showAccountCreation) {
          if (!formData.name) newErrors.name = true;
          if (!formData.email) newErrors.email = true;
          if (!formData.mobile) newErrors.mobile = true;
          if (!formData.password) newErrors.password = true;

          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fill in all required fields");
            return false;
          }
        }
        return true;
      case 2:
        if (!formData.institution) {
          setErrors({ institution: true });
          toast.error("Institution is required");
          return false;
        }
        if (!formData.department) {
          setErrors({ department: true });
          toast.error("Department is required");
          return false;
        }
        if (formData.category === 'UG/PG STUDENTS' && !formData.yearOfStudy) {
          setErrors({ yearOfStudy: true });
          toast.error("Year/Course is required");
          return false;
        }
        if ((formData.category === 'FACULTY/RESEARCH SCHOLARS' || formData.category === 'INDUSTRY PERSONNEL') && !formData.designation) {
          setErrors({ designation: true });
          toast.error("Designation is required");
          return false;
        }
        return true;
      case 3:
        for (let i = 0; i < formData.teamMembers.length; i++) {
          const m = formData.teamMembers[i];
          // Core details validation
          if (!m.name || !m.email || !m.mobile || !m.affiliation || !m.department) {
            toast.error(`Please fill in all core details for co-author ${i + 1}`);
            return false;
          }
          // Email format validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(m.email)) {
            toast.error(`Invalid email format for co-author ${i + 1}`);
            return false;
          }
          // Mobile validation (simple)
          if (m.mobile.length < 10) {
            toast.error(`Invalid mobile number for co-author ${i + 1}`);
            return false;
          }

          if (m.category === 'UG/PG STUDENTS' && !m.yearOfStudy) {
            toast.error(`Year/Course is required for co-author ${i + 1}`);
            return false;
          }
          if ((m.category === 'FACULTY/RESEARCH SCHOLARS' || m.category === 'INDUSTRY PERSONNEL') && !m.designation) {
            toast.error(`Designation is required for co-author ${i + 1}`);
            return false;
          }
        }
        return true;
      case 4:
        if (!formData.paperTitle) newErrors.paperTitle = true;
        if (!formData.abstract) newErrors.abstract = true;
        if (!formData.keywords) newErrors.keywords = true;

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          toast.error("Please fill in all required paper details");
          return false;
        }
        return true;
      default:
        return true;
    }
  };


  const addTeamMember = () => {
    if (formData.teamMembers.length >= 3) {
      toast.error("Maximum 3 co-authors are allowed");
      return;
    }

    // Check if the last co-author is filled before adding another
    if (formData.teamMembers.length > 0) {
      const lastMember = formData.teamMembers[formData.teamMembers.length - 1];
      if (!lastMember.name || !lastMember.email) {
        toast.error("Please fill the details of the current co-author first");
        return;
      }
    }

    setFormData({
      ...formData,
      teamMembers: [...formData.teamMembers, { name: '', email: '', mobile: '', affiliation: '', department: '', designation: '', areaOfSpecialization: '', yearOfStudy: '', category: 'UG/PG STUDENTS' }]
    });
  };

  const updateTeamMember = (index, field, value) => {
    const updated = [...formData.teamMembers];
    updated[index][field] = value;
    setFormData({ ...formData, teamMembers: updated });
  };

  const handleSaveDraft = async () => {
    if (!user) return;

    // Filter out empty team members before saving
    const validTeamMembers = formData.teamMembers.filter(m => m.name && m.name.trim() !== '');

    try {
      const { data } = await axios.post('/api/registrations/draft', {
        id: registrationId,
        personalDetails: {
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          institution: formData.institution,
          department: formData.department,
          designation: formData.designation,
          areaOfSpecialization: formData.areaOfSpecialization,
          yearOfStudy: formData.yearOfStudy,
          category: formData.category
        },
        teamMembers: validTeamMembers,
        paperDetails: {
          title: formData.paperTitle,
          abstract: formData.abstract,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
          track: formData.track
        }
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (data?._id) {
        setRegistrationId(data._id);
      }
      return data;
    } catch (error) {
      console.error("Draft save failed", error);
      return null;
    }
  };

  const nextStep = async () => {
    // Validate current step before proceeding
    if (!validateStep(step)) return;

    if (step === 1 && !user && showAccountCreation) {
      // Account Creation
      if (formData.password !== formData.confirmPassword) {
        return toast.error("Passwords don't match");
      }
      setLoading(true);
      try {
        const response = await axios.post('/api/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.mobile,
          role: formData.role
        });

        setShowVerification(true);
        setResendTimer(60);
        sessionStorage.setItem('isRegistering', 'true');
        toast.success(response.data.message || "Verification code sent to your email!");
      } catch (error) {
        toast.error(error.response?.data?.message || "Account creation failed");
      } finally {
        setLoading(false);
      }
    } else {
      // Save draft and move to next step
      await handleSaveDraft();
      sessionStorage.setItem('isRegistering', 'true');
      setStep(step + 1);
      if (scrollableRef.current) {
        scrollableRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      return toast.error("Please enter the 6-digit code");
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/verify-email', {
        email: formData.email,
        code: verificationCode
      });

      updateUser(response.data);
      toast.success("Email verified successfully!");

      setShowVerification(false);
      setStep(2);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await axios.post('/api/auth/resend-verification', {
        email: formData.email
      });
      setResendTimer(60);
      toast.success("New verification code sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    if (scrollableRef.current) {
      scrollableRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSkip = async () => {
    // Skip does NOT validate, just saves draft and moves to dashboard
    setLoading(true);
    try {
      if (user) {
        await handleSaveDraft();
      }
      sessionStorage.removeItem('isRegistering');
      navigate('/dashboard');
    } catch (error) {
      console.error("Skip failed", error);
      // Even if save fails, move to dashboard to not block user.
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.agreedToTerms) {
      return toast.error("You must agree to the terms and conditions");
    }

    setLoading(true);
    try {
      const savedReg = await handleSaveDraft();
      const finalId = savedReg?._id || registrationId;

      if (!finalId) {
        throw new Error("Registration record could not be established.");
      }

      await axios.post('/api/registrations/submit', {
        id: finalId
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      toast.success('Registration submitted successfully!');
      sessionStorage.removeItem('isRegistering');
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Final submission failed');
    } finally {
      setLoading(false);
    }
  };

  const hostColleges = [
    "Coimbatore Institute of Engineering and Technology",
    "Coimbatore Institute of Management and Technology",
    "Kovai Kalaimagal Arts and Science College",
    "CIET - School of Architecture"
  ];

  const isHostInstitution = hostColleges.includes(formData.institution);

  const registrationCategories = {
    'UG/PG STUDENTS': { fee: 500 },
    'FACULTY/RESEARCH SCHOLARS': { fee: 750 },
    'EXTERNAL / ONLINE PRESENTATION': { fee: 300 },
    'INDUSTRY PERSONNEL': { fee: 900 }
  };

  const calculateTotalFee = () => {
    let total = registrationCategories[formData.category]?.fee || 0;
    formData.teamMembers.forEach(member => {
      if (member.name && member.name.trim() !== '') {
        total += registrationCategories[member.category]?.fee || 0;
      }
    });
    return total;
  };

  // Helper classes
  const labelClass = "block mb-2 font-bold text-slate-800 text-sm";
  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 text-sm";
  const errorInputClass = "border-red-500 focus:border-red-500 focus:ring-red-500/10";
  const groupClass = "mb-4";

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'button') {
        return;
      }
      e.preventDefault();
      if (showVerification) {
        handleVerifyEmail();
      } else if (step < 5) {
        nextStep();
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" onKeyDown={handleKeyDown}>
      <div className="mb-8 pt-4 shrink-0">
        <p className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
          <span>Step {step} of 5</span>
          <span className="text-indigo-600">{Math.round(((step - 1) / 4) * 100)}% Completed</span>
        </p>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
        </div>
      </div>

      <div 
        ref={scrollableRef}
        className="flex-1 overflow-y-auto pr-2 mb-4 flex flex-col custom-scrollbar"
      >
        {step === 1 && showAccountCreation && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 shrink-0">Step 1: Account Creation</h2>

            {!showVerification ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div className={groupClass}>
                    <label className={labelClass}>Full Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" className={`${inputClass} ${errors.name ? errorInputClass : ''}`} />
                  </div>
                  <div className={groupClass}>
                    <label className={labelClass}>Mobile</label>
                    <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile number" className={`${inputClass} ${errors.mobile ? errorInputClass : ''}`} />
                  </div>
                </div>


                <div className={groupClass}>
                  <label className={labelClass}>Email</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className={`${inputClass} ${errors.email ? errorInputClass : ''}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div className={groupClass}>
                    <label className={labelClass}>Password</label>
                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Create password" className={`${inputClass} ${errors.password ? errorInputClass : ''}`} />
                  </div>
                  <div className={groupClass}>
                    <label className={labelClass}>Confirm Password</label>
                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" className={inputClass} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center max-w-md mx-auto my-4 animate-in zoom-in duration-300 flex flex-col justify-center h-full">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shrink-0">
                  <CheckCircle size={48} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Verify Your Email</h3>
                <p className="text-slate-500 mb-6">
                  We've sent a 6-digit verification code to<br />
                  <strong>{formData.email}</strong>
                </p>
                <div className={groupClass}>
                  <label className={labelClass}>Enter Verification Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={`${inputClass} font-mono font-bold text-indigo-600 border-slate-300 text-center text-2xl tracking-[0.5em] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15`}
                  />
                </div>
                <button
                  onClick={handleVerifyEmail}
                  className="btn btn-primary w-full mb-4 py-3"
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-slate-400 text-sm">
                      Resend code in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      onClick={handleResendCode}
                      className="text-indigo-600 font-semibold text-sm hover:text-indigo-700 hover:underline bg-transparent border-none cursor-pointer"
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {step === 2 && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 shrink-0">Step 2: Institutional Details</h2>

            <div className={groupClass}>
              <label className={labelClass}>{formData.category === 'INDUSTRY PERSONNEL' ? 'Organization Details' : 'Institution Details'}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 flex items-center gap-4 bg-white hover:border-slate-300 hover:bg-slate-50 relative overflow-hidden group ${isHostInstitution ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-500/10' : 'border-slate-200'}`}
                  onClick={() => setFormData({ ...formData, institution: hostColleges[0] })}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isHostInstitution ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                    <div className={`w-2 h-2 bg-white rounded-full transition-all ${isHostInstitution ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm mb-0.5 ${isHostInstitution ? 'text-indigo-700' : 'text-slate-800'}`}>Internal</span>
                    <span className="text-xs text-slate-500">Select from CIET Institutions</span>
                  </div>
                </div>

                <div
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 flex items-center gap-4 bg-white hover:border-slate-300 hover:bg-slate-50 relative overflow-hidden group ${!isHostInstitution ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-500/10' : 'border-slate-200'}`}
                  onClick={() => setFormData({ ...formData, institution: '' })}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${!isHostInstitution ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                    <div className={`w-2 h-2 bg-white rounded-full transition-all ${!isHostInstitution ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm mb-0.5 ${!isHostInstitution ? 'text-indigo-700' : 'text-slate-800'}`}>External</span>
                    <span className="text-xs text-slate-500">Other College or Organization</span>
                  </div>
                </div>
              </div>

              <div className={`${groupClass} mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                <label className={labelClass}>{formData.category === 'INDUSTRY PERSONNEL' ? 'Select Professional Category' : 'Select Participant Category'} <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {Object.entries(registrationCategories).map(([key, data]) => (
                    <div
                      key={key}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col gap-1 bg-white hover:border-slate-300 hover:bg-slate-50 relative overflow-hidden group ${formData.category === key ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/5' : 'border-slate-200'}`}
                      onClick={() => setFormData({ ...formData, category: key })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${formData.category === key ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400 font-black'}`}>
                          <div className={`w-1.5 h-1.5 bg-white rounded-full transition-all ${formData.category === key ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                        </div>
                        <span className={`font-black text-[0.65rem] uppercase tracking-wider ${formData.category === key ? 'text-indigo-700' : 'text-slate-700'}`}>{key}</span>
                      </div>
                      <div className="pl-7 flex items-baseline gap-1 mt-1">
                        <span className="text-base font-black text-slate-900 font-mono tracking-tighter">₹{data.fee}</span>
                        <span className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-tight">Registration Fee (Per Author)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isHostInstitution ? (
                <div className="animate-in slide-in-from-top-2 duration-300 mt-2">
                  <label className="text-sm text-slate-500 mb-1 block">Select College</label>
                  <select
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {hostColleges.map((college, idx) => (
                      <option key={idx} value={college}>{college}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className={labelClass}>Enter {formData.category === 'INDUSTRY PERSONNEL' ? 'Organization' : 'College'} Name</label>
                  <input
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder={formData.category === 'INDUSTRY PERSONNEL' ? 'e.g. Google India' : 'e.g. PSG College of Technology'}
                    autoFocus
                    className={`${inputClass} border-indigo-500 bg-white ring-4 ring-indigo-500/10`}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${groupClass} animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100`}>
                <label className={labelClass}>{formData.category === 'INDUSTRY PERSONNEL' ? 'Vertical / Department' : 'Department'} <span className="text-red-500">*</span></label>
                <input
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                  className={`${inputClass} ${errors.department ? errorInputClass : ''}`}
                />
              </div>

              {formData.category === 'UG/PG STUDENTS' && (
                <div className={`${groupClass} animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200`}>
                  <label className={labelClass}>Year / Course <span className="text-red-500">*</span></label>
                  <input
                    name="yearOfStudy"
                    value={formData.yearOfStudy}
                    onChange={handleChange}
                    placeholder="e.g. 4th Year B.E"
                    className={`${inputClass} ${errors.yearOfStudy ? errorInputClass : ''}`}
                  />
                </div>
              )}

              {(formData.category === 'FACULTY/RESEARCH SCHOLARS' || formData.category === 'INDUSTRY PERSONNEL') && (
                <div className={`${groupClass} animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200`}>
                  <label className={labelClass}>Designation <span className="text-red-500">*</span></label>
                  <input
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g. Assistant Professor"
                    className={`${inputClass} ${errors.designation ? errorInputClass : ''}`}
                  />
                </div>
              )}

              <div className={`${groupClass} animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200`}>
                <label className={labelClass}>Area of Specialization</label>
                <input
                  name="areaOfSpecialization"
                  value={formData.areaOfSpecialization}
                  onChange={handleChange}
                  placeholder="e.g. Machine Learning, Cloud Computing"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 shrink-0">Step 3: Team Details</h2>
            <p className="text-slate-500 mb-6">Add co-authors if any.</p>
            {formData.teamMembers.map((m, i) => (
              <div key={i} className="mb-6 p-6 bg-slate-50 rounded-xl border border-slate-200 relative transition-all duration-300 hover:border-slate-300 hover:shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Co-author {i + 1}</h4>
                  <button
                    onClick={() => {
                      const newMembers = [...formData.teamMembers];
                      newMembers.splice(i, 1);
                      setFormData({ ...formData, teamMembers: newMembers });
                    }}
                    className="text-red-500 text-xs font-semibold hover:text-red-700 hover:underline transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Full Name</label>
                    <input placeholder="Name" value={m.name} onChange={(e) => updateTeamMember(i, 'name', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Email</label>
                    <input placeholder="Email" value={m.email} onChange={(e) => updateTeamMember(i, 'email', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Mobile</label>
                    <input placeholder="Mobile Number" value={m.mobile} onChange={(e) => updateTeamMember(i, 'mobile', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Category</label>
                    <select
                      value={m.category}
                      onChange={(e) => updateTeamMember(i, 'category', e.target.value)}
                      className={inputClass}
                    >
                      {Object.keys(registrationCategories).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 pt-3 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{m.category === 'INDUSTRY PERSONNEL' ? 'Organization' : 'Institution'}</label>
                      <select
                        value={
                          hostColleges.includes(m.affiliation)
                            ? m.affiliation
                            : 'External'
                        }
                        onChange={(e) => {
                          if (e.target.value !== 'External') {
                            updateTeamMember(i, 'affiliation', e.target.value);
                          } else if (!m.affiliation || hostColleges.includes(m.affiliation)) {
                            updateTeamMember(i, 'affiliation', '');
                          }
                        }}
                        className={`${inputClass} mb-2`}
                      >
                        {hostColleges.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                        <option value="External">External Institution...</option>
                      </select>
                      {!hostColleges.includes(m.affiliation) && (
                        <input placeholder={m.category === 'INDUSTRY PERSONNEL' ? 'Organization Name' : 'External Institution Name'} value={m.affiliation} onChange={(e) => updateTeamMember(i, 'affiliation', e.target.value)} className={`${inputClass} border-indigo-200 ring-2 ring-indigo-500/10 focus:ring-4`} />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{m.category === 'INDUSTRY PERSONNEL' ? 'Vertical' : 'Department'}</label>
                      <input placeholder={m.category === 'INDUSTRY PERSONNEL' ? 'Vertical' : 'Department'} value={m.department} onChange={(e) => updateTeamMember(i, 'department', e.target.value)} className={inputClass} />
                    </div>
                    {m.category === 'UG/PG STUDENTS' && (
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Year / Course</label>
                        <input placeholder="e.g. 3rd Year B.Tech" value={m.yearOfStudy} onChange={(e) => updateTeamMember(i, 'yearOfStudy', e.target.value)} className={inputClass} />
                      </div>
                    )}
                    {(m.category === 'FACULTY/RESEARCH SCHOLARS' || m.category === 'INDUSTRY PERSONNEL') && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Designation</label>
                        <input placeholder="e.g. Professor" value={m.designation} onChange={(e) => updateTeamMember(i, 'designation', e.target.value)} className={inputClass} />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Area of Specialization</label>
                      <input placeholder="e.g. Machine Learning" value={m.areaOfSpecialization} onChange={(e) => updateTeamMember(i, 'areaOfSpecialization', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3">
              <button
                onClick={addTeamMember}
                disabled={formData.teamMembers.length >= 3}
                className={`btn btn-outline w-full md:w-auto ${formData.teamMembers.length >= 3 ? 'opacity-50 cursor-not-allowed border-slate-200 text-slate-400' : ''}`}
              >
                + Add Co-author
              </button>
              {formData.teamMembers.length >= 3 && (
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                  Maximum limit of 3 co-authors reached
                </p>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 shrink-0">Step 4: Paper Details</h2>
            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900 mb-1">Full Paper Submission</h4>
                <p className="text-xs text-indigo-700/80 leading-relaxed">
                  You only need to provide your paper's core details (title, abstract, keywords) during registration.
                  The actual full paper file upload facility will be accessible securely from your Author Dashboard after completing this registration.
                </p>
              </div>
            </div>
            <div className={groupClass}>
              <label className={labelClass}>Paper Title <span className="text-red-500">*</span></label>
              <input
                name="paperTitle"
                value={formData.paperTitle}
                onChange={handleChange}
                className={`${inputClass} ${errors.paperTitle ? errorInputClass : ''}`}
              />
            </div>
            <div className={groupClass}>
              <label className={labelClass}>Select Track</label>
              <select name="track" value={formData.track} onChange={handleChange} className={inputClass}>
                {CONFERENCE_TRACKS.map(track => (
                  <option key={track.id} value={track.id}>{track.label}</option>
                ))}
              </select>
            </div>
            <div className={groupClass}>
              <label className={labelClass}>Abstract <span className="text-red-500">*</span></label>
              <textarea
                name="abstract"
                value={formData.abstract}
                onChange={handleChange}
                rows="4"
                className={`${inputClass} ${errors.abstract ? errorInputClass : ''}`}
              ></textarea>
            </div>
            <div className={groupClass}>
              <label className={labelClass}>Keywords (comma separated) <span className="text-red-500">*</span></label>
              <input
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                className={`${inputClass} ${errors.keywords ? errorInputClass : ''}`}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 shrink-0">Step 5: Review & Confirm</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 text-left">
              <p className="flex justify-between mb-2 pb-2 border-b border-slate-100">
                <strong className="text-slate-700">Paper Title:</strong>
                <span className="text-slate-900 font-medium truncate ml-4 max-w-[200px]">{formData.paperTitle || 'Untitled'}</span>
              </p>
              <div className="flex justify-between mb-4 flex-col gap-2">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 mb-1">
                  <span className="text-sm font-bold text-slate-600">Main Author ({formData.category})</span>
                  <span className="text-sm font-bold text-slate-900">₹{registrationCategories[formData.category]?.fee || 0}</span>
                </div>

                {formData.teamMembers.filter(m => m.name && m.name.trim() !== '').map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 mb-1">
                    <span className="text-sm font-bold text-slate-600">Co-author {idx + 1} ({m.category})</span>
                    <span className="text-sm font-bold text-slate-900">₹{registrationCategories[m.category]?.fee || 0}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center p-3 mt-2 border-t-2 border-dashed border-slate-200">
                  <strong className="text-slate-800 text-lg uppercase tracking-tight">Total Registration Fee:</strong>
                  <span className="text-2xl font-black text-indigo-600 font-mono tracking-tighter">₹{calculateTotalFee()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                Note: Final submission will lock your details for review. Please make sure all information is correct.
              </p>
            </div>
            <div className="mt-8 flex justify-center">
              <label className={`flex items-center cursor-pointer justify-center text-sm font-semibold select-none ${errors.terms ? 'text-red-500' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={formData.agreedToTerms}
                  onChange={(e) => {
                    setFormData({ ...formData, agreedToTerms: e.target.checked });
                    if (errors.terms) setErrors({ ...errors, terms: false });
                  }}
                  className="mr-2 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                I agree to the conference terms and conditions.
              </label>
            </div>
          </div>
        )}
      </div>

      {!showVerification && (
        <div className="flex justify-between mt-auto pt-6 pb-4 border-t border-slate-100 bg-white shrink-0 z-20">
          {step === 1 && showAccountCreation && (
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-xl font-black text-[0.7rem] uppercase tracking-widest bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2 border-none cursor-pointer"
            >
              <span className="hidden sm:inline">Already Registered? Login</span>
              <span className="sm:hidden">Login</span>
            </Link>
          )}

          {step > (showAccountCreation ? 1 : 2) && (
            <button
              onClick={prevStep}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2 border-none cursor-pointer"
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}

          {step > 1 && step < 5 && (
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-slate-400 font-semibold hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors ml-4 mr-auto text-sm border-none cursor-pointer"
            >
              Skip for now
            </button>
          )}

          {step < 5 ? (
            <button
              onClick={nextStep}
              className="btn btn-primary ml-auto"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Next >'}
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn btn-primary ml-auto" disabled={loading}>
              {loading ? 'Submitting...' : showAccountCreation ? 'Complete Registration' : 'Update Submission'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrationForm;
