import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EmailBlock,
  BlockType,
  TemplateSettings,
  FooterLink,
  DEFAULT_TEMPLATE_SETTINGS,
} from '../../types/emailTemplate';
import { blocksToHtml } from '../../utils/blockToHtml';
import {
  createEmailTemplate,
  fetchEmailTemplate,
  updateEmailTemplate,
} from '../../services/emailTemplateService';

// ─── ID generator ─────────────────────────────────────────────────────────────
function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Color theme presets ─────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { name: 'Indigo',  swatch: '#4f46e5', outer: '#eef2ff', cardBg: '#ffffff', footerBg: '#f0f4ff', footerBorder: '#c7d2fe', nameColor: '#4f46e5', textColor: '#6b7280' },
  { name: 'Navy',    swatch: '#1e40af', outer: '#eff6ff', cardBg: '#ffffff', footerBg: '#f0f9ff', footerBorder: '#bfdbfe', nameColor: '#1e40af', textColor: '#6b7280' },
  { name: 'Purple',  swatch: '#7c3aed', outer: '#f5f3ff', cardBg: '#ffffff', footerBg: '#faf5ff', footerBorder: '#ddd6fe', nameColor: '#7c3aed', textColor: '#6b7280' },
  { name: 'Teal',    swatch: '#0d9488', outer: '#f0fdfa', cardBg: '#ffffff', footerBg: '#f0fdfa', footerBorder: '#99f6e4', nameColor: '#0d9488', textColor: '#6b7280' },
  { name: 'Rose',    swatch: '#e11d48', outer: '#fff1f2', cardBg: '#ffffff', footerBg: '#fff1f2', footerBorder: '#fecdd3', nameColor: '#e11d48', textColor: '#6b7280' },
  { name: 'Amber',   swatch: '#d97706', outer: '#fffbeb', cardBg: '#ffffff', footerBg: '#fffbeb', footerBorder: '#fde68a', nameColor: '#d97706', textColor: '#6b7280' },
  { name: 'Dark',    swatch: '#00d4ff', outer: '#1e293b', cardBg: '#1e293b', footerBg: '#0f172a', footerBorder: '#334155', nameColor: '#00d4ff', textColor: '#94a3b8' },
  { name: 'Charcoal',swatch: '#475569', outer: '#f1f5f9', cardBg: '#ffffff', footerBg: '#f8fafc', footerBorder: '#e2e8f0', nameColor: '#475569', textColor: '#6b7280' },
];

// ─── Default block data ───────────────────────────────────────────────────────
function defaultBlock(type: BlockType): EmailBlock {
  const id = genId();
  switch (type) {
    case 'header':         return { id, type, data: { bgType: 'gradient', bgColor: '#4f46e5', gradientFrom: '#312e81', gradientTo: '#6366f1', gradientAngle: '135', logoType: 'emoji', logoEmoji: '✉️', logoSrc: '', logoInitials: 'AB', logoSize: '72', logoBgColor: 'rgba(255,255,255,0.15)', logoBorderColor: 'rgba(255,255,255,0.4)', title: 'Email Title', titleColor: '#ffffff', titleSize: '26', showSubtitle: true, subtitle: 'Optional subtitle text', subtitleColor: 'rgba(255,255,255,0.8)', subtitleSize: '14', paddingTop: '40', paddingBottom: '32' } };
    case 'subject-banner': return { id, type, data: { text: 'Your Email Subject Here', icon: '📌', bgColor: '#eef2ff', textColor: '#3730a3', showBorder: true, borderColor: '#e0e7ff', fontSize: '13', fontWeight: '700', letterSpacing: '0.3', align: 'center', paddingY: '14', paddingX: '40' } };
    case 'social-links':   return { id, type, data: { links: [{ platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/in/', bgColor: '#0077b5', textColor: '#ffffff', emoji: '💼' }, { platform: 'github', label: 'GitHub', url: 'https://github.com/', bgColor: '#24292e', textColor: '#ffffff', emoji: '🐱' }, { platform: 'website', label: 'Portfolio', url: 'https://', bgColor: '#4f46e5', textColor: '#ffffff', emoji: '🌐' }], align: 'center', layout: 'horizontal', gap: '10', borderRadius: '20', fontSize: '13', buttonPaddingY: '8', buttonPaddingX: '18', showTitle: false, title: 'Connect with me', titleColor: '#374151', blockBgColor: '', blockPaddingY: '20' } };
    case 'heading':        return { id, type, data: { text: 'Your Heading', level: 'h1', align: 'left', color: '#111827', bgColor: '' } };
    case 'text':      return { id, type, data: { content: 'Write your paragraph text here. This is fully editable.', align: 'left', color: '#374151', fontSize: '15', lineHeight: '1.65', bgColor: '', paddingY: '8' } };
    case 'button':    return { id, type, data: { label: 'Click Here', url: 'https://', bgColor: '#4f46e5', textColor: '#ffffff', align: 'center', borderRadius: '8', fontSize: '15' } };
    case 'table':     return { id, type, data: { rows: [['Column 1', 'Column 2', 'Column 3'], ['Row 1, Col 1', 'Row 1, Col 2', 'Row 1, Col 3'], ['Row 2, Col 1', 'Row 2, Col 2', 'Row 2, Col 3']], headerRow: true, borderColor: '#e5e7eb', headerBgColor: '#4f46e5', headerTextColor: '#ffffff', fontSize: '14', cellPadding: '10', striped: true, stripeColor: '#f9fafb', cellTextColor: '#374151' } };
    case 'divider':   return { id, type, data: { color: '#e5e7eb', thickness: '1', style: 'solid', marginY: '8' } };
    case 'spacer':    return { id, type, data: { height: '32' } };
    case 'image':     return { id, type, data: { src: '', alt: '', widthPercent: '100', align: 'center', borderRadius: '0', caption: '' } };
    case 'info-box':  return { id, type, data: { text: 'Important information goes here.', icon: 'ℹ️', bgColor: '#eff6ff', textColor: '#1e40af', borderColor: '#3b82f6', borderSide: 'left' } };
    case 'two-column':return { id, type, data: { leftContent: 'Left column content goes here.', rightContent: 'Right column content goes here.', leftBgColor: '#f9fafb', rightBgColor: '#ffffff', leftTextColor: '#374151', rightTextColor: '#374151', leftFontSize: '14', rightFontSize: '14', ratio: '50-50' } };
    default:          return { id, type, data: {} };
  }
}

// ─── Block palette metadata ───────────────────────────────────────────────────
const BLOCK_TYPES: { type: BlockType; label: string; icon: string; desc: string }[] = [
  { type: 'header',         label: 'Header',         icon: '▣',  desc: 'Gradient/color hero header with logo & title' },
  { type: 'subject-banner', label: 'Subject Banner', icon: '📌', desc: 'Highlighted subject strip below header' },
  { type: 'social-links',   label: 'Social Links',   icon: '🔗', desc: 'Row of branded social / link buttons' },
  { type: 'heading',        label: 'Heading',        icon: 'H',  desc: 'Title or section header' },
  { type: 'text',       label: 'Text',      icon: '¶',  desc: 'Paragraph content' },
  { type: 'button',     label: 'Button',    icon: '▶',  desc: 'Call-to-action link' },
  { type: 'table',      label: 'Table',     icon: '▦',  desc: 'Data table with rows/cols' },
  { type: 'divider',    label: 'Divider',   icon: '—',  desc: 'Horizontal separator' },
  { type: 'spacer',     label: 'Spacer',    icon: '↕',  desc: 'Vertical empty space' },
  { type: 'image',      label: 'Image',     icon: '🖼', desc: 'Image by URL' },
  { type: 'info-box',   label: 'Info Box',  icon: '💡', desc: 'Highlighted callout' },
  { type: 'two-column', label: '2 Column',  icon: '⊞',  desc: 'Two-column layout' },
];

// ─── Canvas block visual preview ──────────────────────────────────────────────
function BlockPreview({ block }: { block: EmailBlock }) {
  const { type, data } = block;

  if (type === 'header') {
    const bg =
      data.bgType === 'gradient'
        ? `linear-gradient(${data.gradientAngle || 135}deg, ${data.gradientFrom || '#312e81'}, ${data.gradientTo || '#6366f1'})`
        : data.bgColor || '#4f46e5';
    const logoSize = Number(data.logoSize) || 72;
    const emojiSize = Math.floor(logoSize * 0.48);
    const initSize = Math.floor(logoSize * 0.34);

    const logoEl = () => {
      if (data.logoType === 'none') return null;
      const circleStyle: React.CSSProperties = {
        width: logoSize, height: logoSize,
        backgroundColor: data.logoBgColor || 'rgba(255,255,255,0.15)',
        border: `3px solid ${data.logoBorderColor || 'rgba(255,255,255,0.4)'}`,
        borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, overflow: 'hidden', flexShrink: 0,
      };
      if (data.logoType === 'emoji') {
        return <div style={circleStyle}><span style={{ fontSize: emojiSize }}>{data.logoEmoji || '✉️'}</span></div>;
      }
      if (data.logoType === 'image' && data.logoSrc) {
        return <div style={{ ...circleStyle, padding: 0 }}><img src={data.logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
      }
      if (data.logoType === 'image') {
        return <div style={{ ...circleStyle, background: 'rgba(255,255,255,0.1)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>URL?</div>;
      }
      if (data.logoType === 'initials') {
        return <div style={{ ...circleStyle, fontSize: initSize, fontWeight: 900, color: data.titleColor || '#fff' }}>{data.logoInitials || 'AB'}</div>;
      }
      return null;
    };

    return (
      <div style={{ background: bg, padding: `${data.paddingTop || 40}px 32px ${data.paddingBottom || 32}px`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {logoEl()}
        <div style={{ color: data.titleColor || '#ffffff', fontSize: `${data.titleSize || 26}px`, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.3px' }}>
          {data.title || 'Email Title'}
        </div>
        {data.showSubtitle && data.subtitle && (
          <div style={{ color: data.subtitleColor || 'rgba(255,255,255,0.8)', fontSize: `${data.subtitleSize || 14}px`, marginTop: 8, lineHeight: 1.5 }}>
            {data.subtitle}
          </div>
        )}
      </div>
    );
  }

  if (type === 'social-links') {
    const links: { label: string; url: string; bgColor: string; textColor: string; emoji: string }[] =
      data.links || [];
    const isVertical = data.layout === 'vertical';
    const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const gap = Number(data.gap) || 10;
    return (
      <div style={{
        backgroundColor: data.blockBgColor || 'transparent',
        padding: `${data.blockPaddingY || 20}px 32px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: alignMap[data.align || 'center'] || 'center',
      }}>
        {data.showTitle && data.title && (
          <p style={{ margin: '0 0 12px', color: data.titleColor || '#374151', fontSize: 14, fontWeight: 600 }}>
            {data.title}
          </p>
        )}
        <div style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          flexWrap: 'wrap',
          gap,
          alignItems: isVertical ? (alignMap[data.align || 'center'] || 'center') : 'center',
          justifyContent: isVertical ? undefined : (alignMap[data.align || 'center'] || 'center'),
        }}>
          {links.map((lk, i) => (
            <span key={i} style={{
              display: 'inline-block',
              backgroundColor: lk.bgColor,
              color: lk.textColor,
              fontSize: `${data.fontSize || 13}px`,
              fontWeight: 600,
              padding: `${data.buttonPaddingY || 8}px ${data.buttonPaddingX || 18}px`,
              borderRadius: `${data.borderRadius || 20}px`,
              cursor: 'default',
              whiteSpace: 'nowrap',
            }}>
              {lk.emoji ? `${lk.emoji} ` : ''}{lk.label}
            </span>
          ))}
          {links.length === 0 && (
            <span style={{ color: '#9ca3af', fontSize: 13 }}>Add links in the properties panel →</span>
          )}
        </div>
      </div>
    );
  }

  if (type === 'subject-banner') {
    return (
      <div style={{
        backgroundColor: data.bgColor || '#eef2ff',
        borderBottom: data.showBorder !== false ? `2px solid ${data.borderColor || '#e0e7ff'}` : 'none',
        padding: `${data.paddingY || 14}px ${data.paddingX || 40}px`,
        textAlign: (data.align as 'left' | 'center' | 'right') || 'center',
      }}>
        <span style={{
          color: data.textColor || '#3730a3',
          fontSize: `${data.fontSize || 13}px`,
          fontWeight: Number(data.fontWeight) || 700,
          letterSpacing: `${data.letterSpacing || 0.3}px`,
        }}>
          {data.icon ? `${data.icon} ` : ''}{data.text || 'Subject Banner Text'}
        </span>
      </div>
    );
  }

  if (type === 'heading') {
    const sizes: Record<string, string> = { h1: '26px', h2: '20px', h3: '16px' };
    const weights: Record<string, string> = { h1: '800', h2: '700', h3: '600' };
    return (
      <div style={{ backgroundColor: data.bgColor || 'transparent', padding: '18px 32px 10px' }}>
        <div style={{ color: data.color || '#111827', fontSize: sizes[data.level] || '26px', fontWeight: weights[data.level] || '800', textAlign: data.align || 'left', lineHeight: 1.3 }}>
          {data.text || 'Heading'}
        </div>
      </div>
    );
  }
  if (type === 'text') {
    return (
      <div style={{ backgroundColor: data.bgColor || 'transparent', padding: `${data.paddingY || 8}px 32px` }}>
        <div style={{ color: data.color || '#374151', fontSize: `${data.fontSize || 15}px`, lineHeight: data.lineHeight || 1.65, textAlign: data.align || 'left', whiteSpace: 'pre-wrap' }}>
          {data.content || 'Text content...'}
        </div>
      </div>
    );
  }
  if (type === 'button') {
    return (
      <div style={{ padding: '16px 32px', textAlign: data.align || 'center' }}>
        <span style={{ display: 'inline-block', backgroundColor: data.bgColor || '#4f46e5', color: data.textColor || '#ffffff', fontSize: `${data.fontSize || 15}px`, fontWeight: 600, padding: '12px 26px', borderRadius: `${data.borderRadius || 8}px`, cursor: 'default' }}>
          {data.label || 'Click Here'}
        </span>
      </div>
    );
  }
  if (type === 'table') {
    const rows: string[][] = data.rows || [];
    return (
      <div style={{ padding: '12px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${data.fontSize || 14}px` }}>
          <tbody>
            {rows.map((row, ri) => {
              const isHeader = data.headerRow && ri === 0;
              const isStripe = data.striped && !isHeader && ri % 2 === 0;
              const bg = isHeader ? (data.headerBgColor || '#4f46e5') : isStripe ? (data.stripeColor || '#f9fafb') : '#fff';
              const color = isHeader ? (data.headerTextColor || '#fff') : (data.cellTextColor || '#374151');
              return (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ border: `1px solid ${data.borderColor || '#e5e7eb'}`, padding: `${data.cellPadding || 10}px`, backgroundColor: bg, color, fontWeight: isHeader ? 600 : 400 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  if (type === 'divider') {
    return (
      <div style={{ padding: `${data.marginY || 8}px 32px` }}>
        <hr style={{ border: 'none', borderTop: `${data.thickness || 1}px ${data.style || 'solid'} ${data.color || '#e5e7eb'}`, margin: 0 }} />
      </div>
    );
  }
  if (type === 'spacer') {
    return (
      <div style={{ height: `${data.height || 32}px`, backgroundColor: '#f9fafb', borderTop: '1px dashed #e5e7eb', borderBottom: '1px dashed #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#d1d5db', userSelect: 'none' }}>{data.height || 32}px spacer</span>
      </div>
    );
  }
  if (type === 'image') {
    const align = data.align || 'center';
    const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
    return (
      <div style={{ padding: '16px 32px', display: 'flex', flexDirection: 'column', alignItems: justifyMap[align] || 'center' }}>
        {data.src ? (
          <img src={data.src} alt={data.alt || ''} style={{ maxWidth: '100%', width: `${data.widthPercent || 100}%`, borderRadius: `${data.borderRadius || 0}px`, display: 'block' }} />
        ) : (
          <div style={{ width: '100%', minHeight: 80, background: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: `${data.borderRadius || 0}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
            Set image URL in properties →
          </div>
        )}
        {data.caption && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280', textAlign: align as 'left' | 'center' | 'right' }}>{data.caption}</p>}
      </div>
    );
  }
  if (type === 'info-box') {
    const borderMap: Record<string, React.CSSProperties> = {
      left: { borderLeft: `4px solid ${data.borderColor || '#3b82f6'}` },
      top:  { borderTop:  `4px solid ${data.borderColor || '#3b82f6'}` },
      all:  { border:     `1px solid ${data.borderColor || '#3b82f6'}` },
    };
    return (
      <div style={{ padding: '8px 32px' }}>
        <div style={{ backgroundColor: data.bgColor || '#eff6ff', ...borderMap[data.borderSide || 'left'], padding: '14px 16px', borderRadius: 6 }}>
          <div style={{ color: data.textColor || '#1e40af', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {data.icon ? `${data.icon} ` : ''}{data.text || ''}
          </div>
        </div>
      </div>
    );
  }
  if (type === 'two-column') {
    const ratio = data.ratio || '50-50';
    const [lw, rw] = ratio.split('-').map(Number);
    return (
      <div style={{ padding: '16px 32px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: lw, backgroundColor: data.leftBgColor || '#f9fafb', padding: 16, borderRadius: '6px 0 0 6px', whiteSpace: 'pre-wrap', fontSize: `${data.leftFontSize || 14}px`, color: data.leftTextColor || '#374151' }}>
            {data.leftContent || 'Left column'}
          </div>
          <div style={{ flex: rw, backgroundColor: data.rightBgColor || '#ffffff', padding: 16, borderRadius: '0 6px 6px 0', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap', fontSize: `${data.rightFontSize || 14}px`, color: data.rightTextColor || '#374151' }}>
            {data.rightContent || 'Right column'}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// ─── Footer canvas preview ────────────────────────────────────────────────────
function FooterPreview({ settings }: { settings: TemplateSettings }) {
  if (!settings.footerEnabled) return null;
  return (
    <div style={{ backgroundColor: settings.footerBgColor, borderTop: `2px solid ${settings.footerBorderTopColor}`, padding: '24px 32px 22px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 3px', color: settings.footerTextColor, fontSize: 13, fontWeight: 500 }}>
        {settings.footerText || 'Thanks & Regards,'}
      </p>
      <p style={{ margin: settings.footerLinks.length ? '0 0 14px' : '0', color: settings.footerNameColor, fontSize: 17, fontWeight: 700 }}>
        {settings.footerName || 'Your Name'}
      </p>
      {settings.footerLinks.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {settings.footerLinks.map((lk, i) => (
            <span key={i} style={{ display: 'inline-block', backgroundColor: lk.bgColor, color: lk.textColor, fontSize: 12, fontWeight: 700, padding: '6px 18px', borderRadius: 20, cursor: 'default' }}>
              {lk.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Block Properties Panel ───────────────────────────────────────────────────
function PropertiesPanel({ block, onChange }: { block: EmailBlock; onChange: (data: Record<string, any>) => void }) {
  const { type, data } = block;

  const field = (label: string, key: string, inputType = 'text', options?: { value: string; label: string }[]) => (
    <div key={key} className="mb-3">
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {options ? (
        <select value={data[key] || ''} onChange={(e) => onChange({ ...data, [key]: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : inputType === 'textarea' ? (
        <textarea value={data[key] || ''} onChange={(e) => onChange({ ...data, [key]: e.target.value })} rows={5}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y font-mono" />
      ) : inputType === 'color' ? (
        <div className="flex items-center gap-2">
          <input type="color" value={data[key] || '#000000'} onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5" />
          <input type="text" value={data[key] || ''} onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="#000000" />
        </div>
      ) : (
        <input type={inputType} value={data[key] ?? ''} onChange={(e) => onChange({ ...data, [key]: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      )}
    </div>
  );

  const alignOptions = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }];

  if (type === 'header') {
    const section = (title: string) => (
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-4 mb-2 border-t border-gray-100 pt-3">{title}</p>
    );
    return (
      <div>
        {/* ── Background ── */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Background Type</label>
          <div className="flex gap-2">
            {['solid', 'gradient'].map((v) => (
              <button
                key={v}
                onClick={() => onChange({ ...data, bgType: v })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition capitalize ${data.bgType === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {data.bgType === 'solid' ? (
          field('Background Color', 'bgColor', 'color')
        ) : (
          <>
            {field('Gradient From', 'gradientFrom', 'color')}
            {field('Gradient To', 'gradientTo', 'color')}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Angle (deg)</label>
              <input type="range" min="0" max="360" value={data.gradientAngle || 135}
                onChange={(e) => onChange({ ...data, gradientAngle: e.target.value })}
                className="w-full accent-indigo-600" />
              <span className="text-xs text-gray-400">{data.gradientAngle || 135}°</span>
            </div>
            {/* Live preview strip */}
            <div className="h-8 rounded-lg mb-3" style={{ background: `linear-gradient(${data.gradientAngle || 135}deg, ${data.gradientFrom || '#312e81'}, ${data.gradientTo || '#6366f1'})` }} />
          </>
        )}

        {/* ── Logo / Icon ── */}
        {section('Logo / Icon')}
        {field('Logo Type', 'logoType', 'text', [
          { value: 'none', label: 'None' },
          { value: 'emoji', label: 'Emoji' },
          { value: 'image', label: 'Image URL' },
          { value: 'initials', label: 'Initials Text' },
        ])}

        {data.logoType === 'emoji' && (
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Emoji</label>
            <input type="text" value={data.logoEmoji || ''} onChange={(e) => onChange({ ...data, logoEmoji: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="✉️" />
          </div>
        )}
        {data.logoType === 'image' && field('Image URL', 'logoSrc')}
        {data.logoType === 'initials' && (
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Initials (1–3 chars)</label>
            <input type="text" maxLength={3} value={data.logoInitials || ''} onChange={(e) => onChange({ ...data, logoInitials: e.target.value.toUpperCase() })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="AB" />
          </div>
        )}

        {data.logoType !== 'none' && (
          <>
            {field('Circle Size (px)', 'logoSize', 'number')}
            {field('Circle Background', 'logoBgColor', 'color')}
            {field('Circle Border Color', 'logoBorderColor', 'color')}
          </>
        )}

        {/* ── Title ── */}
        {section('Title')}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Title Text</label>
          <input type="text" value={data.title || ''} onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        {field('Title Color', 'titleColor', 'color')}
        {field('Title Font Size (px)', 'titleSize', 'number')}

        {/* ── Subtitle ── */}
        {section('Subtitle')}
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <div
            onClick={() => onChange({ ...data, showSubtitle: !data.showSubtitle })}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${data.showSubtitle ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.showSubtitle ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-semibold text-gray-500">Show Subtitle</span>
        </label>

        {data.showSubtitle && (
          <>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Subtitle Text</label>
              <input type="text" value={data.subtitle || ''} onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            {field('Subtitle Color', 'subtitleColor', 'color')}
            {field('Subtitle Font Size (px)', 'subtitleSize', 'number')}
          </>
        )}

        {/* ── Spacing ── */}
        {section('Spacing')}
        {field('Padding Top (px)', 'paddingTop', 'number')}
        {field('Padding Bottom (px)', 'paddingBottom', 'number')}
      </div>
    );
  }

  if (type === 'subject-banner') return (
    <div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Banner Text</label>
        <input type="text" value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Email subject or announcement..." />
      </div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Prefix Icon (emoji)</label>
        <input type="text" value={data.icon || ''} onChange={(e) => onChange({ ...data, icon: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="📌" />
      </div>
      {field('Background Color', 'bgColor', 'color')}
      {field('Text Color', 'textColor', 'color')}
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <div
          onClick={() => onChange({ ...data, showBorder: !data.showBorder })}
          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${data.showBorder !== false ? 'bg-indigo-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.showBorder !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs font-semibold text-gray-500">Bottom Border</span>
      </label>
      {data.showBorder !== false && field('Border Color', 'borderColor', 'color')}
      {field('Font Size (px)', 'fontSize', 'number')}
      {field('Font Weight', 'fontWeight', 'text', [
        { value: '400', label: 'Regular (400)' },
        { value: '600', label: 'Semi-bold (600)' },
        { value: '700', label: 'Bold (700)' },
        { value: '800', label: 'Extra-bold (800)' },
      ])}
      {field('Letter Spacing (px)', 'letterSpacing', 'number')}
      {field('Alignment', 'align', 'text', alignOptions)}
      {field('Padding Vertical (px)', 'paddingY', 'number')}
      {field('Padding Horizontal (px)', 'paddingX', 'number')}
    </div>
  );

  if (type === 'social-links') {
    const links: { platform: string; label: string; url: string; bgColor: string; textColor: string; emoji: string }[] = data.links || [];

    const updateLink = (idx: number, key: string, val: string) => {
      const updated = links.map((lk, i) => i === idx ? { ...lk, [key]: val } : lk);
      onChange({ ...data, links: updated });
    };
    const removeLink = (idx: number) => onChange({ ...data, links: links.filter((_, i) => i !== idx) });
    const addLink = () => onChange({
      ...data,
      links: [...links, { platform: 'custom', label: 'New Link', url: 'https://', bgColor: '#4f46e5', textColor: '#ffffff', emoji: '🔗' }],
    });

    const PLATFORM_PRESETS: { value: string; label: string; bgColor: string; emoji: string }[] = [
      { value: 'linkedin',  label: 'LinkedIn',  bgColor: '#0077b5', emoji: '💼' },
      { value: 'github',    label: 'GitHub',    bgColor: '#24292e', emoji: '🐱' },
      { value: 'twitter',   label: 'Twitter/X', bgColor: '#1da1f2', emoji: '🐦' },
      { value: 'instagram', label: 'Instagram', bgColor: '#e1306c', emoji: '📸' },
      { value: 'youtube',   label: 'YouTube',   bgColor: '#ff0000', emoji: '▶️' },
      { value: 'website',   label: 'Portfolio', bgColor: '#4f46e5', emoji: '🌐' },
      { value: 'email',     label: 'Email',     bgColor: '#059669', emoji: '✉️' },
      { value: 'custom',    label: 'Custom',    bgColor: '#6b7280', emoji: '🔗' },
    ];

    const applyPreset = (idx: number, presetValue: string) => {
      const preset = PLATFORM_PRESETS.find((p) => p.value === presetValue);
      if (!preset) return;
      const updated = links.map((lk, i) =>
        i === idx ? { ...lk, platform: preset.value, label: preset.label, bgColor: preset.bgColor, emoji: preset.emoji } : lk
      );
      onChange({ ...data, links: updated });
    };

    const section = (title: string) => (
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-4 mb-2 border-t border-gray-100 pt-3">{title}</p>
    );

    return (
      <div>
        {/* Block-level settings */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Layout</label>
          <div className="flex gap-2">
            {['horizontal', 'vertical'].map((v) => (
              <button key={v} onClick={() => onChange({ ...data, layout: v })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition capitalize ${data.layout === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {field('Alignment', 'align', 'text', [
          { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
        ])}
        {field('Gap (px)', 'gap', 'number')}
        {field('Button Border Radius (px)', 'borderRadius', 'number')}
        {field('Font Size (px)', 'fontSize', 'number')}
        {field('Button Padding Vertical (px)', 'buttonPaddingY', 'number')}
        {field('Button Padding Horizontal (px)', 'buttonPaddingX', 'number')}
        {field('Block Background Color', 'blockBgColor', 'color')}
        {field('Block Vertical Padding (px)', 'blockPaddingY', 'number')}

        {/* Title toggle */}
        {section('Section Title')}
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <div onClick={() => onChange({ ...data, showTitle: !data.showTitle })}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${data.showTitle ? 'bg-indigo-600' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.showTitle ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-semibold text-gray-500">Show Title</span>
        </label>
        {data.showTitle && (
          <>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title Text</label>
              <input type="text" value={data.title || ''} onChange={(e) => onChange({ ...data, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Connect with me" />
            </div>
            {field('Title Color', 'titleColor', 'color')}
          </>
        )}

        {/* Link list */}
        {section(`Links (${links.length})`)}
        <div className="flex flex-col gap-2 mb-2">
          {links.map((lk, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
              {/* Platform quick-fill */}
              <div className="mb-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Platform</label>
                <select value={lk.platform || 'custom'}
                  onChange={(e) => applyPreset(idx, e.target.value)}
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {PLATFORM_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {/* Emoji + Label */}
              <div className="flex gap-1.5 mb-1.5">
                <div className="w-14">
                  <label className="text-[10px] text-gray-400 font-semibold">Emoji</label>
                  <input type="text" value={lk.emoji || ''} onChange={(e) => updateLink(idx, 'emoji', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-base mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center" placeholder="🔗" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 font-semibold">Label</label>
                  <input type="text" value={lk.label} onChange={(e) => updateLink(idx, 'label', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Link label" />
                </div>
                <button onClick={() => removeLink(idx)} className="self-end mb-0.5 text-red-400 hover:text-red-600 w-5 h-5 flex items-center justify-center shrink-0">✕</button>
              </div>
              {/* URL */}
              <div className="mb-1.5">
                <label className="text-[10px] text-gray-400 font-semibold">URL</label>
                <input type="text" value={lk.url} onChange={(e) => updateLink(idx, 'url', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="https://..." />
              </div>
              {/* Colors */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 font-semibold">Button BG</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input type="color" value={lk.bgColor} onChange={(e) => updateLink(idx, 'bgColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5 shrink-0" />
                    <input type="text" value={lk.bgColor} onChange={(e) => updateLink(idx, 'bgColor', e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none min-w-0" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 font-semibold">Text Color</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input type="color" value={lk.textColor} onChange={(e) => updateLink(idx, 'textColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5 shrink-0" />
                    <input type="text" value={lk.textColor} onChange={(e) => updateLink(idx, 'textColor', e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none min-w-0" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLink}
          className="w-full py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-dashed border-indigo-200">
          + Add Link
        </button>
      </div>
    );
  }

  if (type === 'heading') return (
    <div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Heading Text</label>
        <textarea value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })} rows={3}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y" />
      </div>
      {field('Level', 'level', 'text', [{ value: 'h1', label: 'H1 — Large' }, { value: 'h2', label: 'H2 — Medium' }, { value: 'h3', label: 'H3 — Small' }])}
      {field('Alignment', 'align', 'text', alignOptions)}
      {field('Text Color', 'color', 'color')}
      {field('Background Color', 'bgColor', 'color')}
    </div>
  );

  if (type === 'text') return (
    <div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Content</label>
        <textarea value={data.content || ''} onChange={(e) => onChange({ ...data, content: e.target.value })} rows={8}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y font-mono"
          placeholder="Write your text here..." />
      </div>
      {field('Alignment', 'align', 'text', alignOptions)}
      {field('Font Size (px)', 'fontSize', 'number')}
      {field('Line Height', 'lineHeight', 'number')}
      {field('Vertical Padding (px)', 'paddingY', 'number')}
      {field('Text Color', 'color', 'color')}
      {field('Background Color', 'bgColor', 'color')}
    </div>
  );

  if (type === 'button') return (
    <div>
      {field('Button Label', 'label')}
      {field('URL', 'url')}
      {field('Alignment', 'align', 'text', alignOptions)}
      {field('Font Size (px)', 'fontSize', 'number')}
      {field('Border Radius (px)', 'borderRadius', 'number')}
      {field('Background Color', 'bgColor', 'color')}
      {field('Text Color', 'textColor', 'color')}
    </div>
  );

  if (type === 'table') {
    const rows: string[][] = data.rows || [];
    const numCols = rows[0]?.length || 0;
    const updateCell = (ri: number, ci: number, val: string) => {
      const newRows = rows.map((r, rIdx) => r.map((c, cIdx) => (rIdx === ri && cIdx === ci ? val : c)));
      onChange({ ...data, rows: newRows });
    };
    const addRow = () => onChange({ ...data, rows: [...rows, Array(numCols).fill('')] });
    const removeRow = (ri: number) => onChange({ ...data, rows: rows.filter((_, i) => i !== ri) });
    const addCol = () => onChange({ ...data, rows: rows.map((r) => [...r, '']) });
    const removeCol = () => { if (numCols <= 1) return; onChange({ ...data, rows: rows.map((r) => r.slice(0, -1)) }); };
    return (
      <div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Table Cells</label>
          <div className="overflow-x-auto max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full border-collapse text-xs">
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-gray-200 p-0">
                        <input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)}
                          className={`w-full px-1.5 py-1 focus:outline-none focus:bg-indigo-50 text-xs min-w-16 ${data.headerRow && ri === 0 ? 'font-semibold bg-indigo-50' : ''}`} />
                      </td>
                    ))}
                    <td className="border-0 pl-1 pr-1">
                      <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={addRow} className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100">+ Row</button>
            <button onClick={addCol} className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100">+ Col</button>
            <button onClick={removeCol} className="text-xs px-2.5 py-1 bg-red-50 text-red-500 rounded-lg font-medium hover:bg-red-100">− Col</button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={data.headerRow !== false} onChange={(e) => onChange({ ...data, headerRow: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-600" />
            <span className="text-xs font-semibold text-gray-500">Header Row</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={data.striped !== false} onChange={(e) => onChange({ ...data, striped: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-600" />
            <span className="text-xs font-semibold text-gray-500">Striped Rows</span>
          </label>
        </div>
        {field('Font Size (px)', 'fontSize', 'number')}
        {field('Cell Padding (px)', 'cellPadding', 'number')}
        {field('Header BG Color', 'headerBgColor', 'color')}
        {field('Header Text Color', 'headerTextColor', 'color')}
        {field('Stripe Color', 'stripeColor', 'color')}
        {field('Cell Text Color', 'cellTextColor', 'color')}
        {field('Border Color', 'borderColor', 'color')}
      </div>
    );
  }

  if (type === 'divider') return (
    <div>
      {field('Line Color', 'color', 'color')}
      {field('Thickness (px)', 'thickness', 'number')}
      {field('Line Style', 'style', 'text', [{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }])}
      {field('Vertical Margin (px)', 'marginY', 'number')}
    </div>
  );

  if (type === 'spacer') return <div>{field('Height (px)', 'height', 'number')}</div>;

  if (type === 'image') return (
    <div>
      {field('Image URL', 'src')}
      {field('Alt Text', 'alt')}
      {field('Width (%)', 'widthPercent', 'number')}
      {field('Alignment', 'align', 'text', alignOptions)}
      {field('Border Radius (px)', 'borderRadius', 'number')}
      {field('Caption', 'caption')}
    </div>
  );

  if (type === 'info-box') return (
    <div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Content</label>
        <textarea value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })} rows={5}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y" />
      </div>
      {field('Icon (emoji)', 'icon')}
      {field('Border Side', 'borderSide', 'text', [{ value: 'left', label: 'Left' }, { value: 'top', label: 'Top' }, { value: 'all', label: 'All Sides' }])}
      {field('Background Color', 'bgColor', 'color')}
      {field('Text Color', 'textColor', 'color')}
      {field('Border Color', 'borderColor', 'color')}
    </div>
  );

  if (type === 'two-column') return (
    <div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Left Column Content</label>
        <textarea value={data.leftContent || ''} onChange={(e) => onChange({ ...data, leftContent: e.target.value })} rows={5}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y font-mono" />
      </div>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Right Column Content</label>
        <textarea value={data.rightContent || ''} onChange={(e) => onChange({ ...data, rightContent: e.target.value })} rows={5}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y font-mono" />
      </div>
      {field('Column Ratio', 'ratio', 'text', [{ value: '50-50', label: '50 / 50' }, { value: '60-40', label: '60 / 40' }, { value: '40-60', label: '40 / 60' }, { value: '70-30', label: '70 / 30' }, { value: '30-70', label: '30 / 70' }])}
      {field('Left Font Size (px)', 'leftFontSize', 'number')}
      {field('Right Font Size (px)', 'rightFontSize', 'number')}
      {field('Left BG Color', 'leftBgColor', 'color')}
      {field('Right BG Color', 'rightBgColor', 'color')}
      {field('Left Text Color', 'leftTextColor', 'color')}
      {field('Right Text Color', 'rightTextColor', 'color')}
    </div>
  );

  return <p className="text-xs text-gray-400">No properties available.</p>;
}

// ─── Design / Settings Panel ──────────────────────────────────────────────────
function DesignPanel({
  settings,
  onChange,
}: {
  settings: TemplateSettings;
  onChange: (s: TemplateSettings) => void;
}) {
  const set = (key: keyof TemplateSettings, value: any) => onChange({ ...settings, [key]: value });

  const colorRow = (label: string, key: keyof TemplateSettings) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={(settings[key] as string) || '#ffffff'} onChange={(e) => set(key, e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 shrink-0" />
        <input type="text" value={(settings[key] as string) || ''} onChange={(e) => set(key, e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="#ffffff" />
      </div>
    </div>
  );

  const updateLink = (idx: number, field: keyof FooterLink, value: string) => {
    const links = settings.footerLinks.map((lk, i) => i === idx ? { ...lk, [field]: value } : lk);
    set('footerLinks', links);
  };
  const addLink = () => set('footerLinks', [...settings.footerLinks, { label: 'Link', url: 'https://', bgColor: '#4f46e5', textColor: '#ffffff' }]);
  const removeLink = (idx: number) => set('footerLinks', settings.footerLinks.filter((_, i) => i !== idx));

  return (
    <div className="text-sm">
      {/* ── Theme Presets ── */}
      <div className="mb-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5">Theme Presets</p>
        <div className="grid grid-cols-4 gap-1.5">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => onChange({
                ...settings,
                outerBgColor: p.outer,
                containerBgColor: p.cardBg,
                footerBgColor: p.footerBg,
                footerBorderTopColor: p.footerBorder,
                footerNameColor: p.swatch,
                footerTextColor: p.textColor,
              })}
              title={p.name}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition group"
            >
              <div className="w-7 h-7 rounded-full border-2 border-white shadow-md group-hover:scale-110 transition-transform" style={{ backgroundColor: p.swatch }} />
              <span className="text-[10px] text-gray-500 font-medium truncate w-full text-center">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Canvas</p>
        {colorRow('Outer Background', 'outerBgColor')}
        {colorRow('Card Background', 'containerBgColor')}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Card Corner Radius (px)</label>
          <input type="number" value={settings.containerBorderRadius || '8'} onChange={(e) => set('containerBorderRadius', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Footer</p>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div
              onClick={() => set('footerEnabled', !settings.footerEnabled)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${settings.footerEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.footerEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-500 font-semibold">{settings.footerEnabled ? 'On' : 'Off'}</span>
          </label>
        </div>

        {settings.footerEnabled && (
          <>
            {colorRow('Footer Background', 'footerBgColor')}
            {colorRow('Top Border Color', 'footerBorderTopColor')}

            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Closing Text</label>
              <input type="text" value={settings.footerText || ''} onChange={(e) => set('footerText', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="e.g. Thanks & Regards," />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sender Name</label>
              <input type="text" value={settings.footerName || ''} onChange={(e) => set('footerName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Your Name" />
            </div>
            {colorRow('Closing Text Color', 'footerTextColor')}
            {colorRow('Name Color', 'footerNameColor')}

            {/* Footer links */}
            <div className="mt-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Social / Links</p>
              {settings.footerLinks.length === 0 && (
                <p className="text-xs text-gray-400 mb-2">No links yet — add one below.</p>
              )}
              {settings.footerLinks.map((lk, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 mb-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <input type="text" value={lk.label} onChange={(e) => updateLink(idx, 'label', e.target.value)}
                      placeholder="Label" className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <button onClick={() => removeLink(idx)} className="text-red-400 hover:text-red-600 w-5 h-5 flex items-center justify-center shrink-0">✕</button>
                  </div>
                  <input type="text" value={lk.url} onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs mb-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 font-semibold">Button BG</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input type="color" value={lk.bgColor} onChange={(e) => updateLink(idx, 'bgColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5" />
                        <input type="text" value={lk.bgColor} onChange={(e) => updateLink(idx, 'bgColor', e.target.value)}
                          className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 font-semibold">Text Color</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input type="color" value={lk.textColor} onChange={(e) => updateLink(idx, 'textColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0.5" />
                        <input type="text" value={lk.textColor} onChange={(e) => updateLink(idx, 'textColor', e.target.value)}
                          className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addLink}
                className="w-full py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-dashed border-indigo-200">
                + Add Social Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────
export default function EmailTemplateBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_TEMPLATE_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'props' | 'design'>('design');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; subject?: string }>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchEmailTemplate(id)
      .then((t) => {
        setName(t.name);
        setSubject(t.subject);
        setBlocks(t.blocks);
        setSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...(t.settings || {}) });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  const addBlock = (type: BlockType) => {
    const b = defaultBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
    setRightTab('props');
    setTimeout(() => canvasRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setBlocks((prev) => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  };
  const moveDown = (idx: number) => {
    setBlocks((prev) => { if (idx >= prev.length - 1) return prev; const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  };
  const duplicateBlock = (idx: number) => {
    const b = { ...blocks[idx], id: genId(), data: { ...blocks[idx].data } };
    setBlocks((prev) => { const a = [...prev]; a.splice(idx + 1, 0, b); return a; });
    setSelectedId(b.id);
  };
  const removeBlock = (bid: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== bid));
    if (selectedId === bid) setSelectedId(null);
  };
  const updateBlockData = (bid: string, data: Record<string, any>) => {
    setBlocks((prev) => prev.map((b) => b.id === bid ? { ...b, data } : b));
  };

  const validate = () => {
    const e: { name?: string; subject?: string } = {};
    if (!name.trim()) e.name = 'Template name is required';
    if (!subject.trim()) e.subject = 'Email subject is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const html = blocksToHtml(blocks, subject, settings);
      const payload = { name: name.trim(), subject: subject.trim(), blocks, settings, html };
      if (isEdit && id) {
        await updateEmailTemplate(id, payload);
      } else {
        await createEmailTemplate(payload);
      }
      navigate('/templates/custom');
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = blocksToHtml(blocks, subject || 'Preview', settings);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading template...</div>;
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 z-10">
        <button onClick={() => navigate('/templates/custom')} className="text-gray-400 hover:text-gray-600 transition p-1 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 max-w-xs">
            <input type="text" placeholder="Template Name *" value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full border ${errors.name ? 'border-red-400' : 'border-gray-200'} rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300`} />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div className="flex-1 max-w-xs">
            <input type="text" placeholder="Email Subject *" value={subject} onChange={(e) => setSubject(e.target.value)}
              className={`w-full border ${errors.subject ? 'border-red-400' : 'border-gray-200'} rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300`} />
            {errors.subject && <p className="text-xs text-red-500 mt-0.5">{errors.subject}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition disabled:opacity-60">
            {saving ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* ── Main 3-panel layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Block Palette ── */}
        <div className="w-44 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Add Blocks</p>
          </div>
          <div className="px-2 pb-3 flex flex-col gap-0.5">
            {BLOCK_TYPES.map(({ type, label, icon, desc }) => (
              <button key={type} onClick={() => addBlock(type)} title={desc}
                className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition group">
                <span className="w-7 h-7 flex items-center justify-center bg-gray-100 group-hover:bg-indigo-100 rounded-lg text-sm font-bold text-gray-500 group-hover:text-indigo-600 shrink-0">{icon}</span>
                <span className="truncate text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Center: Canvas ── */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-y-auto px-6 py-6 transition-colors duration-300"
          style={{ backgroundColor: settings.outerBgColor }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="mx-auto" style={{ maxWidth: 640 }}>
            <div
              className="overflow-hidden shadow-lg transition-all duration-300"
              style={{
                backgroundColor: settings.containerBgColor,
                borderRadius: `${settings.containerBorderRadius || 8}px`,
                minHeight: 200,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-sm font-medium">Click a block type on the left to start</p>
                </div>
              )}

              {blocks.map((block, idx) => {
                const isSelected = block.id === selectedId;
                return (
                  <div
                    key={block.id}
                    onClick={() => { setSelectedId(block.id); setRightTab('props'); }}
                    className={`relative cursor-pointer transition-all group ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : 'hover:ring-1 hover:ring-inset hover:ring-indigo-200'}`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 z-20 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-br-lg select-none">
                        {BLOCK_TYPES.find((t) => t.type === block.type)?.label}
                      </div>
                    )}
                    <div className={`absolute top-1 right-1 z-20 flex items-center gap-0.5 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}>
                      <button onClick={(e) => { e.stopPropagation(); moveUp(idx); }} disabled={idx === 0}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 shadow-sm text-xs" title="Move up">▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveDown(idx); }} disabled={idx === blocks.length - 1}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 shadow-sm text-xs" title="Move down">▼</button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateBlock(idx); }}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-gray-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm text-xs" title="Duplicate">⧉</button>
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-red-200 rounded text-red-400 hover:text-red-600 hover:border-red-400 shadow-sm text-xs" title="Delete">✕</button>
                    </div>
                    <BlockPreview block={block} />
                  </div>
                );
              })}

              {/* Footer preview */}
              <FooterPreview settings={settings} />
            </div>

            {blocks.length > 0 && (
              <p className="text-center text-xs mt-4 opacity-60" style={{ color: settings.outerBgColor === '#1e293b' ? '#94a3b8' : '#9ca3af' }}>
                Click a block to select · ▲▼ reorder · ⧉ duplicate · ✕ remove
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Tabbed Properties / Design Panel ── */}
        <div className="w-72 shrink-0 bg-white border-l border-gray-200 overflow-hidden flex flex-col">
          {/* Tab header */}
          <div className="flex border-b border-gray-200 shrink-0">
            <button
              onClick={() => setRightTab('props')}
              className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 ${rightTab === 'props' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {selectedBlock ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center bg-indigo-100 rounded text-indigo-700 text-[10px] font-bold">
                    {BLOCK_TYPES.find((t) => t.type === selectedBlock.type)?.icon}
                  </span>
                  {BLOCK_TYPES.find((t) => t.type === selectedBlock.type)?.label}
                </span>
              ) : 'Properties'}
            </button>
            <button
              onClick={() => setRightTab('design')}
              className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 flex items-center justify-center gap-1 ${rightTab === 'design' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Design
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {rightTab === 'props' ? (
              selectedBlock ? (
                <PropertiesPanel
                  block={selectedBlock}
                  onChange={(data) => updateBlockData(selectedBlock.id, data)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 text-center px-4">
                  <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <p className="text-sm font-medium">Click a block on the canvas to edit its properties</p>
                </div>
              )
            ) : (
              <DesignPanel settings={settings} onChange={setSettings} />
            )}
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
              <div>
                <span className="font-bold text-gray-800">{name || 'Preview'}</span>
                {subject && <span className="text-xs text-gray-400 ml-2">— {subject}</span>}
              </div>
              <button onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-gray-700 transition p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe srcDoc={previewHtml} className="w-full" style={{ minHeight: 600, border: 'none' }} title="Email Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
