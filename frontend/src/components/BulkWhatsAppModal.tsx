import { useState } from 'react';
import { Company } from '../types/company';

interface BulkWhatsAppModalProps {
  companies: Company[];
  onClose: () => void;
}

function toWaNumber(raw: string): string {
  return raw.replace(/\D/g, '');
}

function openWa(number: string, message: string) {
  const url = `https://api.whatsapp.com/send?phone=${toWaNumber(number)}&text=${encodeURIComponent(message.trim())}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function BulkWhatsAppModal({ companies, onClose }: BulkWhatsAppModalProps) {
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const withNumbers = companies.filter((c) => c.contactNumber || c.contactNumber2);
  const canSend = message.trim().length > 0;

  const handleOpen = (companyId: string, number: string) => {
    openWa(number, message);
    setOpened((prev) => new Set([...prev, companyId]));
  };

  const handleOpenAll = () => {
    withNumbers.forEach((c) => {
      const number = c.contactNumber || c.contactNumber2!;
      openWa(number, message);
    });
    setOpened(new Set(withNumbers.map((c) => c._id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <span className="text-2xl">💬</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Bulk WhatsApp</h2>
            <p className="text-sm text-gray-500">
              {withNumbers.length} of {companies.length} selected compan{companies.length === 1 ? 'y has' : 'ies have'} a contact number
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Message */}
        <div className="px-6 py-4 shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            autoFocus
          />
        </div>

        {/* Company list */}
        {withNumbers.length > 0 ? (
          <div className="px-6 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2 pb-2">
              {withNumbers.map((c) => {
                const number = c.contactNumber || c.contactNumber2!;
                const done = opened.has(c._id);
                return (
                  <div key={c._id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.companyName}</p>
                      <p className="text-xs text-gray-500">{number}</p>
                    </div>
                    <button
                      onClick={() => handleOpen(c._id, number)}
                      disabled={!canSend}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-40 transition ${done ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-500 text-white hover:bg-green-600'}`}
                    >
                      {done ? 'Sent ✓' : 'Open'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 text-sm text-gray-400 text-center">
            None of the selected companies have a contact number.
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 shrink-0 gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
            Close
          </button>
          {withNumbers.length > 1 && (
            <button
              onClick={handleOpenAll}
              disabled={!canSend}
              className="px-5 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
            >
              Open All ({withNumbers.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
