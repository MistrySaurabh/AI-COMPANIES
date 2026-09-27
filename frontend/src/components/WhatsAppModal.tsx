import { useState } from 'react';

interface WhatsAppModalProps {
  companyName: string;
  numbers: { label: string; value: string }[];
  onClose: () => void;
}

function toWaNumber(raw: string): string {
  return raw.replace(/\D/g, '');
}

export default function WhatsAppModal({ companyName, numbers, onClose }: WhatsAppModalProps) {
  const [selected, setSelected] = useState(numbers[0]?.value ?? '');
  const [message, setMessage] = useState('');

  const waNumber = toWaNumber(selected);
  const canSend = waNumber.length >= 7 && message.trim().length > 0;

  const handleSend = () => {
    const url = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(message.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">💬</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">WhatsApp Message</h2>
            <p className="text-sm text-gray-500">{companyName}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {numbers.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {numbers.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}: {n.value}
                </option>
              ))}
            </select>
          </div>
        )}

        {numbers.length === 1 && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-medium">To:</span> {selected}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-5 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
