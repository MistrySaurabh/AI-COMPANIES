import { useEffect, useState, useCallback } from 'react';
import { EmailSettings as IEmailSettings, PlanType } from '../../types/emailSettings';
import { fetchAllSettings, saveSettings, testConnection, sendTestEmail } from '../../services/emailSettingsService';

interface PlanConfig {
  type: PlanType;
  label: string;
  description: string;
  color: {
    bg: string;
    border: string;
    badge: string;
    badgeText: string;
    activeBg: string;
    btn: string;
    btnHover: string;
    icon: string;
    ring: string;
  };
  icon: React.ReactNode;
}

const PLANS: PlanConfig[] = [
  {
    type: 'professional',
    label: 'Professional',
    description: 'Formal, corporate-grade sender for official outreach',
    color: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      badge: 'bg-indigo-100',
      badgeText: 'text-indigo-700',
      activeBg: 'bg-indigo-600',
      btn: 'bg-indigo-600',
      btnHover: 'hover:bg-indigo-700',
      icon: 'text-indigo-600',
      ring: 'focus:ring-indigo-400',
    },
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2" />
      </svg>
    ),
  },
];

const emptyForm = (): Omit<IEmailSettings, 'planType'> => ({
  fromName: '',
  gmailUser: '',
  gmailAppPassword: '',
  replyTo: '',
  signature: '',
  isActive: false,
});

export default function EmailSettings() {
  const [settings, setSettings] = useState<Record<PlanType, IEmailSettings>>({
    professional: { planType: 'professional', ...emptyForm() },
  });

  const [expanded, setExpanded] = useState<PlanType | null>('professional');
  const [saving, setSaving] = useState<PlanType | null>(null);
  const [testing, setTesting] = useState<PlanType | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('saurabh.sept18@gmail.com, kanjimulji@gmail.com');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<PlanType, boolean>>({
    professional: true,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchAllSettings();
      const map = { ...settings };
      data.forEach((s) => {
        map[s.planType] = { ...s };
      });
      setSettings(map);
    } catch {
      showToast('error', 'Failed to load email settings');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (planType: PlanType, field: keyof IEmailSettings, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [planType]: { ...prev[planType], [field]: value },
    }));
  };

  const handleSave = async (planType: PlanType) => {
    setSaving(planType);
    try {
      const updated = await saveSettings(planType, settings[planType]);
      setSettings((prev) => ({
        ...prev,
        [planType]: { ...updated },
      }));
      showToast('success', `${planType.charAt(0).toUpperCase() + planType.slice(1)} settings saved`);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const handleSendTest = async () => {
    const addresses = testEmailInput.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
    if (addresses.length === 0) return;
    setSendingTest(true);
    try {
      const result = await sendTestEmail(addresses);
      showToast('success', result.message);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message ?? 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleTest = async (planType: PlanType) => {
    setTesting(planType);
    try {
      const result = await testConnection(planType);
      showToast('success', result.message);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message ?? 'Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
            <p className="text-sm text-gray-500">Configure Gmail senders for each plan</p>
          </div>
        </div>

      </div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {PLANS.map((plan) => {
          const s = settings[plan.type];
          const isOpen = expanded === plan.type;

          return (
            <div
              key={plan.type}
              className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                isOpen ? `${plan.color.border} shadow-md` : 'border-gray-200 bg-white'
              }`}
            >
              {/* Card Header */}
              <button
                onClick={() => setExpanded(isOpen ? null : plan.type)}
                className={`w-full flex items-center justify-between px-5 py-4 text-left transition ${
                  isOpen ? plan.color.bg : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${plan.color.icon}`}>{plan.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{plan.label}</span>
                      {s.isActive && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.color.badge} ${plan.color.badgeText}`}>
                          Active
                        </span>
                      )}
                      {s._id && !s.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Card Form */}
              {isOpen && (
                <div className={`${plan.color.bg} px-5 pb-5 border-t ${plan.color.border}`}>
                  <div className="pt-5 grid grid-cols-1 gap-4">
                    {/* From Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={s.fromName}
                        onChange={(e) => handleChange(plan.type, 'fromName', e.target.value)}
                        placeholder="e.g. AI Companies"
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${plan.color.ring} bg-white`}
                      />
                    </div>

                    {/* Gmail User */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gmail Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={s.gmailUser}
                        onChange={(e) => handleChange(plan.type, 'gmailUser', e.target.value)}
                        placeholder="yourname@gmail.com"
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${plan.color.ring} bg-white`}
                      />
                    </div>

                    {/* App Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gmail App Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords[plan.type] ? 'text' : 'password'}
                          value={s.gmailAppPassword ?? ''}
                          onChange={(e) => handleChange(plan.type, 'gmailAppPassword', e.target.value)}
                          placeholder="xxxx xxxx xxxx xxxx"
                          className={`w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 ${plan.color.ring} bg-white`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({ ...prev, [plan.type]: !prev[plan.type] }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords[plan.type] ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Google Account → Security → 2-Step Verification → App Passwords
                      </p>
                    </div>

                    {/* Reply-to */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reply-to Email</label>
                      <input
                        type="email"
                        value={s.replyTo ?? ''}
                        onChange={(e) => handleChange(plan.type, 'replyTo', e.target.value)}
                        placeholder="optional reply-to address"
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${plan.color.ring} bg-white`}
                      />
                    </div>

                    {/* Signature */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Signature</label>
                      <textarea
                        rows={3}
                        value={s.signature ?? ''}
                        onChange={(e) => handleChange(plan.type, 'signature', e.target.value)}
                        placeholder="Best regards,&#10;Your Name"
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${plan.color.ring} bg-white resize-none`}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleSave(plan.type)}
                        disabled={saving === plan.type}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-60 ${plan.color.btn} ${plan.color.btnHover}`}
                      >
                        {saving === plan.type ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Saving…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Save Settings
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleTest(plan.type)}
                        disabled={testing === plan.type || !s._id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                        title={!s._id ? 'Save settings first before testing' : ''}
                      >
                        {testing === plan.type ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Testing…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Send Test Email */}
      <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">Send Test Email</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Send a real test email using your saved Professional settings.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder="email1@gmail.com, email2@gmail.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !testEmailInput.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-60"
          >
            {sendingTest ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending…
              </>
            ) : (
              'Send Test'
            )}
          </button>
        </div>
      </div>

      {/* Help note */}
      <div className="mt-6 flex gap-2.5 text-sm text-gray-500 bg-gray-100 rounded-xl p-4">
        <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Gmail App Passwords require 2-Step Verification enabled on your Google account.
          Go to Google Account → Security → App Passwords to generate one.
        </span>
      </div>
    </div>
  );
}
