import { PersonalInfo, TemplateType } from '../types/personalInfo';

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const skillRows = (skills: PersonalInfo['skills'], bg: string, text: string) =>
  skills.map((s) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#374151;font-size:13px;font-weight:600;white-space:nowrap;">${s.name}</td>
      <td style="padding:6px 0;">
        <span style="display:inline-block;background:${bg};color:${text};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">${s.experience}</span>
      </td>
    </tr>`).join('');

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL TEMPLATE
// Clean white • Indigo • Corporate
// ─────────────────────────────────────────────────────────────────────────────
export const professionalTemplate = (p: PersonalInfo): string => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.emailSubject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#312e81 0%,#4f46e5 60%,#6366f1 100%);padding:40px 40px 32px;text-align:center;">
    <div style="width:80px;height:80px;background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);border-radius:50%;display:inline-block;line-height:74px;font-size:26px;font-weight:800;color:#ffffff;margin-bottom:16px;">${initials(p.name || 'SM')}</div>
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${p.name}</h1>
    <p style="margin:0 0 4px;font-size:14px;color:rgba(255,255,255,0.85);font-weight:500;">${p.role}</p>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">${p.workExperience} of Experience</p>
  </td></tr>

  <!-- SUBJECT BANNER -->
  <tr><td style="background:#eef2ff;border-bottom:2px solid #e0e7ff;padding:14px 40px;text-align:center;">
    <p style="margin:0;color:#3730a3;font-size:13px;font-weight:700;letter-spacing:0.3px;">📌 ${p.emailSubject}</p>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:36px 40px 24px;">

    <!-- Greeting -->
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">Dear Hiring Manager,</p>
    <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.8;">I am a passionate <strong>${p.role}</strong> with <strong>${p.workExperience}</strong> of hands-on experience building scalable, high-performance web applications. I am actively exploring new opportunities and would love to contribute to your team.</p>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 28px;" />

    <!-- Skills -->
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1e1b4b;text-transform:uppercase;letter-spacing:1px;">⚡ Technical Skills</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
      ${skillRows(p.skills, '#eef2ff', '#3730a3')}
    </table>

    <!-- Key Details -->
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1e1b4b;text-transform:uppercase;letter-spacing:1px;">📋 Key Details</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      ${[
        ['Notice Period', p.noticePeriod],
        ['Current CTC', p.currentCTC],
        ['Expected CTC', p.expectedCTC],
        ...(p.phone ? [['Phone', p.phone]] : []),
        ...(p.email ? [['Email', p.email]] : []),
      ].map(([k, v], i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:600;width:140px;border-right:1px solid #e5e7eb;">${k}</td>
        <td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:500;">${v}</td>
      </tr>`).join('')}
    </table>

    ${p.customMessage ? `<p style="margin:0 0 28px;color:#374151;font-size:14px;line-height:1.8;background:#fffbeb;border-left:3px solid #f59e0b;padding:14px 16px;border-radius:0 6px 6px 0;">${p.customMessage}</p>` : ''}

    <p style="margin:0 0 6px;color:#374151;font-size:14px;line-height:1.8;">Please find my <strong>resume attached</strong> for your reference.</p>
    <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">I would welcome the opportunity to discuss how my skills can benefit your organization.</p>
  </td></tr>

  <!-- PORTFOLIO -->
  ${p.portfolioLink ? `<tr><td style="padding:0 40px 28px;text-align:center;">
    <a href="${p.portfolioLink}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">🌐 View My Portfolio</a>
  </td></tr>` : ''}

  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
    <p style="margin:0 0 4px;color:#374151;font-size:14px;font-weight:600;">Thanks & Regards,</p>
    <p style="margin:0 0 12px;color:#4f46e5;font-size:15px;font-weight:700;">${p.name}</p>
    <div style="display:inline-flex;gap:12px;">
      ${p.linkedinLink ? `<a href="${p.linkedinLink}" style="color:#4f46e5;font-size:12px;font-weight:600;text-decoration:none;">LinkedIn</a>` : ''}
      ${p.linkedinLink && p.githubLink ? `<span style="color:#d1d5db;">|</span>` : ''}
      ${p.githubLink ? `<a href="${p.githubLink}" style="color:#4f46e5;font-size:12px;font-weight:600;text-decoration:none;">GitHub</a>` : ''}
    </div>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// EXTROVERT TEMPLATE
// Dark navy header • Electric cyan + coral • Bold • Eye-catching
// ─────────────────────────────────────────────────────────────────────────────
export const extrovertTemplate = (p: PersonalInfo): string => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.emailSubject}</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#0f0c29 0%,#1a1040 50%,#0d1f5c 100%);padding:32px 16px;">
<tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);">

  <!-- MEGA HEADER — bright sky-blue → indigo → violet. Completely different from dark outer & orange strip -->
  <tr><td style="background:linear-gradient(135deg,#ff6b35 0%,#ff2d9d 100%);padding:48px 44px 40px;text-align:center;">
    <div style="width:96px;height:96px;background:rgba(255,255,255,0.18);border:4px solid rgba(255,255,255,0.65);border-radius:50%;display:inline-block;line-height:88px;font-size:32px;font-weight:900;color:#ffffff;margin-bottom:20px;box-shadow:0 0 48px rgba(255,107,53,0.55),0 8px 32px rgba(0,0,0,0.3);">${initials(p.name || 'SM')}</div>
    <h1 style="margin:0 0 8px;font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1px;text-shadow:0 2px 12px rgba(0,0,0,0.25);">${p.name}</h1>
    <p style="margin:0 0 20px;font-size:16px;color:rgba(255,255,255,0.9);font-weight:700;letter-spacing:0.5px;">${p.role}</p>
    <div style="display:inline-block;background:rgba(255,255,255,0.18);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 24px;">
      <span style="color:#ffffff;font-size:14px;font-weight:800;">🚀 ${p.workExperience} Experience</span>
    </div>
  </td></tr>

  <!-- SUBJECT STRIP — vivid orange→red, totally distinct from blue header above & dark outer below -->
  <tr><td style="background:#fef9c3;padding:14px 44px;text-align:center;">
    <p style="margin:0;color:#1e40af;font-size:13px;font-weight:800;letter-spacing:0.5px;">🎯 ${p.emailSubject}</p>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:36px 44px 28px;background:#ffffff;">

    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8;">Hey there! 👋</p>
    <p style="margin:0 0 28px;color:#374151;font-size:14px;line-height:1.8;">I'm <strong style="color:#0d1f5c;">${p.name}</strong>, a ${p.role} who <strong>absolutely loves</strong> building amazing things on the web! With ${p.workExperience} of experience under my belt, I'm ready to bring <strong>energy, expertise, and excellence</strong> to your team.</p>

    <!-- SKILLS — colorful badges grid -->
    <div style="background:linear-gradient(135deg,#f0f4ff,#fff0f8);border-radius:14px;padding:24px;margin-bottom:28px;border:1px solid #e0e7ff;">
      <p style="margin:0 0 18px;color:#0d1f5c;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">⚡ Skills &amp; Experience</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${p.skills.map((s, i) => {
          const colors = [
            ['#ede9fe','#7c3aed'],['#fce7f3','#be185d'],['#ecfdf5','#059669'],
            ['#fff7ed','#c2410c'],['#eff6ff','#1d4ed8'],['#f0fdf4','#15803d'],
            ['#fdf4ff','#a21caf'],['#fff1f2','#be123c'],
          ];
          const [bg, fg] = colors[i % colors.length];
          return `<tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td><span style="display:inline-block;background:${bg};color:${fg};font-size:12px;font-weight:800;padding:5px 14px;border-radius:20px;border:1px solid ${fg}22;">${s.name}</span></td>
                <td style="text-align:right;"><span style="color:#6b7280;font-size:13px;font-weight:700;">${s.experience}</span></td>
              </tr>
            </table>
          </td></tr>`;
        }).join('')}
      </table>
    </div>

    <!-- CTC CARDS — three vivid cards -->
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr>
        <td style="width:33%;padding:0 6px 0 0;vertical-align:top;">
          <div style="background:linear-gradient(135deg,#0f0c29,#1a1040);border-radius:12px;padding:18px;text-align:center;height:60px;display:table;width:100%;box-sizing:border-box;">
            <div style="display:table-cell;vertical-align:middle;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Notice Period</p>
              <p style="margin:0;color:#00d4ff;font-size:14px;font-weight:800;">${p.noticePeriod}</p>
            </div>
          </div>
        </td>
        <td style="width:33%;padding:0 3px;vertical-align:top;">
          <div style="background:linear-gradient(135deg,#ff6b35,#ff2d9d);border-radius:12px;padding:18px;text-align:center;height:60px;display:table;width:100%;box-sizing:border-box;">
            <div style="display:table-cell;vertical-align:middle;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Current CTC</p>
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:800;">${p.currentCTC}</p>
            </div>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 6px;vertical-align:top;">
          <div style="background:linear-gradient(135deg,#00c853,#00796b);border-radius:12px;padding:18px;text-align:center;height:60px;display:table;width:100%;box-sizing:border-box;">
            <div style="display:table-cell;vertical-align:middle;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Expected CTC</p>
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:800;">${p.expectedCTC}</p>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- KEY DETAILS TABLE (phone + email) -->
    ${(p.phone || p.email) ? `
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e0e7ff;border-radius:10px;overflow:hidden;margin-bottom:28px;">
      ${[
        ...(p.phone ? [['📱 Phone', p.phone, '#ff6b35']] : []),
        ...(p.email ? [['✉️ Email', p.email, '#1e40af']] : []),
      ].map(([k, v, color], i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:700;width:120px;border-right:1px solid #e0e7ff;">${k}</td>
        <td style="padding:10px 16px;color:${color};font-size:13px;font-weight:700;">${v}</td>
      </tr>`).join('')}
    </table>` : ''}

    ${p.customMessage ? `<div style="background:linear-gradient(135deg,#fff0f8,#f0f4ff);border-left:4px solid #ff6b35;border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:28px;">
      <p style="margin:0;color:#0d1f5c;font-size:14px;line-height:1.8;font-weight:500;">${p.customMessage}</p>
    </div>` : ''}

  </td></tr>

  <!-- PORTFOLIO CTA -->
  ${p.portfolioLink ? `<tr><td style="padding:0 44px 32px;text-align:center;background:#ffffff;">
    <a href="${p.portfolioLink}" style="display:inline-block;background:linear-gradient(135deg,#0f0c29,#1a1040);color:#00d4ff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(0,0,0,0.35);border:2px solid #00d4ff;">🌐 Explore My Work →</a>
  </td></tr>` : ''}

  <!-- FOOTER -->
  <tr><td style="background:linear-gradient(135deg,#0f0c29,#1a1040);border-top:3px solid #ff6b35;padding:28px 44px;text-align:center;">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.5);font-size:13px;">Thanks &amp; Regards 🙏</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:900;color:#ffffff;">${p.name}</p>
    <div>
      ${p.linkedinLink ? `<a href="${p.linkedinLink}" style="display:inline-block;background:#00d4ff;color:#0f0c29;font-size:12px;font-weight:800;text-decoration:none;padding:8px 20px;border-radius:20px;margin:0 4px;">LinkedIn</a>` : ''}
      ${p.githubLink ? `<a href="${p.githubLink}" style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:12px;font-weight:800;text-decoration:none;padding:8px 20px;border-radius:20px;margin:0 4px;">GitHub</a>` : ''}
    </div>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;

export const generateTemplate = (type: TemplateType, info: PersonalInfo): string => {
  if (type === 'extrovert') return extrovertTemplate(info);
  return professionalTemplate(info);
};
