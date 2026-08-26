// PDF რეზიუმეს HTML შაბლონები — expo-print-ისთვის
// web-ის ResumeTemplates.tsx-ის დიზაინის იდენტური ვერსია, HTML string-ად

function esc(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initial(name?: string) {
  return esc((name || '?').charAt(0).toUpperCase());
}

function fmtDate() {
  return new Date().toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
}

type Exp = { position?: string; company?: string; start?: string; end?: string; description?: string };
type Edu = { institution?: string; degree?: string; field?: string; year?: string };
type Lang = string | { language?: string; lang?: string; name?: string; level?: string; proficiency?: string };

function skillsList(profile: any): string[] {
  return profile.skills ? String(profile.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
}

function langLabel(l: Lang) {
  if (typeof l === 'string') return esc(l);
  return esc(l.language || l.lang || l.name || '');
}
function langLevel(l: Lang) {
  if (typeof l === 'string') return '';
  return esc(l.level || l.proficiency || '');
}

const HTML_WRAP_OPEN = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>`;
const HTML_WRAP_CLOSE = `</body></html>`;

// ═══ 1. MINIMAL ═══
export function minimalResumeHtml(profile: any): string {
  const accent = '#5B42F5';
  const skills = skillsList(profile);
  const exp: Exp[] = Array.isArray(profile.jobs_experience) ? profile.jobs_experience : [];
  const edu: Edu[] = Array.isArray(profile.education) ? profile.education : [];
  const langs: Lang[] = Array.isArray(profile.languages) ? profile.languages : [];

  return `${HTML_WRAP_OPEN}
  <div style="background:#ffffff;padding:48px;font-family:sans-serif;color:#1c1c1e;">
    <div style="display:flex;align-items:center;gap:24px;padding-bottom:24px;border-bottom:2px solid ${accent};margin-bottom:24px;">
      ${profile.avatar_url
        ? `<img src="${esc(profile.avatar_url)}" style="width:80px;height:80px;border-radius:16px;object-fit:cover;" />`
        : `<div style="width:80px;height:80px;border-radius:16px;background:${accent};display:flex;align-items:center;justify-content:center;color:white;font-size:32px;font-weight:800;">${initial(profile.name)}</div>`}
      <div style="flex:1;">
        <div style="font-size:24px;font-weight:800;">${esc(profile.name)}</div>
        ${profile.username ? `<div style="font-size:12px;color:#6e6e73;margin-top:2px;">@${esc(profile.username)}</div>` : ''}
        ${profile.sphere ? `<div style="font-size:12px;color:${accent};font-weight:600;margin-top:4px;">${esc(profile.sphere)}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:18px;font-weight:800;color:${accent};">FreeJob</div>
        <div style="font-size:10px;color:#6e6e73;">freejob.ge</div>
      </div>
    </div>

    ${(profile.location || profile.availability || profile.salary_expect) ? `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
      ${profile.location ? `<span style="padding:4px 12px;border-radius:20px;background:#f5f5f7;font-size:12px;">📍 ${esc(profile.location)}</span>` : ''}
      ${profile.availability ? `<span style="padding:4px 12px;border-radius:20px;background:#f5f5f7;font-size:12px;">⏱ ${esc(profile.availability)}</span>` : ''}
      ${profile.salary_expect ? `<span style="padding:4px 12px;border-radius:20px;background:#f5f5f7;font-size:12px;">💰 ${esc(profile.salary_expect)}</span>` : ''}
    </div>` : ''}

    ${profile.rating ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;background:#fff8e7;font-size:12px;font-weight:700;color:#b8860b;margin-bottom:20px;">⭐ ${Number(profile.rating).toFixed(1)} რეიტინგი</div>` : ''}

    ${profile.bio ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e5ea;">შესახებ</div>
      <div style="font-size:13px;color:#3c3c43;line-height:1.7;">${esc(profile.bio)}</div>
    </div>` : ''}

    ${skills.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e5ea;">უნარები</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${skills.map((s) => `<span style="padding:3px 10px;border-radius:8px;background:#f0eeff;color:${accent};font-size:12px;font-weight:600;">${esc(s)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${exp.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e5ea;">გამოცდილება</div>
      ${exp.map((e) => `
      <div style="margin-bottom:12px;padding:12px 14px;border-radius:10px;background:#f9f9fb;border-left:3px solid ${accent};">
        <div style="font-weight:700;font-size:13px;">${esc(e.position)}${e.company ? ` — ${esc(e.company)}` : ''}</div>
        <div style="font-size:11px;color:#6e6e73;margin-top:2px;">${[e.start, e.end].filter(Boolean).map(esc).join(' – ')}</div>
        ${e.description ? `<div style="font-size:12px;color:#3c3c43;margin-top:4px;">${esc(e.description)}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}

    ${edu.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e5ea;">განათლება</div>
      ${edu.map((e) => `
      <div style="margin-bottom:12px;padding:12px 14px;border-radius:10px;background:#f9f9fb;border-left:3px solid ${accent};">
        <div style="font-weight:700;font-size:13px;">${esc(e.institution)}</div>
        <div style="font-size:11px;color:#6e6e73;margin-top:2px;">${[e.degree, e.field, e.year].filter(Boolean).map(esc).join(' · ')}</div>
      </div>`).join('')}
    </div>` : ''}

    ${langs.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e5ea;">ენები</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${langs.map((l) => `<div style="display:flex;justify-content:space-between;padding:7px 12px;border-radius:8px;background:#f9f9fb;font-size:12px;"><span>${langLabel(l)}</span><span style="font-weight:600;color:${accent};">${langLevel(l)}</span></div>`).join('')}
      </div>
    </div>` : ''}

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5ea;display:flex;justify-content:space-between;font-size:10px;color:#8e8e93;">
      <span>შექმნილია FreeJob-ით · freejob.ge</span>
      <span>${fmtDate()}</span>
    </div>
  </div>
  ${HTML_WRAP_CLOSE}`;
}

// ═══ 2. CLASSIC ═══
export function classicResumeHtml(profile: any): string {
  const skills = skillsList(profile);
  const exp: Exp[] = Array.isArray(profile.jobs_experience) ? profile.jobs_experience : [];
  const edu: Edu[] = Array.isArray(profile.education) ? profile.education : [];
  const langs: Lang[] = Array.isArray(profile.languages) ? profile.languages : [];

  return `${HTML_WRAP_OPEN}
  <div style="background:#ffffff;padding:48px;font-family:Georgia,serif;color:#1c1c1e;">
    <div style="display:flex;align-items:center;gap:20px;padding-bottom:22px;border-bottom:3px double #1c1c1e;margin-bottom:24px;">
      ${profile.avatar_url
        ? `<img src="${esc(profile.avatar_url)}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid #1c1c1e;" />`
        : `<div style="width:84px;height:84px;border-radius:50%;background:#1c1c1e;display:flex;align-items:center;justify-content:center;color:white;font-size:30px;font-weight:700;border:3px solid #1c1c1e;">${initial(profile.name)}</div>`}
      <div style="flex:1;text-align:left;">
        <div style="font-size:26px;font-weight:700;letter-spacing:0.5px;">${esc((profile.name || '').toUpperCase())}</div>
        ${profile.sphere ? `<div style="font-size:13px;color:#3c3c43;margin-top:6px;letter-spacing:0.5px;">${esc(profile.sphere)}</div>` : ''}
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:11px;color:#6e6e73;">
          ${profile.contact_email ? `<span>${esc(profile.contact_email)}</span>` : ''}
          ${profile.location ? `<span>· ${esc(profile.location)}</span>` : ''}
          ${profile.username ? `<span>· @${esc(profile.username)}</span>` : ''}
        </div>
      </div>
    </div>

    ${profile.bio ? `<div style="margin-bottom:22px;text-align:center;"><div style="font-size:13px;color:#3c3c43;line-height:1.7;font-style:italic;">${esc(profile.bio)}</div></div>` : ''}

    ${skills.length > 0 ? `
    <div style="margin-bottom:22px;">
      <div style="font-size:13px;font-weight:700;text-align:center;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;">უნარები</div>
      <div style="height:1px;background:#1c1c1e;width:40px;margin:0 auto 14px;"></div>
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;">
        ${skills.map((s) => `<span style="padding:3px 12px;border:1px solid #1c1c1e;border-radius:3px;font-size:11px;letter-spacing:0.3px;">${esc(s)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${exp.length > 0 ? `
    <div style="margin-bottom:22px;">
      <div style="font-size:13px;font-weight:700;text-align:center;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;">გამოცდილება</div>
      <div style="height:1px;background:#1c1c1e;width:40px;margin:0 auto 12px;"></div>
      ${exp.map((e, i) => `
      <div style="margin-bottom:14px;padding-bottom:12px;${i < exp.length - 1 ? 'border-bottom:1px solid #e5e5ea;' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:700;font-size:14px;">${esc(e.position)}</div>
          <div style="font-size:11px;color:#6e6e73;">${[e.start, e.end].filter(Boolean).map(esc).join(' – ')}</div>
        </div>
        ${e.company ? `<div style="font-size:12px;color:#3c3c43;font-style:italic;margin-top:2px;">${esc(e.company)}</div>` : ''}
        ${e.description ? `<div style="font-size:12px;color:#3c3c43;margin-top:6px;line-height:1.6;">${esc(e.description)}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}

    ${edu.length > 0 ? `
    <div style="margin-bottom:22px;">
      <div style="font-size:13px;font-weight:700;text-align:center;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;">განათლება</div>
      <div style="height:1px;background:#1c1c1e;width:40px;margin:0 auto 12px;"></div>
      ${edu.map((e) => `
      <div style="margin-bottom:10px;text-align:center;">
        <div style="font-weight:700;font-size:13px;">${esc(e.institution)}</div>
        <div style="font-size:11px;color:#6e6e73;margin-top:2px;">${[e.degree, e.field, e.year].filter(Boolean).map(esc).join(' · ')}</div>
      </div>`).join('')}
    </div>` : ''}

    ${langs.length > 0 ? `
    <div style="margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;text-align:center;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;">ენები</div>
      <div style="height:1px;background:#1c1c1e;width:40px;margin:0 auto 12px;"></div>
      <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;">
        ${langs.map((l) => `<span style="font-size:12px;">${langLabel(l)}${langLevel(l) ? ` (${langLevel(l)})` : ''}</span>`).join('')}
      </div>
    </div>` : ''}

    <div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e5ea;text-align:center;font-size:10px;color:#8e8e93;">
      FreeJob · freejob.ge · ${fmtDate()}
    </div>
  </div>
  ${HTML_WRAP_CLOSE}`;
}

// ═══ 3. MODERN ═══
export function modernResumeHtml(profile: any): string {
  const accent = '#12B3AA';
  const skills = skillsList(profile);
  const exp: Exp[] = Array.isArray(profile.jobs_experience) ? profile.jobs_experience : [];
  const edu: Edu[] = Array.isArray(profile.education) ? profile.education : [];
  const langs: Lang[] = Array.isArray(profile.languages) ? profile.languages : [];

  return `${HTML_WRAP_OPEN}
  <div style="background:#ffffff;font-family:sans-serif;color:#1c1c1e;display:flex;">
    <div style="width:200px;background:#0d1117;padding:32px 20px;color:white;flex-shrink:0;">
      ${profile.avatar_url
        ? `<img src="${esc(profile.avatar_url)}" style="width:72px;height:72px;border-radius:16px;object-fit:cover;margin-bottom:16px;" />`
        : `<div style="width:72px;height:72px;border-radius:16px;background:${accent};display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:800;margin-bottom:16px;">${initial(profile.name)}</div>`}
      <div style="font-size:18px;font-weight:800;margin-bottom:4px;">${esc(profile.name)}</div>
      ${profile.sphere ? `<div style="font-size:11px;color:${accent};font-weight:600;margin-bottom:16px;">${esc(profile.sphere)}</div>` : ''}

      ${(profile.location || profile.contact_email || profile.availability) ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${accent};font-weight:700;margin-bottom:8px;">კონტაქტი</div>
        ${profile.location ? `<div style="font-size:11px;margin-bottom:5px;opacity:0.85;">📍 ${esc(profile.location)}</div>` : ''}
        ${profile.contact_email ? `<div style="font-size:11px;margin-bottom:5px;opacity:0.85;word-break:break-all;">✉ ${esc(profile.contact_email)}</div>` : ''}
        ${profile.availability ? `<div style="font-size:11px;opacity:0.85;">⏱ ${esc(profile.availability)}</div>` : ''}
      </div>` : ''}

      ${skills.length > 0 ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${accent};font-weight:700;margin-bottom:8px;">უნარები</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${skills.map((s) => `<span style="padding:3px 8px;border-radius:6px;background:rgba(18,179,170,0.15);color:${accent};font-size:10px;font-weight:600;">${esc(s)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${langs.length > 0 ? `
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${accent};font-weight:700;margin-bottom:8px;">ენები</div>
        ${langs.map((l) => `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px;opacity:0.85;"><span>${langLabel(l)}</span><span style="color:${accent};">${langLevel(l)}</span></div>`).join('')}
      </div>` : ''}
    </div>

    <div style="flex:1;padding:32px 28px;">
      ${profile.rating ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;background:#fff8e7;font-size:12px;font-weight:700;color:#b8860b;margin-bottom:18px;">⭐ ${Number(profile.rating).toFixed(1)} რეიტინგი</div>` : ''}

      ${profile.bio ? `
      <div style="margin-bottom:22px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:8px;">შესახებ</div>
        <div style="font-size:13px;color:#3c3c43;line-height:1.7;">${esc(profile.bio)}</div>
      </div>` : ''}

      ${exp.length > 0 ? `
      <div style="margin-bottom:22px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:10px;">გამოცდილება</div>
        ${exp.map((e) => `
        <div style="margin-bottom:14px;padding-left:14px;border-left:2px solid ${accent};">
          <div style="font-weight:700;font-size:14px;">${esc(e.position)}</div>
          <div style="font-size:12px;color:#6e6e73;margin-top:1px;">${esc(e.company)}${e.company && (e.start || e.end) ? ' · ' : ''}${[e.start, e.end].filter(Boolean).map(esc).join(' – ')}</div>
          ${e.description ? `<div style="font-size:12px;color:#3c3c43;margin-top:5px;line-height:1.6;">${esc(e.description)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}

      ${edu.length > 0 ? `
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${accent};margin-bottom:10px;">განათლება</div>
        ${edu.map((e) => `
        <div style="margin-bottom:10px;padding-left:14px;border-left:2px solid ${accent};">
          <div style="font-weight:700;font-size:13px;">${esc(e.institution)}</div>
          <div style="font-size:11px;color:#6e6e73;margin-top:1px;">${[e.degree, e.field, e.year].filter(Boolean).map(esc).join(' · ')}</div>
        </div>`).join('')}
      </div>` : ''}

      <div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e5ea;font-size:10px;color:#8e8e93;">
        FreeJob · freejob.ge · ${fmtDate()}
      </div>
    </div>
  </div>
  ${HTML_WRAP_CLOSE}`;
}

export type ResumeTemplateId = 'minimal' | 'classic' | 'modern';

export function buildResumeHtml(profile: any, templateId: ResumeTemplateId): string {
  if (templateId === 'classic') return classicResumeHtml(profile);
  if (templateId === 'modern') return modernResumeHtml(profile);
  return minimalResumeHtml(profile);
}