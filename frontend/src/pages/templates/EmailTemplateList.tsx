import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmailTemplate } from '../../types/emailTemplate';
import { fetchEmailTemplates, deleteEmailTemplate } from '../../services/emailTemplateService';

export default function EmailTemplateList() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmailTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    setDeletingId(id);
    try {
      await deleteEmailTemplate(id);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Custom Email Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Build and save reusable email templates with your own content</p>
        </div>
        <Link
          to="/templates/builder"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No templates yet. Create your first one!</p>
          <Link
            to="/templates/builder"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow transition"
          >
            Create Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t._id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              {/* Preview strip */}
              <div
                className="h-28 bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center cursor-pointer"
                onClick={() => setPreview(t)}
              >
                <div className="text-center">
                  <svg className="w-10 h-10 text-indigo-200 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-indigo-300 font-medium">{t.blocks.length} block{t.blocks.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-base truncate">{t.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">Subject: {t.subject}</p>
                <p className="text-xs text-gray-300 mt-1">{formatDate(t.createdAt)}</p>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setPreview(t)}
                    className="flex-1 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => navigate(`/templates/builder/${t._id}`)}
                    className="flex-1 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t._id)}
                    disabled={deletingId === t._id}
                    className="py-1.5 px-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
              <div>
                <span className="font-bold text-gray-800">{preview.name}</span>
                <span className="text-xs text-gray-400 ml-2">— {preview.subject}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { navigate(`/templates/builder/${preview._id}`); setPreview(null); }}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                >
                  Edit
                </button>
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 transition p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={preview.html}
                className="w-full"
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
