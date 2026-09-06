import { useEffect, useState } from 'react';
import { PersonalInfo, Skill } from '../../types/personalInfo';
import { fetchPersonalInfo, savePersonalInfo } from '../../services/personalInfoService';

const defaultInfo: PersonalInfo = {
  name: 'Saurabh Mistry',
  emailSubject: 'Looking For Job Opportunity - Senior Software Engineer - Full Stack Web Developer - MERN / MEAN Stack',
  role: 'Full Stack Web Developer (MERN Stack, MEAN Stack)',
  workExperience: '8 Years',
  skills: [
    { name: 'NodeJs, Express', experience: '8 years' },
    { name: 'Angular', experience: '4+ years' },
    { name: 'React', experience: '4+ years' },
    { name: 'MongoDB', experience: '4+ years' },
    { name: 'MySQL', experience: '3.5+ years' },
    { name: 'AWS', experience: '1+ year' },
  ],
  noticePeriod: 'Immediate Joiner',
  currentCTC: '15 LPA',
  expectedCTC: 'As per industry standard',
  portfolioLink: 'https://mistrysaurabh.github.io/',
  linkedinLink: '',
  githubLink: '',
  phone: '',
  email: '',
  customMessage: 'Please Find My Resume Attached Below.',
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

export default function PersonalInfoPage() {
  const [form, setForm] = useState<PersonalInfo>(defaultInfo);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonalInfo()
      .then((data) => {
        if (data.name) setForm(data);
      })
      .catch(() => {});
  }, []);

  const set = (field: keyof PersonalInfo, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setSkill = (i: number, field: keyof Skill, value: string) =>
    setForm((prev) => {
      const skills = [...prev.skills];
      skills[i] = { ...skills[i], [field]: value };
      return { ...prev, skills };
    });

  const addSkill = () =>
    setForm((prev) => ({ ...prev, skills: [...prev.skills, { name: '', experience: '' }] }));

  const removeSkill = (i: number) =>
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePersonalInfo(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white shadow-xl shadow-indigo-200">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black">
              {form.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Personal Information</h1>
              <p className="text-indigo-200 text-sm">Stored in database · Used to power all email templates</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full" />
      </div>

      {/* Toast */}
      {saved && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Personal information saved!
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      <div className="space-y-6">

        {/* Basic Info */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <span className="text-lg">👤</span>
            <h2 className="font-bold text-gray-800">Basic Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Saurabh Mistry" />
            </div>
            <div>
              <label className={labelCls}>Email Subject Line</label>
              <input className={inputCls} value={form.emailSubject} onChange={(e) => set('emailSubject', e.target.value)} placeholder="Looking For Job Opportunity - ..." />
              <p className="text-xs text-gray-400 mt-1">This becomes the email subject when sending</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Role / Designation</label>
                <input className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Full Stack Web Developer" />
              </div>
              <div>
                <label className={labelCls}>Work Experience</label>
                <input className={inputCls} value={form.workExperience} onChange={(e) => set('workExperience', e.target.value)} placeholder="8 Years" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className={labelCls}>Personal Email</label>
                <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@gmail.com" />
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="font-bold text-gray-800">Technical Skills</h2>
            </div>
            <button onClick={addSkill} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Skill
            </button>
          </div>
          <div className="p-6 space-y-3">
            {form.skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <input
                  className={`${inputCls} flex-1`}
                  value={skill.name}
                  onChange={(e) => setSkill(i, 'name', e.target.value)}
                  placeholder="Skill name (e.g. NodeJs, Express)"
                />
                <input
                  className={`${inputCls} w-36`}
                  value={skill.experience}
                  onChange={(e) => setSkill(i, 'experience', e.target.value)}
                  placeholder="e.g. 8 years"
                />
                <button
                  onClick={() => removeSkill(i)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* CTC & Availability */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <span className="text-lg">💼</span>
            <h2 className="font-bold text-gray-800">Availability & CTC</h2>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Notice Period</label>
              <input className={inputCls} value={form.noticePeriod} onChange={(e) => set('noticePeriod', e.target.value)} placeholder="Immediate Joiner" />
            </div>
            <div>
              <label className={labelCls}>Current CTC</label>
              <input className={inputCls} value={form.currentCTC} onChange={(e) => set('currentCTC', e.target.value)} placeholder="15 LPA" />
            </div>
            <div>
              <label className={labelCls}>Expected CTC</label>
              <input className={inputCls} value={form.expectedCTC} onChange={(e) => set('expectedCTC', e.target.value)} placeholder="As per industry standard" />
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <span className="text-lg">🔗</span>
            <h2 className="font-bold text-gray-800">Links</h2>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Portfolio</label>
              <input className={inputCls} value={form.portfolioLink} onChange={(e) => set('portfolioLink', e.target.value)} placeholder="https://mistrysaurabh.github.io/" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>LinkedIn</label>
                <input className={inputCls} value={form.linkedinLink} onChange={(e) => set('linkedinLink', e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className={labelCls}>GitHub</label>
                <input className={inputCls} value={form.githubLink} onChange={(e) => set('githubLink', e.target.value)} placeholder="https://github.com/..." />
              </div>
            </div>
          </div>
        </section>

        {/* Custom Message */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <span className="text-lg">✉️</span>
            <h2 className="font-bold text-gray-800">Custom Message</h2>
          </div>
          <div className="p-6">
            <label className={labelCls}>Additional note shown in email</label>
            <textarea
              rows={3}
              className={inputCls}
              value={form.customMessage}
              onChange={(e) => set('customMessage', e.target.value)}
              placeholder="Please Find My Resume Attached Below."
            />
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2.5 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Personal Information
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
