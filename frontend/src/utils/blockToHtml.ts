import { EmailBlock, TemplateSettings, DEFAULT_TEMPLATE_SETTINGS } from '../types/emailTemplate';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function renderBlock(block: EmailBlock): string {
  const { type, data } = block;

  switch (type) {
    case 'header': {
      const bg =
        data.bgType === 'gradient'
          ? `linear-gradient(${data.gradientAngle || 135}deg,${data.gradientFrom || '#312e81'},${data.gradientTo || '#6366f1'})`
          : data.bgColor || '#4f46e5';
      const logoSize = Number(data.logoSize) || 72;
      const emojiSize = Math.floor(logoSize * 0.48);
      const initSize = Math.floor(logoSize * 0.34);
      const lkBg = data.logoBgColor || 'rgba(255,255,255,0.15)';
      const lkBorder = data.logoBorderColor || 'rgba(255,255,255,0.4)';

      let logoHtml = '';
      if (data.logoType === 'emoji') {
        logoHtml = `<div style="width:${logoSize}px;height:${logoSize}px;background-color:${lkBg};border:3px solid ${lkBorder};border-radius:50%;display:inline-block;line-height:${logoSize - 6}px;font-size:${emojiSize}px;margin-bottom:18px;">${data.logoEmoji || '✉️'}</div>`;
      } else if (data.logoType === 'image' && data.logoSrc) {
        logoHtml = `<div style="width:${logoSize}px;height:${logoSize}px;border-radius:50%;overflow:hidden;display:inline-block;margin-bottom:18px;border:3px solid ${lkBorder};">
  <img src="${data.logoSrc}" alt="logo" style="width:100%;height:100%;object-fit:cover;display:block;" />
</div>`;
      } else if (data.logoType === 'initials') {
        logoHtml = `<div style="width:${logoSize}px;height:${logoSize}px;background-color:${lkBg};border:3px solid ${lkBorder};border-radius:50%;display:inline-block;line-height:${logoSize - 6}px;font-size:${initSize}px;font-weight:900;color:${data.titleColor || '#ffffff'};margin-bottom:18px;">${escHtml(data.logoInitials || 'AB')}</div>`;
      }

      const subtitleHtml =
        data.showSubtitle && data.subtitle
          ? `<p style="margin:8px 0 0;color:${data.subtitleColor || 'rgba(255,255,255,0.8)'};font-size:${data.subtitleSize || 14}px;line-height:1.5;">${escHtml(data.subtitle)}</p>`
          : '';

      return `<div style="background:${bg};padding:${data.paddingTop || 40}px 40px ${data.paddingBottom || 32}px;text-align:center;">
  ${logoHtml}
  <h1 style="margin:0;color:${data.titleColor || '#ffffff'};font-size:${data.titleSize || 26}px;font-weight:800;line-height:1.25;letter-spacing:-0.3px;">${escHtml(data.title || 'Email Title')}</h1>
  ${subtitleHtml}
</div>`;
    }

    case 'social-links': {
      const links: { label: string; url: string; bgColor: string; textColor: string; emoji: string }[] =
        data.links || [];
      const align = data.align || 'center';
      const br = data.borderRadius || '20';
      const fs = data.fontSize || '13';
      const bpY = data.buttonPaddingY || '8';
      const bpX = data.buttonPaddingX || '18';
      const gap = Number(data.gap) || 10;
      const isVertical = data.layout === 'vertical';
      const blockBg = data.blockBgColor ? `background-color:${data.blockBgColor};` : '';

      const titleHtml =
        data.showTitle && data.title
          ? `<p style="margin:0 0 14px;color:${data.titleColor || '#374151'};font-size:14px;font-weight:600;">${escHtml(data.title)}</p>`
          : '';

      if (isVertical) {
        const maxW = Number(data.buttonPaddingX || 18) * 2 + 120;
        const linksHtml = links
          .map(
            (lk) =>
              `<a href="${lk.url || '#'}" style="display:block;max-width:${maxW + 60}px;margin:0 auto ${gap}px;background-color:${lk.bgColor};color:${lk.textColor};font-size:${fs}px;font-weight:600;padding:${bpY}px ${bpX}px;border-radius:${br}px;text-decoration:none;text-align:center;">${lk.emoji ? `${lk.emoji} ` : ''}${escHtml(lk.label)}</a>`
          )
          .join('');
        return `<div style="${blockBg}padding:${data.blockPaddingY || '20'}px 32px;text-align:${align};">
  ${titleHtml}${linksHtml}
</div>`;
      }

      const linksHtml = links
        .map(
          (lk) =>
            `<a href="${lk.url || '#'}" style="display:inline-block;background-color:${lk.bgColor};color:${lk.textColor};font-size:${fs}px;font-weight:600;padding:${bpY}px ${bpX}px;border-radius:${br}px;text-decoration:none;margin:0 ${Math.floor(gap / 2)}px 8px;">${lk.emoji ? `${lk.emoji} ` : ''}${escHtml(lk.label)}</a>`
        )
        .join('');
      return `<div style="${blockBg}padding:${data.blockPaddingY || '20'}px 32px;text-align:${align};">
  ${titleHtml}${linksHtml}
</div>`;
    }

    case 'subject-banner': {
      const border = data.showBorder !== false
        ? `border-bottom:2px solid ${data.borderColor || '#e0e7ff'};`
        : '';
      const icon = data.icon ? `${data.icon} ` : '';
      return `<div style="background-color:${data.bgColor || '#eef2ff'};${border}padding:${data.paddingY || '14'}px ${data.paddingX || '40'}px;text-align:${data.align || 'center'};">
  <p style="margin:0;color:${data.textColor || '#3730a3'};font-size:${data.fontSize || '13'}px;font-weight:${data.fontWeight || '700'};letter-spacing:${data.letterSpacing || '0.3'}px;">${icon}${escHtml(data.text || '')}</p>
</div>`;
    }

    case 'heading': {
      const tag = data.level || 'h1';
      const sizes: Record<string, string> = { h1: '28', h2: '22', h3: '18' };
      const weights: Record<string, string> = { h1: '800', h2: '700', h3: '600' };
      const fontSize = sizes[tag] || '24';
      const fontWeight = weights[tag] || '700';
      const bg = data.bgColor ? `background-color:${data.bgColor};` : '';
      return `<div style="${bg}padding:${data.paddingY || '20'}px 32px ${data.paddingBottom || '12'}px;">
  <${tag} style="margin:0;color:${data.color || '#111827'};font-size:${fontSize}px;font-weight:${fontWeight};line-height:1.3;text-align:${data.align || 'left'};">${escHtml(data.text || 'Heading')}</${tag}>
</div>`;
    }

    case 'text': {
      const bg = data.bgColor ? `background-color:${data.bgColor};` : '';
      const lines = (data.content || '').split('\n');
      const htmlContent = lines.map((l: string) => escHtml(l)).join('<br>');
      return `<div style="${bg}padding:${data.paddingY || '8'}px 32px;">
  <p style="margin:0;color:${data.color || '#374151'};font-size:${data.fontSize || '15'}px;line-height:${data.lineHeight || '1.65'};text-align:${data.align || 'left'};">${htmlContent}</p>
</div>`;
    }

    case 'button': {
      const align = data.align || 'center';
      return `<div style="padding:16px 32px;text-align:${align};">
  <a href="${data.url || '#'}" style="display:inline-block;background-color:${data.bgColor || '#4f46e5'};color:${data.textColor || '#ffffff'};font-size:${data.fontSize || '15'}px;font-weight:600;padding:13px 28px;border-radius:${data.borderRadius || '8'}px;text-decoration:none;letter-spacing:0.01em;">${escHtml(data.label || 'Click Here')}</a>
</div>`;
    }

    case 'table': {
      const rows: string[][] = data.rows || [['Header 1', 'Header 2'], ['Cell 1', 'Cell 2']];
      const hasHeader = data.headerRow !== false;
      const borderColor = data.borderColor || '#e5e7eb';
      const headerBg = data.headerBgColor || '#4f46e5';
      const headerText = data.headerTextColor || '#ffffff';
      const fontSize = data.fontSize || '14';
      const cellPad = data.cellPadding || '10';
      const stripeColor = data.stripeColor || '#f9fafb';
      const striped = data.striped !== false;

      let tableHtml = `<table width="100%" cellpadding="${cellPad}" cellspacing="0" style="border-collapse:collapse;font-size:${fontSize}px;">`;
      rows.forEach((row, ri) => {
        const isHeader = hasHeader && ri === 0;
        const isStripe = striped && !isHeader && ri % 2 === 0;
        const rowBg = isHeader ? headerBg : isStripe ? stripeColor : '#ffffff';
        const rowText = isHeader ? headerText : (data.cellTextColor || '#374151');
        tableHtml += '<tr>';
        row.forEach((cell) => {
          const tag = isHeader ? 'th' : 'td';
          tableHtml += `<${tag} style="background-color:${rowBg};color:${rowText};border:1px solid ${borderColor};padding:${cellPad}px;text-align:left;font-weight:${isHeader ? '600' : '400'};">${escHtml(cell)}</${tag}>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      return `<div style="padding:16px 32px;">${tableHtml}</div>`;
    }

    case 'divider': {
      const color = data.color || '#e5e7eb';
      const thickness = data.thickness || '1';
      const style = data.style || 'solid';
      const marginY = data.marginY || '8';
      return `<div style="padding:${marginY}px 32px;">
  <div style="border-top:${thickness}px ${style} ${color};"></div>
</div>`;
    }

    case 'spacer': {
      const h = data.height || '32';
      return `<div style="height:${h}px;line-height:${h}px;">&nbsp;</div>`;
    }

    case 'image': {
      const width = data.widthPercent ? `${data.widthPercent}%` : '100%';
      const align = data.align || 'center';
      const br = data.borderRadius || '0';
      const marginMap: Record<string, string> = { left: '0 auto 0 0', center: '0 auto', right: '0 0 0 auto' };
      const caption = data.caption
        ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;text-align:${align};">${escHtml(data.caption)}</p>`
        : '';
      if (!data.src) {
        return `<div style="padding:16px 32px;text-align:${align};">
  <div style="background:#f3f4f6;border:2px dashed #d1d5db;border-radius:${br}px;padding:32px;display:inline-block;color:#9ca3af;font-size:13px;">No image URL set</div>
  ${caption}
</div>`;
      }
      return `<div style="padding:16px 32px;text-align:${align};">
  <img src="${data.src}" alt="${escHtml(data.alt || '')}" style="max-width:100%;width:${width};border-radius:${br}px;display:block;margin:${marginMap[align] || '0 auto'};" />
  ${caption}
</div>`;
    }

    case 'info-box': {
      const bg = data.bgColor || '#eff6ff';
      const textColor = data.textColor || '#1e40af';
      const borderColor = data.borderColor || '#3b82f6';
      const side = data.borderSide || 'left';
      let borderStyle = '';
      if (side === 'left') borderStyle = `border-left:4px solid ${borderColor};`;
      else if (side === 'top') borderStyle = `border-top:4px solid ${borderColor};`;
      else if (side === 'all') borderStyle = `border:1px solid ${borderColor};`;
      const icon = data.icon ? `${data.icon} ` : '';
      const lines = (data.text || '').split('\n');
      const htmlContent = lines.map((l: string) => escHtml(l)).join('<br>');
      return `<div style="padding:8px 32px;">
  <div style="background-color:${bg};${borderStyle}padding:16px 18px;border-radius:6px;">
    <p style="margin:0;color:${textColor};font-size:14px;line-height:1.6;">${icon}${htmlContent}</p>
  </div>
</div>`;
    }

    case 'two-column': {
      const ratio = data.ratio || '50-50';
      const [lw, rw] = ratio.split('-').map(Number);
      const leftBg = data.leftBgColor || '#f9fafb';
      const rightBg = data.rightBgColor || '#ffffff';
      const lLines = (data.leftContent || '').split('\n');
      const rLines = (data.rightContent || '').split('\n');
      const lHtml = lLines.map((l: string) => escHtml(l)).join('<br>');
      const rHtml = rLines.map((l: string) => escHtml(l)).join('<br>');
      const leftColor = data.leftTextColor || '#374151';
      const rightColor = data.rightTextColor || '#374151';
      const leftFontSize = data.leftFontSize || '14';
      const rightFontSize = data.rightFontSize || '14';
      return `<div style="padding:16px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="${lw}%" style="padding:16px;background-color:${leftBg};vertical-align:top;border-radius:6px 0 0 6px;">
        <p style="margin:0;font-size:${leftFontSize}px;color:${leftColor};line-height:1.6;">${lHtml}</p>
      </td>
      <td width="${rw}%" style="padding:16px;background-color:${rightBg};vertical-align:top;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:${rightFontSize}px;color:${rightColor};line-height:1.6;">${rHtml}</p>
      </td>
    </tr>
  </table>
</div>`;
    }

    default:
      return '';
  }
}

function renderFooter(s: TemplateSettings): string {
  if (!s.footerEnabled) return '';
  const links = s.footerLinks
    .map(
      (lk) =>
        `<a href="${lk.url || '#'}" style="display:inline-block;background-color:${lk.bgColor};color:${lk.textColor};font-size:12px;font-weight:700;text-decoration:none;padding:7px 20px;border-radius:20px;margin:0 4px;">${escHtml(lk.label)}</a>`
    )
    .join('');
  return `<div style="background-color:${s.footerBgColor};border-top:2px solid ${s.footerBorderTopColor};padding:28px 32px 24px;text-align:center;">
  <p style="margin:0 0 4px;color:${s.footerTextColor};font-size:13px;font-weight:500;">${escHtml(s.footerText || '')}</p>
  <p style="margin:0${links ? ' 0 18px' : ''};color:${s.footerNameColor};font-size:17px;font-weight:700;">${escHtml(s.footerName || '')}</p>
  ${links ? `<div style="margin-top:2px;">${links}</div>` : ''}
</div>`;
}

export function blocksToHtml(
  blocks: EmailBlock[],
  subject = 'Email',
  settings: TemplateSettings = DEFAULT_TEMPLATE_SETTINGS
): string {
  const blocksHtml = blocks.map(renderBlock).join('\n');
  const footerHtml = renderFooter(settings);
  const outerBg = settings.outerBgColor || '#f4f4f5';
  const cardBg = settings.containerBgColor || '#ffffff';
  const radius = settings.containerBorderRadius || '8';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${outerBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${outerBg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:${cardBg};border-radius:${radius}px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">
          <tr><td>${blocksHtml}</td></tr>
          <tr><td>${footerHtml}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
