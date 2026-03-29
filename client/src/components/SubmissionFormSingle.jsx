import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, Upload, CheckCircle, Plus, Trash2, Save, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFERENCE_TRACKS } from '../constants/conferenceData';

const SubmissionFormSingle = ({ registration, user, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
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
    agreedToTerms: false
  });

  const hostColleges = [
    "Coimbatore Institute of Engineering and Technology",
    "Coimbatore Institute of Management and Technology",
    "Kovai Kalaimagal Arts and Science College",
    "CIET - School of Architecture"
  ];

  const registrationCategories = {
    'UG/PG STUDENTS': { fee: 500 },
    'FACULTY/RESEARCH SCHOLARS': { fee: 750 },
    'EXTERNAL / ONLINE PRESENTATION': { fee: 300 },
    'INDUSTRY PERSONNEL': { fee: 900 }
  };

  useEffect(() => {
    if (registration) {
      setFormData(prev => ({
        ...prev,
        name: registration.personalDetails?.name || user?.name || '',
        email: registration.personalDetails?.email || user?.email || '',
        mobile: registration.personalDetails?.mobile || user?.phone || '',
        institution: registration.personalDetails?.institution || 'Coimbatore Institute of Engineering and Technology',
        department: registration.personalDetails?.department || '',
        designation: registration.personalDetails?.designation || '',
        areaOfSpecialization: registration.personalDetails?.areaOfSpecialization || '',
        yearOfStudy: registration.personalDetails?.yearOfStudy || '',
        category: registration.personalDetails?.category || 'UG/PG STUDENTS',
        teamMembers: registration.teamMembers || [],
        paperTitle: registration.paperDetails?.title || '',
        abstract: registration.paperDetails?.abstract || '',
        keywords: registration.paperDetails?.keywords?.join(', ') || '',
        track: registration.paperDetails?.track || 'CIDT'
      }));
    }
  }, [registration, user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addTeamMember = () => {
    if (formData.teamMembers.length >= 4) return toast.error("Maximum 4 co-authors allowed");
    setFormData({
      ...formData,
      teamMembers: [...formData.teamMembers, { name: '', email: '', mobile: '', affiliation: '', department: '', designation: '', areaOfSpecialization: '', yearOfStudy: '', category: 'UG/PG STUDENTS' }]
    });
  };

  const removeTeamMember = (index) => {
    const updated = [...formData.teamMembers];
    updated.splice(index, 1);
    setFormData({ ...formData, teamMembers: updated });
  };

  const updateTeamMember = (index, field, value) => {
    const updated = [...formData.teamMembers];
    updated[index][field] = value;
    setFormData({ ...formData, teamMembers: updated });
  };

  const validate = () => {
    if (!formData.mobile || formData.mobile.length < 10) return "Valid mobile number is required";
    if (!formData.institution) return "Institution is required";
    if (!formData.department) return "Department is required";
    
    if (formData.category === 'UG/PG STUDENTS' && !formData.yearOfStudy) return "Year of study is required for students";
    if ((formData.category === 'FACULTY/RESEARCH SCHOLARS' || formData.category === 'INDUSTRY PERSONNEL') && !formData.designation) return "Designation is required";

    if (!formData.paperTitle) return "Paper title is required";
    if (!formData.abstract) return "Abstract is required";
    if (!formData.keywords) return "Keywords are required";

    for (let i = 0; i < formData.teamMembers.length; i++) {
        const m = formData.teamMembers[i];
        if (!m.name || !m.email || !m.mobile || !m.affiliation || !m.department) return `Please fill core details for co-author ${i+1}`;
        if (m.category === 'UG/PG STUDENTS' && !m.yearOfStudy) return `Year/Course is required for co-author ${i+1}`;
        if ((m.category === 'FACULTY/RESEARCH SCHOLARS' || m.category === 'INDUSTRY PERSONNEL') && !m.designation) return `Designation is required for co-author ${i+1}`;
    }

    return null;
  };

  const handleAction = async (isFinal) => {
    if (isFinal && !formData.agreedToTerms) return toast.error("You must agree to terms");
    if (isFinal) {
        const err = validate();
        if (err) return toast.error(err);
    }

    setLoading(true);
    try {
      const validTeamMembers = formData.teamMembers.filter(m => m.name && m.name.trim() !== '');
      const payload = {
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
      };

      const { data: savedReg } = await axios.post('/api/registrations/draft', {
        ...payload,
        id: registration?._id
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (isFinal) {
        await axios.post('/api/registrations/submit', {
          id: savedReg._id
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        toast.success("Submission Completed!");
      } else {
        toast.success("Draft Saved!");
      }

      if (onSuccess) onSuccess(savedReg);
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1";
  const sectionTitle = "text-sm font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2";

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Principal Author Section */}
      <section>
        <h3 className={sectionTitle}>
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
          Principal Author Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input value={formData.name} disabled className={inputClass + " bg-slate-100 italic"} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input value={formData.email} disabled className={inputClass + " bg-slate-100 italic"} />
            </div>
            <div>
              <label className={labelClass}>Mobile Number *</label>
              <input name="mobile" value={formData.mobile} onChange={handleChange} className={inputClass} placeholder="Enter mobile number" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Category & Specialization *</label>
              <div className={`grid gap-3 ${formData.category === 'UG/PG STUDENTS' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <select name="category" value={formData.category} onChange={handleChange} className={inputClass}>
                  {Object.keys(registrationCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {formData.category === 'UG/PG STUDENTS' && (
                  <input name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} className={inputClass} placeholder="Year/Course" />
                )}
                <input name="areaOfSpecialization" value={formData.areaOfSpecialization} onChange={handleChange} className={inputClass} placeholder="Specialization" />
              </div>
            </div>
            <div>
                <label className={labelClass}>{formData.category === 'INDUSTRY PERSONNEL' ? 'Organization *' : 'Institution *'}</label>
                {formData.category === 'INDUSTRY PERSONNEL' ? (
                    <input 
                        name="institution"
                        className={inputClass} 
                        value={formData.institution} 
                        onChange={handleChange}
                        placeholder="Enter organization name..."
                    />
                ) : (
                    <>
                        <select 
                            name="institution" 
                            value={hostColleges.includes(formData.institution) ? formData.institution : 'External'} 
                            onChange={(e) => {
                                if (e.target.value === 'External') setFormData({...formData, institution: ''});
                                else setFormData({...formData, institution: e.target.value});
                            }}
                            className={inputClass}
                        >
                            {hostColleges.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="External">Other Institution...</option>
                        </select>
                        {!hostColleges.includes(formData.institution) && (
                            <input 
                                className={inputClass + " mt-2 border-indigo-200 bg-white"} 
                                value={formData.institution} 
                                onChange={(e) => setFormData({...formData, institution: e.target.value})}
                                placeholder="Type institution name..."
                            />
                        )}
                    </>
                )}
            </div>
            <div>
              <label className={labelClass}>{formData.category === 'INDUSTRY PERSONNEL' ? 'Vertical & Designation *' : 'Department & Designation *'}</label>
              <div className="grid grid-cols-2 gap-3">
                <input name="department" value={formData.department} onChange={handleChange} className={inputClass} placeholder={formData.category === 'INDUSTRY PERSONNEL' ? 'Vertical' : 'Department'} />
                <input name="designation" value={formData.designation} onChange={handleChange} className={inputClass} placeholder="Designation" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Paper Details Section */}
      <section className="pt-10 border-t border-slate-100">
        <h3 className={sectionTitle}>
          <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
          Manuscript Information
        </h3>
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Research Title *</label>
            <input name="paperTitle" value={formData.paperTitle} onChange={handleChange} className={inputClass} placeholder="Full title of your research paper" />
          </div>
          <div>
            <label className={labelClass}>Abstract *</label>
            <textarea name="abstract" rows="5" value={formData.abstract} onChange={handleChange} className={inputClass} placeholder="Brief abstract summarizing your work" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Keywords (comma separated) *</label>
              <input name="keywords" value={formData.keywords} onChange={handleChange} className={inputClass} placeholder="e.g. AI, Cyber Security, Blockchain" />
            </div>
            <div>
              <label className={labelClass}>Conference Track *</label>
              <select name="track" value={formData.track} onChange={handleChange} className={inputClass}>
                {CONFERENCE_TRACKS.map(track => (
                  <option key={track.id} value={track.id}>{track.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Co-Authors Section */}
      <section className="pt-10 border-t border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className={sectionTitle + " mb-0"}>
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
            Co-Authors / Team Members
          </h3>
          <button 
            type="button" 
            onClick={addTeamMember}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all opacity-80 hover:opacity-100"
          >
            <Plus size={14} /> Add Member
          </button>
        </div>

        <div className="space-y-4">
          {formData.teamMembers.length === 0 && (
            <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">No co-authors added yet (Optional)</p>
            </div>
          )}
          {formData.teamMembers.map((member, idx) => (
            <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative group animate-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => removeTeamMember(idx)}
                className="absolute top-6 right-6 p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <Trash2 size={16} />
              </button>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Member {idx + 1}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input value={member.name} onChange={(e) => updateTeamMember(idx, 'name', e.target.value)} className={inputClass} placeholder="Name" />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input value={member.email} onChange={(e) => updateTeamMember(idx, 'email', e.target.value)} className={inputClass} placeholder="Email" />
                </div>
                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <input value={member.mobile} onChange={(e) => updateTeamMember(idx, 'mobile', e.target.value)} className={inputClass} placeholder="Mobile" />
                </div>
                <div>
                    <label className={labelClass}>Category</label>
                    <select value={member.category} onChange={(e) => updateTeamMember(idx, 'category', e.target.value)} className={inputClass}>
                        {Object.keys(registrationCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{member.category === 'INDUSTRY PERSONNEL' ? 'Organization' : 'Institution'}</label>
                  {member.category === 'INDUSTRY PERSONNEL' ? (
                    <input 
                        className={inputClass} 
                        value={member.affiliation} 
                        onChange={(e) => updateTeamMember(idx, 'affiliation', e.target.value)}
                        placeholder="Organization Name"
                    />
                  ) : (
                    <>
                      <select 
                        value={hostColleges.includes(member.affiliation) ? member.affiliation : 'External'} 
                        onChange={(e) => {
                            if (e.target.value === 'External') updateTeamMember(idx, 'affiliation', '');
                            else updateTeamMember(idx, 'affiliation', e.target.value);
                        }}
                        className={inputClass}
                      >
                            {hostColleges.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="External">Other Institution...</option>
                      </select>
                      {!hostColleges.includes(member.affiliation) && (
                        <input 
                            className={inputClass + " mt-2 border-indigo-200 bg-white"} 
                            value={member.affiliation} 
                            onChange={(e) => updateTeamMember(idx, 'affiliation', e.target.value)}
                            placeholder="Type institution name..."
                        />
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className={labelClass}>{member.category === 'INDUSTRY PERSONNEL' ? 'Vertical' : 'Department'}</label>
                  <input value={member.department} onChange={(e) => updateTeamMember(idx, 'department', e.target.value)} className={inputClass} placeholder="Dept" />
                </div>
                {member.category === 'UG/PG STUDENTS' && (
                    <div>
                        <label className={labelClass}>Year / Course</label>
                        <input value={member.yearOfStudy} onChange={(e) => updateTeamMember(idx, 'yearOfStudy', e.target.value)} className={inputClass} placeholder="e.g. 3rd Year B.Tech" />
                    </div>
                )}
                {(member.category === 'FACULTY/RESEARCH SCHOLARS' || member.category === 'INDUSTRY PERSONNEL') && (
                    <div>
                        <label className={labelClass}>Designation</label>
                        <input value={member.designation} onChange={(e) => updateTeamMember(idx, 'designation', e.target.value)} className={inputClass} placeholder="e.g. Professor" />
                    </div>
                )}
                <div>
                  <label className={labelClass}>Area of Specialization</label>
                  <input value={member.areaOfSpecialization} onChange={(e) => updateTeamMember(idx, 'areaOfSpecialization', e.target.value)} className={inputClass} placeholder="Specialization" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Submission Footer */}
      <section className="pt-10 border-t border-slate-100">
        <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 mb-8">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center mt-0.5">
              <input 
                type="checkbox" 
                checked={formData.agreedToTerms}
                onChange={(e) => setFormData({...formData, agreedToTerms: e.target.checked})}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-indigo-200 bg-white transition-all checked:bg-indigo-600 checked:border-indigo-600" 
              />
              <CheckCircle className="absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 left-0.5 top-0.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">I Agree to Terms & Conditions</p>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                I certify that this is original work and hasn't been submitted elsewhere. I also agree to complete the payment once the paper is accepted.
              </p>
            </div>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <AlertCircle size={14} className="text-indigo-400" />
            Drafts are auto-saved locally before server sync
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onCancel && (
              <button 
                onClick={onCancel}
                className="px-6 py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
            )}
            <button 
              disabled={loading}
              onClick={() => handleAction(false)}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Save size={16} /> Save Draft
            </button>
            <button 
              disabled={loading}
              onClick={() => handleAction(true)}
              className="flex-1 sm:flex-none px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : (
                <>
                  <Send size={16} /> 
                  {registration?.status === 'Submitted' || registration?.status === 'Under Review' || registration?.status === 'Re-upload Requested' 
                    ? "Update Manuscript" 
                    : "Submit Manuscript"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubmissionFormSingle;
