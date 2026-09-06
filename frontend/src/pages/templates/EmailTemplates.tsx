import { useEffect, useState } from 'react';
import { TemplateType, PersonalInfo } from '../../types/personalInfo';
import { fetchPersonalInfo } from '../../services/personalInfoService';
import { generateTemplate } from '../../utils/emailTemplates';
import { Link } from 'react-router-dom';

const TEMPLATES: {
  type: TemplateType;
  label: string;
  tagline: string;
  description: string;
  palette: string[];
  icon: string;
  badge: string;
  badgeColor: string;
  cardGradient: string;
  btnGradient: string;
}[] = [
  {
    type: 'professional',
    label: 'Professional',
    tagline: 'Clean · Corporate · Trusted',
    description: 'Structured, formal email with indigo/navy design. Best for corporate roles and enterprise hiring managers.',
    palette: ['#312e81', '#4f46e5', '#6366f1', '#eef2ff'],
    icon: '💼',
    badge: 'Corporate',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    cardGradient: 'from-indigo-50 to-blue-50',
    btnGradient: 'from-indigo-600 to-blue-600',
  },
  {
    type: 'extrovert',
    label: 'Extrovert',
    tagline: 'Bold · Dark Navy · Electric',
    description: 'Dark navy header with electric cyan and coral accents. Unforgettable in any inbox. Perfect for startups and product roles.',
    palette: ['#ff6b35', '#ff2d9d', '#fbbf24', '#f59e0b'],
    icon: '🚀',
    badge: 'Startup',
    badgeColor: 'bg-orange-100 text-orange-700',
    cardGradient: 'from-orange-400 via-pink-500 to-amber-400',
    btnGradient: 'from-orange-500 to-pink-600',
  },
];

export default function EmailTemplates() {
  const [info, setInfo] = useState<PersonalInfo | null>(null);
  const [preview, setPreview] = useState<{ type: TemplateType; html: string } | null>(null);
  const [active, setActive] = useState<TemplateType>(() => {
    const saved = localStorage.getItem('activeEmailTemplate') as TemplateType;
    return saved === 'professional' || saved === 'extrovert' ? saved : 'professional';
  });

  useEffect(() => {
    fetchPersonalInfo().then(setInfo).catch(() => {});
  }, []);

  const openPreview = (type: TemplateType) => {
    if (!info) return;
    setPreview({ type, html: generateTemplate(type, info) });
  };

  const useTemplate = (type: TemplateType) => {
    localStorage.setItem('activeEmailTemplate', type);
    setActive(type);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Email Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a template style — your Personal Information populates it automatically</p>
        </div>
        <Link
          to="/settings/personal-info"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Edit Personal Info
        </Link>
      </div>

      {!info?.name && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Fill in your <Link to="/settings/personal-info" className="font-bold underline">Personal Information</Link> first so templates show your real details.
        </div>
      )}

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {TEMPLATES.map((t) => {
          const isActive = active === t.type;
          const isDark = false;
          return (
            <div
              key={t.type}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                isActive ? 'border-indigo-500 shadow-xl shadow-indigo-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              {isActive && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Active
                </div>
              )}

              {/* Color swatch header */}
              <div className={`h-28 bg-gradient-to-br ${isDark ? 'from-gray-900 to-slate-800' : t.cardGradient} flex items-center justify-center relative overflow-hidden`}>
                <div className="flex gap-2">
                  {t.palette.map((c, i) => (
                    <div key={i} style={{ background: c }} className="w-7 h-7 rounded-full shadow-sm border-2 border-white/30" />
                  ))}
                </div>
                <div className={`absolute bottom-3 left-3 text-2xl`}>{t.icon}</div>
              </div>

              {/* Card body */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-black text-gray-900 text-lg">{t.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.badgeColor}`}>{t.badge}</span>
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.tagline}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.description}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => openPreview(t.type)}
                    disabled={!info?.name}
                    className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-40"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => useTemplate(t.type)}
                    className={`flex-1 py-2 text-sm font-bold text-white bg-gradient-to-r ${t.btnGradient} rounded-lg shadow hover:shadow-md hover:scale-105 active:scale-95 transition-all ${isActive ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
                  >
                    {isActive ? '✓ In Use' : 'Use This'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to Mail Studio */}
      <div className="flex items-center justify-center">
        <Link
          to="/email"
          className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Open Mail Studio
        </Link>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 capitalize">{preview.type} Template</span>
                <span className="text-xs text-gray-400">— Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { useTemplate(preview.type); setPreview(null); }}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Use This Template
                </button>
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={preview.html}
                className="w-full h-full"
                style={{ minHeight: '600px', border: 'none' }}
                title="Template Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
