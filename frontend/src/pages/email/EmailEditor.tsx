import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BulkEmailModal from './BulkEmailModal';
import { fetchStats } from '../../services/bulkEmailService';
import { fetchPersonalInfo } from '../../services/personalInfoService';
import { generateTemplate } from '../../utils/emailTemplates';
import { TemplateType } from '../../types/personalInfo';
import { fetchEmailTemplates } from '../../services/emailTemplateService';
import { EmailTemplate } from '../../types/emailTemplate';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface SentEmail {
  id: string;
  subject: string;
  to: string[];
  companies: string[];
  body: string;
  attachments: Attachment[];
  sentAt: Date;
  status: 'delivered' | 'pending' | 'failed';
}

interface Company {
  id: string;
  name: string;
  domain: string;
  logo: string;
  industry: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_COMPANIES: Company[] = [
  { id: '1', name: 'OpenAI', domain: 'openai.com', logo: 'OA', industry: 'AI Research' },
  { id: '2', name: 'Anthropic', domain: 'anthropic.com', logo: 'AN', industry: 'AI Safety' },
  { id: '3', name: 'Google DeepMind', domain: 'deepmind.com', logo: 'GD', industry: 'AI Research' },
  { id: '4', name: 'Mistral AI', domain: 'mistral.ai', logo: 'MA', industry: 'LLM' },
  { id: '5', name: 'Cohere', domain: 'cohere.com', logo: 'CO', industry: 'NLP' },
  { id: '6', name: 'Hugging Face', domain: 'huggingface.co', logo: 'HF', industry: 'ML Platform' },
  { id: '7', name: 'Scale AI', domain: 'scale.com', logo: 'SA', industry: 'Data Labeling' },
  { id: '8', name: 'Stability AI', domain: 'stability.ai', logo: 'ST', industry: 'Generative AI' },
  { id: '9', name: 'Inflection AI', domain: 'inflection.ai', logo: 'IA', industry: 'AI Assistant' },
  { id: '10', name: 'xAI', domain: 'x.ai', logo: 'XA', industry: 'AI Research' },
];

const MOCK_HISTORY: SentEmail[] = [
  {
    id: 'h1',
    subject: 'Partnership Opportunity — Q3 2026',
    to: ['cto@openai.com'],
    companies: ['OpenAI', 'Anthropic'],
    body: 'We would love to explore synergies...',
    attachments: [{ id: 'a1', name: 'proposal.pdf', size: 2048000, type: 'application/pdf', url: '#' }],
    sentAt: new Date('2026-08-20T14:32:00'),
    status: 'delivered',
  },
  {
    id: 'h2',
    subject: 'Investor Update — August 2026',
    to: ['investors@deepmind.com', 'team@mistral.ai'],
    companies: ['Google DeepMind', 'Mistral AI', 'Cohere'],
    body: 'Dear Partners, please find our monthly update...',
    attachments: [],
    sentAt: new Date('2026-08-18T09:15:00'),
    status: 'delivered',
  },
  {
    id: 'h3',
    subject: 'Product Demo Request',
    to: ['demo@huggingface.co'],
    companies: ['Hugging Face'],
    body: 'We are excited to present our latest features...',
    attachments: [
      { id: 'a2', name: 'demo-deck.pptx', size: 5242880, type: 'application/vnd.ms-powerpoint', url: '#' },
      { id: 'a3', name: 'feature-list.xlsx', size: 102400, type: 'application/vnd.ms-excel', url: '#' },
    ],
    sentAt: new Date('2026-08-15T16:45:00'),
    status: 'failed',
  },
  {
    id: 'h4',
    subject: 'Strategic Alliance Discussion',
    to: ['partnerships@scale.com'],
    companies: ['Scale AI', 'Stability AI'],
    body: 'Following our last call, I wanted to share...',
    attachments: [],
    sentAt: new Date('2026-08-12T11:00:00'),
    status: 'delivered',
  },
  {
    id: 'h5',
    subject: 'AI Ethics Framework — Collaboration',
    to: ['ethics@anthropic.com'],
    companies: ['Anthropic', 'xAI', 'Inflection AI'],
    body: 'We propose a joint working group to align...',
    attachments: [{ id: 'a4', name: 'ethics-draft.pdf', size: 819200, type: 'application/pdf', url: '#' }],
    sentAt: new Date('2026-08-08T08:30:00'),
    status: 'pending',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function fileIcon(type: string): string {
  if (type.includes('pdf')) return '📄';
  if (type.includes('image')) return '🖼️';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('excel') || type.includes('sheet')) return '📊';
  if (type.includes('powerpoint') || type.includes('presentation')) return '📋';
  if (type.includes('zip') || type.includes('rar')) return '🗜️';
  return '📎';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolbarButton({
  title, onClick, active = false, children,
}: {
  title: string; onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-violet-600 text-white shadow-md shadow-violet-300'
          : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: SentEmail['status'] }) {
  const map = {
    delivered: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    failed: 'bg-red-100 text-red-700 border border-red-200',
  };
  const icons = { delivered: '✓', pending: '◌', failed: '✕' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}>
      <span>{icons[status]}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function CompanyChip({ company, onRemove }: { company: Company; onRemove: () => void }) {
  const colors = ['bg-violet-100 text-violet-800 border-violet-200', 'bg-cyan-100 text-cyan-800 border-cyan-200', 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', 'bg-indigo-100 text-indigo-800 border-indigo-200'];
  const color = colors[parseInt(company.id) % colors.length];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <span className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white flex items-center justify-center text-[9px] font-bold">
        {company.logo[0]}
      </span>
      {company.name}
      <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 font-bold">×</button>
    </span>
  );
}

function RecipientChip({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center text-[9px]">
        @
      </span>
      {email}
      <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 font-bold">×</button>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmailEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMapRef = useRef<Map<string, File>>(new Map());

  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<SentEmail[]>(() => {
    try {
      const stored = localStorage.getItem('mailStudioHistory');
      if (stored) return JSON.parse(stored).map((e: any) => ({ ...e, sentAt: new Date(e.sentAt) }));
    } catch { /* ignore */ }
    return MOCK_HISTORY;
  });
  const [selectedHistory, setSelectedHistory] = useState<SentEmail | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAttachments, setBulkAttachments] = useState<{ filename: string; content: string; contentType: string }[]>([]);
  const [dbCompanyCount, setDbCompanyCount] = useState<number | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>(() => {
    const saved = localStorage.getItem('activeEmailTemplate') as TemplateType;
    return saved === 'professional' || saved === 'extrovert' ? saved : 'professional';
  });
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [templateLabel, setTemplateLabel] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<EmailTemplate[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const updateHistory = (updater: SentEmail[] | ((prev: SentEmail[]) => SentEmail[])) => {
    setHistory((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('mailStudioHistory', JSON.stringify(next));
      return next;
    });
  };


  // Track formatting state
  const updateActiveFormats = useCallback(() => {
    const formats: Record<string, boolean> = {};
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach((cmd) => {
      try { formats[cmd] = document.queryCommandState(cmd); } catch { /* ignore */ }
    });
    setActiveFormats(formats);
  }, []);

  const execCmd = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateActiveFormats();
  }, [updateActiveFormats]);

  // Add recipient
  const addRecipient = () => {
    const email = recipientInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email) && !recipients.includes(email)) {
      setRecipients((r) => [...r, email]);
    }
    setRecipientInput('');
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient();
    } else if (e.key === 'Backspace' && !recipientInput && recipients.length > 0) {
      setRecipients((r) => r.slice(0, -1));
    }
  };

  // File handling
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = Math.random().toString(36).slice(2);
      fileMapRef.current.set(id, file);
      const att: Attachment = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      };
      setAttachments((prev) => [...prev, att]);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Send email
  const handleSend = async () => {
    const body = templateHtml || editorRef.current?.innerHTML || '';
    if (!subject.trim() || !recipients.length) return;

    setSendError(null);
    setIsSending(true);

    const allRecipients = [...recipients];

    // Convert attachments to base64
    const readAsBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const attachmentPayload = await Promise.all(
      attachments.map(async (att) => {
        const file = fileMapRef.current.get(att.id);
        if (!file) return null;
        const content = await readAsBase64(file);
        return { filename: att.name, content, contentType: att.type };
      })
    ).then((list) => list.filter(Boolean));

    let status: SentEmail['status'] = 'delivered';

    try {
      await axios.post('/api/email/send', {
        to: allRecipients,
        subject,
        html: body,
        attachments: attachmentPayload,
      });
    } catch (err: any) {
      status = 'failed';
      setSendError(err?.response?.data?.message ?? 'Failed to send email. Check your email settings.');
    }

    const newEmail: SentEmail = {
      id: Math.random().toString(36).slice(2),
      subject,
      to: recipients,
      companies: [],
      body,
      attachments,
      sentAt: new Date(),
      status,
    };

    updateHistory((h) => [newEmail, ...h]);
    setIsSending(false);

    if (status === 'delivered') {
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setSubject('');
        setRecipients([]);
        setTemplateHtml(null);
        setTemplateLabel(null);
        fileMapRef.current.clear();
        setAttachments([]);
        if (editorRef.current) editorRef.current.innerHTML = '';
      }, 2000);
    }
  };

  const canSend = subject.trim() && recipients.length > 0 && !isSending;

  // Load DB company stats for header badge
  useEffect(() => {
    fetchStats().then((s) => setDbCompanyCount(s.totalPending)).catch(() => {});
    fetchEmailTemplates().then(setCustomTemplates).catch(() => {});
  }, []);

  // Auto-apply saved template on mount
  useEffect(() => {
    const saved = localStorage.getItem('activeEmailTemplate') as TemplateType | null;
    if (saved) applyTemplate(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = async (type: TemplateType) => {
    try {
      const info = await fetchPersonalInfo();
      const html = generateTemplate(type, info);
      setTemplateHtml(html);
      setTemplateLabel(type.charAt(0).toUpperCase() + type.slice(1));
      if (info.emailSubject) setSubject(info.emailSubject);
      localStorage.setItem('activeEmailTemplate', type);
      setActiveTemplate(type);
    } catch {/* ignore */} finally {
      setShowTemplateMenu(false);
    }
  };

  const applyCustomTemplate = (t: EmailTemplate) => {
    setTemplateHtml(t.html);
    setTemplateLabel(t.name);
    if (t.subject) setSubject(t.subject);
    setShowTemplateMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
      {showBulkModal && (
        <BulkEmailModal
          subject={subject}
          html={templateHtml || editorRef.current?.innerHTML || ''}
          activeTemplate={activeTemplate}
          attachments={bulkAttachments}
          onClose={() => setShowBulkModal(false)}
          onComplete={(sent, failed) => {
            setShowBulkModal(false);
            fetchStats().then((s) => setDbCompanyCount(s.totalPending)).catch(() => {});
            const total = sent + failed;
            const status: SentEmail['status'] = failed === 0 ? 'delivered' : sent === 0 ? 'failed' : 'pending';
            const newEmail: SentEmail = {
              id: Math.random().toString(36).slice(2),
              subject: subject || '(Bulk send)',
              to: [],
              companies: [`${sent}/${total} companies (bulk)`],
              body: editorRef.current?.innerHTML || '',
              attachments,
              sentAt: new Date(),
              status,
            };
            updateHistory((h) => [newEmail, ...h]);
          }}
        />
      )}

      {/* ── Email Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10 bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Email Preview</h2>
                  <p className="text-slate-400 text-xs">This is how your email will look to recipients</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Email Meta */}
            <div className="px-5 py-3 border-b border-white/6 bg-slate-800/50 shrink-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 w-14 shrink-0">Subject:</span>
                <span className="text-white font-semibold truncate">{subject || '(no subject)'}</span>
              </div>
              {recipients.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 w-14 shrink-0 pt-0.5">To:</span>
                  <span className="text-slate-300 line-clamp-2">{recipients.join(', ')}</span>
                </div>
              )}
              {templateLabel && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 w-14 shrink-0">Template:</span>
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-medium">{templateLabel}</span>
                </div>
              )}
            </div>

            {/* Email Body iframe */}
            <div className="flex-1 overflow-hidden bg-white">
              <iframe
                srcDoc={templateHtml || editorRef.current?.innerHTML || '<p style="font-family:sans-serif;color:#888;padding:32px;">No content to preview.</p>'}
                title="Email Preview"
                className="w-full h-full border-0"
                style={{ minHeight: '420px' }}
                sandbox="allow-same-origin"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/8 bg-black/20 shrink-0 flex items-center justify-between">
              <span className="text-slate-500 text-xs">
                {attachments.length > 0 ? `${attachments.length} attachment${attachments.length !== 1 ? 's' : ''}` : 'No attachments'}
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-slate-300 hover:text-white text-sm font-medium transition-all border border-white/10"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="border-b border-white/5 bg-black/20 backdrop-blur-xl px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight leading-none">Mail Studio</h1>
              <p className="text-slate-400 text-xs mt-0.5">Compose & broadcast to AI companies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
              {history.length} Sent
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              {dbCompanyCount !== null ? dbCompanyCount : '…'} Pending
            </div>
            <Link
              to="/settings/email"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Email Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6 h-[calc(100vh-182px)]">

          {/* ══════════════════════════════════════════════════════════════════════
              LEFT PANEL — Email Composer
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Composer Card */}
            <div className="flex-1 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden flex flex-col shadow-2xl shadow-black/40">

              {/* Card Header */}
              <div className="px-5 py-4 border-b border-white/6 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                  <span className="text-white font-semibold text-sm">New Email</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Template Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplateMenu((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12 text-slate-300 hover:text-white hover:bg-white/12 transition text-xs font-semibold max-w-[160px]"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      <span className="capitalize truncate">{templateLabel || activeTemplate}</span>
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showTemplateMenu && (
                      <div className="absolute right-0 top-full mt-1 z-50 w-60 rounded-xl border border-white/10 bg-slate-900/98 backdrop-blur-xl shadow-2xl overflow-hidden">
                        {/* Built-in templates */}
                        <div className="p-1.5 border-b border-white/8">
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1">Built-in Templates</p>
                        </div>
                        {[
                          { type: 'professional' as TemplateType, icon: '💼', label: 'Professional', desc: 'Clean • Indigo • Corporate' },
                          { type: 'extrovert' as TemplateType, icon: '🚀', label: 'Extrovert', desc: 'Bold • Dark Navy • Electric' },
                        ].map((t) => (
                          <button
                            key={t.type}
                            onClick={() => applyTemplate(t.type)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-500/10 transition text-left ${activeTemplate === t.type && !templateLabel ? 'bg-violet-500/15' : ''}`}
                          >
                            <span className="text-base">{t.icon}</span>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-semibold">{t.label}</p>
                              <p className="text-slate-500 text-[10px]">{t.desc}</p>
                            </div>
                          </button>
                        ))}

                        {/* Custom templates */}
                        <div className="p-1.5 border-t border-white/8 border-b border-white/8">
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1">My Templates</p>
                        </div>
                        {customTemplates.length === 0 ? (
                          <div className="px-4 py-3 text-slate-600 text-xs text-center">
                            No custom templates yet.{' '}
                            <Link to="/templates/builder" onClick={() => setShowTemplateMenu(false)} className="text-violet-400 hover:text-violet-300 underline">
                              Create one
                            </Link>
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto">
                            {customTemplates.map((t) => (
                              <button
                                key={t._id}
                                onClick={() => applyCustomTemplate(t)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-500/10 transition text-left ${templateLabel === t.name ? 'bg-violet-500/15' : ''}`}
                              >
                                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center text-xs text-violet-400 shrink-0 font-bold">
                                  {t.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                                  <p className="text-slate-500 text-[10px] truncate">{t.subject}</p>
                                </div>
                                {templateLabel === t.name && (
                                  <svg className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400/60"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400/60"></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* ── To Field ── */}
                <div className="px-5 pt-4 pb-3 border-b border-white/5">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest pt-2 w-14 shrink-0">To</span>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
                        {recipients.map((email) => (
                          <RecipientChip key={email} email={email} onRemove={() => setRecipients((r) => r.filter((e) => e !== email))} />
                        ))}
                        <input
                          type="email"
                          value={recipientInput}
                          onChange={(e) => setRecipientInput(e.target.value)}
                          onKeyDown={handleRecipientKeyDown}
                          onBlur={addRecipient}
                          placeholder={recipients.length === 0 ? 'Add email address, press Enter...' : ''}
                          className="flex-1 min-w-[200px] bg-transparent text-white placeholder-slate-500 text-sm outline-none py-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Bulk Send ── */}
                <div className="px-5 py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest w-14 shrink-0">Bulk</span>
                    <button
                      onClick={async () => {
                        const readAsBase64 = (file: File): Promise<string> =>
                          new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve((reader.result as string).split(',')[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                        const converted = await Promise.all(
                          attachments.map(async (att) => {
                            const file = fileMapRef.current.get(att.id);
                            if (!file) return null;
                            const content = await readAsBase64(file);
                            return { filename: att.name, content, contentType: att.type };
                          })
                        ).then((list) => list.filter(Boolean) as { filename: string; content: string; contentType: string }[]);
                        setBulkAttachments(converted);
                        setShowBulkModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Select Recipients from Database
                    </button>
                    {dbCompanyCount !== null && dbCompanyCount > 0 && (
                      <span className="text-xs text-slate-500">{dbCompanyCount.toLocaleString()} pending companies</span>
                    )}
                  </div>
                </div>

                {/* ── Subject ── */}
                <div className="px-5 py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest w-14 shrink-0">Subject</span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none font-medium"
                    />
                  </div>
                </div>

                {/* ── Template Badge ── */}
                {templateHtml && (
                  <div className="px-5 py-2.5 border-b border-white/5 bg-violet-500/8 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-emerald-400 font-semibold">{templateLabel} template applied</span>
                      <span className="text-slate-500">— full HTML email ready to send</span>
                    </div>
                    <button
                      onClick={() => { setTemplateHtml(null); setTemplateLabel(null); }}
                      className="text-slate-500 hover:text-red-400 text-xs transition"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                {/* ── JIRA-Style Toolbar ── */}
                <div className="px-4 py-2 border-b border-white/5 bg-black/10">
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {/* Text formatting */}
                    <ToolbarButton title="Bold (Ctrl+B)" onClick={() => execCmd('bold')} active={activeFormats['bold']}>
                      <strong>B</strong>
                    </ToolbarButton>
                    <ToolbarButton title="Italic (Ctrl+I)" onClick={() => execCmd('italic')} active={activeFormats['italic']}>
                      <em>I</em>
                    </ToolbarButton>
                    <ToolbarButton title="Underline (Ctrl+U)" onClick={() => execCmd('underline')} active={activeFormats['underline']}>
                      <span className="underline">U</span>
                    </ToolbarButton>
                    <ToolbarButton title="Strikethrough" onClick={() => execCmd('strikeThrough')} active={activeFormats['strikeThrough']}>
                      <span className="line-through">S</span>
                    </ToolbarButton>

                    {/* Divider */}
                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Headings */}
                    <ToolbarButton title="Heading 1" onClick={() => execCmd('formatBlock', 'h1')}>
                      <span className="text-xs font-bold">H1</span>
                    </ToolbarButton>
                    <ToolbarButton title="Heading 2" onClick={() => execCmd('formatBlock', 'h2')}>
                      <span className="text-xs font-bold">H2</span>
                    </ToolbarButton>
                    <ToolbarButton title="Paragraph" onClick={() => execCmd('formatBlock', 'p')}>
                      <span className="text-xs">¶</span>
                    </ToolbarButton>

                    {/* Divider */}
                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Lists */}
                    <ToolbarButton title="Bullet list" onClick={() => execCmd('insertUnorderedList')} active={activeFormats['insertUnorderedList']}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </ToolbarButton>
                    <ToolbarButton title="Numbered list" onClick={() => execCmd('insertOrderedList')} active={activeFormats['insertOrderedList']}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </ToolbarButton>

                    {/* Divider */}
                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Quote & Code */}
                    <ToolbarButton title="Block quote" onClick={() => execCmd('formatBlock', 'blockquote')}>
                      <span className="text-base leading-none">"</span>
                    </ToolbarButton>
                    <ToolbarButton title="Code block" onClick={() => execCmd('formatBlock', 'pre')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </ToolbarButton>

                    {/* Divider */}
                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Alignment */}
                    <ToolbarButton title="Align left" onClick={() => execCmd('justifyLeft')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h12" />
                      </svg>
                    </ToolbarButton>
                    <ToolbarButton title="Align center" onClick={() => execCmd('justifyCenter')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M6 18h12" />
                      </svg>
                    </ToolbarButton>

                    {/* Divider */}
                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Link */}
                    <ToolbarButton
                      title="Insert link"
                      onClick={() => {
                        const url = prompt('Enter URL:');
                        if (url) execCmd('createLink', url);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </ToolbarButton>

                    {/* Undo/Redo */}
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <ToolbarButton title="Undo" onClick={() => execCmd('undo')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </ToolbarButton>
                    <ToolbarButton title="Redo" onClick={() => execCmd('redo')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                      </svg>
                    </ToolbarButton>
                  </div>
                </div>

                {/* ── Content Editor ── */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyUp={updateActiveFormats}
                  onMouseUp={updateActiveFormats}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  data-placeholder="Start writing your email..."
                  className="flex-1 min-h-[200px] px-6 py-5 text-slate-200 text-sm leading-relaxed outline-none
                    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-4
                    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-3
                    [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-2
                    [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_blockquote]:mb-2
                    [&_pre]:bg-black/40 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-cyan-300 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:mb-2
                    [&_a]:text-violet-400 [&_a]:underline
                    empty:[&]:before:content-[attr(data-placeholder)] empty:[&]:before:text-slate-600 empty:[&]:before:pointer-events-none"
                />

                {/* ── Attachments ── */}
                {attachments.length > 0 && (
                  <div className="px-5 py-3 border-t border-white/5 bg-black/10">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">
                      Attachments ({attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors group"
                        >
                          <span className="text-base">{fileIcon(att.type)}</span>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate max-w-[120px]">{att.name}</p>
                            <p className="text-slate-500 text-[10px]">{formatBytes(att.size)}</p>
                          </div>
                          <button
                            onClick={() => {
                              fileMapRef.current.delete(att.id);
                              setAttachments((a) => a.filter((x) => x.id !== att.id));
                            }}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Drop Zone (when dragging) ── */}
                {isDragging && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setIsDragging(false)}
                    className="absolute inset-0 bg-violet-500/20 border-2 border-dashed border-violet-400 rounded-2xl flex items-center justify-center z-10"
                  >
                    <p className="text-violet-300 text-lg font-semibold">Drop files here</p>
                  </div>
                )}
              </div>

              {/* ── Footer Actions ── */}
              <div
                className="px-5 py-4 border-t border-white/6 bg-black/15 flex items-center justify-between gap-4"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
              >
                <div className="flex items-center gap-2">
                  {/* Attach File */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all text-sm border border-transparent hover:border-white/10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attach
                  </button>

                  <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all text-sm border border-transparent hover:border-white/10">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Image
                  </button>

                  {/* Preview button */}
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all text-sm border border-transparent hover:border-white/10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>

                  {/* Drag hint */}
                  <span className="text-slate-600 text-xs hidden xl:block">or drag & drop files</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Send error */}
                  {sendError && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs max-w-[240px]">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span className="truncate">{sendError}</span>
                      <button onClick={() => setSendError(null)} className="shrink-0 opacity-60 hover:opacity-100">×</button>
                    </div>
                  )}
                  {/* Recipient count badge */}
                  {recipients.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                      <span className="text-violet-300 text-xs font-semibold">
                        {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      sendSuccess
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : canSend
                        ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-105 active:scale-95'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {isSending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : sendSuccess ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Sent!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT PANEL — Sent History
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="w-[380px] shrink-0 flex flex-col gap-3 overflow-hidden">

            {/* History Header */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sent History
              </h2>
              <div className="flex gap-1.5 items-center">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  {history.filter((h) => h.status === 'delivered').length} delivered
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/20">
                  {history.filter((h) => h.status === 'failed').length} failed
                </span>
                {history.length > 0 && (
                  <button
                    onClick={() => { updateHistory([]); setSelectedHistory(null); }}
                    className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 text-xs font-semibold transition-all"
                    title="Clear all history"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {history.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedHistory(selectedHistory?.id === email.id ? null : email)}
                  className={`w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden ${
                    selectedHistory?.id === email.id
                      ? 'border-violet-500/40 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                      : 'border-white/6 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10'
                  }`}
                >
                  {/* Card Top */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white font-semibold text-sm leading-tight line-clamp-1">{email.subject}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={email.status} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateHistory((h) => h.filter((x) => x.id !== email.id));
                            if (selectedHistory?.id === email.id) setSelectedHistory(null);
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Recipients */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <p className="text-slate-400 text-xs truncate">
                        {[...email.to, ...email.companies.map((c) => c)].join(', ')}
                      </p>
                    </div>

                    {/* Company tags */}
                    {email.companies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {email.companies.slice(0, 3).map((c) => (
                          <span key={c} className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 text-[10px] font-medium border border-violet-500/15">
                            {c}
                          </span>
                        ))}
                        {email.companies.length > 3 && (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-500 text-[10px]">
                            +{email.companies.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-[11px]">
                        {email.sentAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {email.sentAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-slate-600 text-[11px]">{timeAgo(email.sentAt)}</span>
                    </div>
                  </div>

                  {/* Attachment strip */}
                  {email.attachments.length > 0 && (
                    <div className="px-4 py-2 bg-black/15 border-t border-white/5 flex items-center gap-2">
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <p className="text-slate-500 text-[11px]">
                        {email.attachments.map((a) => a.name).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Expanded preview */}
                  {selectedHistory?.id === email.id && (
                    <div className="px-4 py-3 bg-black/20 border-t border-violet-500/20">
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-4">
                        {email.body.replace(/<[^>]+>/g, '') || 'No body content'}
                      </p>
                      {email.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {email.attachments.map((att) => (
                            <span key={att.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-slate-300">
                              <span>{fileIcon(att.type)}</span>
                              <span className="truncate max-w-[100px]">{att.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button className="flex-1 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-colors">
                          View Full
                        </button>
                        <button className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/8 text-slate-400 text-xs font-semibold hover:bg-white/8 transition-colors">
                          Resend
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Stats Footer */}
            <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-white font-bold text-lg">{history.length}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Total</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-bold text-lg">{history.filter((h) => h.status === 'delivered').length}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Delivered</p>
                </div>
                <div>
                  <p className="text-violet-400 font-bold text-lg">
                    {history.length > 0 ? Math.round((history.filter((h) => h.status === 'delivered').length / history.length) * 100) : 0}%
                  </p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
