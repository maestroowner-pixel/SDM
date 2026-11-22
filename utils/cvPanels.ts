// CV design «Panels»: every section a card, every filled field printed. Ported
// from the SDM Web panels layout (SDM-Web/utils/cvTemplate.ts) with the web
// editor's options fixed: all sections, all fields, default order.
//
// The screen passes what it already computed for the other designs (sorted
// records, QR codes, header lines), so sorting and QR rules stay in one place.
import { formatDate, allPhones } from './helpers';
import { t } from './i18n';

export interface PanelsCvContext {
  state: any;
  isPremium: boolean;
  fullName: string;
  positionLine?: string;
  vesselTypeLine?: string;
  dayRateLine?: string;
  phones: string;
  appQrUrl: string;
  contactQrUrl: string;
  sortedSeaService: any[];
  sortedDocuments: any[];
  getVesselTypeLabel: (value: string) => string;
  withUnit: (raw: string | undefined, unit: string) => string;
}

export const PANELS_ACCENT = '#3949ab';

// User text lands in the page as HTML, so values are escaped.
const esc = (v: any): string => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escLines = (v: any): string => esc(String(v ?? '').trim()).split('\n').join('<br/>');

const rgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
};

// Calendar months plus leftover days, as on the sea service screen.
const monthsAndDays = (signOn: string, signOff: string) => {
  if (!signOn || !signOff) return { months: 0, days: 0 };
  const start = new Date(signOn);
  const end = new Date(signOff);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return { months: 0, days: 0 };
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months--;
  const temp = new Date(start);
  temp.setMonth(temp.getMonth() + months);
  return { months, days: Math.ceil((end.getTime() - temp.getTime()) / 86400000) };
};

const formatSpan = (months: number, days: number): string => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [
    y ? `${y} ${t('seaService.years')}` : '',
    m ? `${m} ${t('seaService.months')}` : '',
    days ? `${days} ${t('seaService.days')}` : '',
  ].filter(Boolean).join(' ');
};

const CATEGORY_KEYS: Record<string, string> = {
  'Passport': 'passport', "Seaman's Book": 'seamansBook', 'Diplomas': 'diplomas',
  'Medical Certificates': 'medical', 'STCW Certificates': 'stcw', 'Offshore Certifications': 'offshore',
  'National Endorsements': 'national', 'Other': 'other', 'Uncategorized': 'uncategorized',
};

// Eye and hair colours are stored in English; show them in the CV language.
const colourLabel = (group: 'eyeColors' | 'hairColors', v: string): string => {
  if (!v) return '';
  const key = `biometrics.${group}.${v.toLowerCase()}`;
  const label = t(key);
  return label === key ? v : label;
};

export const buildPanelsCvHtml = (c: PanelsCvContext): string => {
  const accent = PANELS_ACCENT;
  const { state, isPremium, withUnit } = c;
  const p = state.personal || {};

  // Label/value rows with the empty ones left out; a panel with no rows is dropped.
  const rows = (items: [string, string][]) => items
    .filter(([, v]) => v && v !== '-')
    .map(([k, v]) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`)
    .join('');
  const panel = (title: string, body: string, wide = false, extra = '') => body ? `
    <section class="panel${wide ? ' wide' : ''}">
      <div class="p-head"><h2>${esc(title)}</h2>${extra}</div>
      ${body}
    </section>` : '';

  const career = panel(t('personal.sections.careerPreferences'), rows([
    [t('personal.fields.appliedPosition'), esc(c.positionLine)],
    [t('personal.fields.vesselType'), esc(c.vesselTypeLine)],
    [t('personal.fields.minDayRate'), esc(String(c.dayRateLine || '').trim())],
    [t('personal.fields.availabilityDate'), p.availabilityDate ? formatDate(p.availabilityDate) : ''],
  ]));

  const personalPanel = panel(t('personal.sections.personalDetails'), rows([
    [t('personal.fields.dateOfBirth'), p.birthDate ? formatDate(p.birthDate) : ''],
    [t('personal.fields.placeOfBirth'), esc(p.birthPlace)],
    [t('personal.fields.nationality'), esc(p.nationality)],
  ]));

  const address = [p.address, p.city, p.postalCode, p.country].map(v => String(v || '').trim()).filter(Boolean).join(', ');
  const telegram = p.telegram ? (String(p.telegram).startsWith('@') ? p.telegram : `@${p.telegram}`) : '';
  const contactRows = rows([
    [t('personal.fields.phone'), allPhones(p).map(esc).join('<br/>')],
    [t('personal.fields.email'), esc(p.email)],
    [t('personal.fields.whatsapp'), esc(p.whatsapp)],
    [t('personal.fields.telegram'), esc(telegram)],
    [t('personal.fields.msTeams'), esc(p.teams)],
    [t('personal.fields.address'), esc(address)],
    [t('personal.fields.nearestAirport'), esc(p.nearestAirport)],
  ]);
  const contact = panel(t('personal.sections.contactInformation'), contactRows ? `
    <div class="contact">
      <div class="contact-rows">${contactRows}</div>
      ${c.contactQrUrl ? `<div class="cqr"><img src="${c.contactQrUrl}" alt="Contact QR"/><div>${esc(t('cv.scanContact'))}</div></div>` : ''}
    </div>` : '');

  const bio = state.biometrics || {};
  const physical = panel(t('cv.sections.physicalData'), rows([
    [t('biometrics.fields.height'), withUnit(esc(bio.height), 'cm')],
    [t('biometrics.fields.weight'), withUnit(esc(bio.weight), 'kg')],
    [t('biometrics.fields.shoeSize'), esc(bio.shoeSize)],
    [t('biometrics.fields.overallSize'), esc(bio.overallSize)],
    [t('biometrics.fields.eyeColor'), esc(colourLabel('eyeColors', bio.eyeColor))],
    [t('biometrics.fields.hairColor'), esc(colourLabel('hairColors', bio.hairColor))],
    [t('biometrics.fields.bloodType'), esc(bio.bloodType)],
  ]));

  const edu = state.education || {};
  const education = panel(t('education.title'), rows([
    [t('education.fields.institution'), esc(edu.institution)],
    [t('education.fields.degree'), esc(edu.degree)],
    [t('education.fields.specialization'), esc(edu.specialization)],
    [t('education.fields.graduationYear'), esc(edu.graduationYear)],
    [t('education.fields.languages'), esc(edu.languages)],
    [t('education.fields.additionalSkills'), escLines(edu.additionalSkills)],
  ]));

  const nok = state.nextOfKin || {};
  const nextOfKin = !nok.name ? '' : panel(t('nextOfKin.title'), isPremium
    ? rows([
      [t('nextOfKin.fields.name'), esc(nok.name)],
      [t('nextOfKin.fields.relationship'), esc(nok.relationship)],
      [t('nextOfKin.fields.phone'), esc(nok.phone)],
      [t('nextOfKin.fields.email'), esc(nok.email)],
      [t('nextOfKin.fields.address'), esc(nok.address)],
    ])
    : `${rows([[t('nextOfKin.fields.name'), esc(nok.name)]])}<div class="locked">Full details available in Unlimited version</div>`);

  // Sea service: one card per contract with every filled field.
  let totalMonths = 0;
  let totalDays = 0;
  const contractCards = c.sortedSeaService.map((s: any) => {
    const span = monthsAndDays(s.signOn, s.signOff);
    totalMonths += span.months;
    totalDays += span.days;
    const position = s.position === 'Other' ? (s.customPosition || '') : (s.position || '');
    const vesselType = s.vesselType === 'Other' ? (s.customVesselType || '') : (s.vesselType ? c.getVesselTypeLabel(s.vesselType) : '');
    const facts = rows([
      [t('seaService.form.flag'), esc(s.flag)],
      [t('seaService.form.grt'), esc(s.grossTonnage)],
      [t('cv.table.teu'), esc(s.teu)],
      [t('seaService.form.engineType'), esc(s.engineType)],
      [t('seaService.form.enginePower'), withUnit(esc(s.enginePower), 'kW')],
      [t('seaService.form.propulsionType'), esc(s.propulsionType)],
      [t('seaService.form.reeferPower'), withUnit(esc(s.reeferPower), 'kW')],
      [t('seaService.form.dpClass'), esc(s.dpClass)],
      [t('seaService.form.dpSystemName'), esc(s.dpSystem)],
      [t('seaService.form.craneMake'), esc(s.craneMake)],
      [t('seaService.form.craneType'), esc(s.craneType)],
      [t('seaService.form.craneSwl'), c.withUnit(esc(s.craneSwl), 't')],
      [t('seaService.form.sailingArea'), esc(s.sailingArea)],
    ]);
    const duration = formatSpan(span.months, span.days);
    return `
      <div class="contract">
        <div class="c-top">
          <div><span class="c-vessel">${esc(s.vesselName) || '-'}</span>${vesselType ? `<span class="tag">${esc(vesselType)}</span>` : ''}</div>
          <div class="c-dates">${formatDate(s.signOn)} — ${formatDate(s.signOff)}${duration ? `<div class="c-dur">${esc(duration)}</div>` : ''}</div>
        </div>
        <div class="c-pos">${esc(position) || '-'}${s.company ? ` <span class="c-co">· ${esc(s.company)}</span>` : ''}</div>
        ${facts ? `<div class="facts">${facts}</div>` : ''}
        ${String(s.comments || '').trim() ? `<div class="c-note">${escLines(s.comments)}</div>` : ''}
      </div>`;
  }).join('');
  totalMonths += Math.floor(totalDays / 30);
  const total = formatSpan(totalMonths, totalDays % 30);
  const seaService = panel(t('cv.sections.seaService'), contractCards, true,
    total ? `<span class="badge">${esc(t('seaService.totalTime'))}: ${esc(total)}</span>` : '');

  // Documents grouped by category, already in CV order.
  const docs = c.sortedDocuments;
  const groups: { category: string; items: any[] }[] = [];
  docs.forEach((d: any) => {
    const cat = d.category || 'Uncategorized';
    const last = groups[groups.length - 1];
    if (last && last.category === cat) last.items.push(d); else groups.push({ category: cat, items: [d] });
  });
  const docCols: [string, (d: any) => string][] = [
    [t('cv.table.number'), d => esc(d.number) || '-'],
    [t('cv.table.issueDate'), d => formatDate(d.issueDate)],
    [t('cv.table.expiryDate'), d => d.noExpiryDate ? esc(t('documents.form.noExpiryDate')) : formatDate(d.expiryDate)],
    [t('documents.form.issuePlace'), d => esc(d.issuePlace) || '-'],
  ];
  const documentsBody = groups.map(g => `
    <div class="doc-group">
      <div class="doc-cat">${esc(t(`documents.categories.${CATEGORY_KEYS[g.category] || 'other'}`))} <span>${g.items.length}</span></div>
      <table class="docs">
        <thead><tr><th>${esc(t('cv.table.document'))}</th>${isPremium
          ? docCols.map(([label]) => `<th>${esc(label)}</th>`).join('')
          : '<th style="text-align:center;">Available in Unlimited version</th>'}</tr></thead>
        <tbody>${g.items.map(d => `<tr><td class="d-name">${esc(d.name)}</td>${isPremium
          ? docCols.map(([, cell]) => `<td>${cell(d)}</td>`).join('')
          : '<td style="text-align:center;color:#d32f2f;">***</td>'}</tr>${isPremium && String(d.notes || '').trim()
          ? `<tr class="d-note"><td colspan="${docCols.length + 1}">${escLines(d.notes)}</td></tr>` : ''}`).join('')}</tbody>
      </table>
    </div>`).join('');
  const documentsPanel = panel(t('cv.sections.documents'), documentsBody, true,
    docs.length ? `<span class="badge">${docs.length}</span>` : '');

  const notes = (state.includeNotesInCV && state.notes)
    ? panel(t('notes.title'), `<p class="notes">${escLines(state.notes)}</p>`, true) : '';

  const contacts = [c.phones, p.email].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  const hero = `
    <header class="hero">
      ${p.photo ? `<img class="h-photo" src="${esc(p.photo)}" alt=""/>` : ''}
      <div class="h-main">
        <h1>${esc(c.fullName)}</h1>
        ${c.positionLine ? `<div class="h-pos">${esc(c.positionLine)}</div>` : ''}
        ${contacts ? `<div class="h-ct">${contacts}</div>` : ''}
      </div>
      ${c.appQrUrl ? `<div class="h-qr"><img src="${c.appQrUrl}" alt="QR"/><span>Seafarer Documents Manager</span></div>` : ''}
    </header>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#2b2b2b; font-size:10.5px; line-height:1.45; background:#fff; }
    .hero { display:flex; align-items:center; gap:16px; background:${accent}; color:#fff; border-radius:10px; padding:14px 16px; margin-bottom:10px; page-break-inside:avoid; }
    .h-photo { width:84px; height:108px; object-fit:cover; border-radius:6px; border:2px solid rgba(255,255,255,0.85); flex-shrink:0; }
    .h-main { flex:1; min-width:0; }
    .hero h1 { font-size:23px; line-height:1.15; letter-spacing:.3px; }
    .h-pos { font-size:13px; font-style:italic; opacity:.9; margin-top:4px; }
    .h-ct { font-size:10px; opacity:.85; margin-top:6px; }
    .h-qr { text-align:center; flex-shrink:0; }
    .h-qr img { width:54px; height:54px; background:#fff; padding:3px; border-radius:4px; display:block; margin:0 auto 3px; }
    .h-qr span { font-size:7px; opacity:.8; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; grid-auto-flow:row dense; }
    .panel { border:1px solid ${rgba(accent, 0.25)}; border-top:3px solid ${accent}; border-radius:8px; padding:9px 12px 10px; background:#fff; page-break-inside:avoid; break-inside:avoid; }
    .panel.wide { grid-column:1 / -1; page-break-inside:auto; break-inside:auto; }
    .p-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; page-break-after:avoid; break-after:avoid; }
    h2 { color:${accent}; font-size:12.5px; letter-spacing:.4px; }
    .badge { background:${rgba(accent, 0.12)}; color:${accent}; font-weight:bold; font-size:9.5px; border-radius:10px; padding:2px 9px; white-space:nowrap; }
    .kv { display:flex; gap:8px; padding:3px 0; border-bottom:1px dotted #e3e3e3; }
    .kv:last-child { border-bottom:none; }
    .k { color:#777; width:42%; flex-shrink:0; }
    .v { font-weight:600; min-width:0; overflow-wrap:anywhere; }
    .contact { display:flex; gap:10px; align-items:flex-start; }
    .contact-rows { flex:1; min-width:0; }
    .cqr { width:92px; text-align:center; flex-shrink:0; font-size:7.5px; color:#777; font-style:italic; line-height:1.3; }
    .cqr img { width:86px; height:86px; padding:3px; border:1px solid #e0e0e0; border-radius:6px; display:block; margin-bottom:3px; }
    .locked { color:#d32f2f; font-size:9.5px; margin-top:4px; }
    .contract { border:1px solid #e6e6e6; border-left:3px solid ${accent}; border-radius:6px; padding:7px 10px; margin-bottom:7px; page-break-inside:avoid; break-inside:avoid; background:${rgba(accent, 0.03)}; }
    .contract:last-child { margin-bottom:0; }
    .c-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .c-vessel { font-weight:bold; font-size:12px; }
    .tag { display:inline-block; margin-left:7px; font-size:9px; color:${accent}; border:1px solid ${rgba(accent, 0.4)}; border-radius:9px; padding:0 7px; vertical-align:1px; }
    .c-dates { text-align:right; white-space:nowrap; color:#555; font-size:10px; }
    .c-dur { color:${accent}; font-weight:bold; font-size:9.5px; }
    .c-pos { font-weight:600; margin-top:1px; }
    .c-co { color:#666; font-weight:normal; }
    .facts { display:grid; grid-template-columns:repeat(3, 1fr); column-gap:14px; margin-top:5px; }
    .facts .kv { border-bottom:none; padding:1px 0; flex-direction:column; gap:0; }
    .facts .k { width:auto; font-size:8.5px; text-transform:uppercase; letter-spacing:.3px; }
    .c-note { margin-top:5px; padding-top:5px; border-top:1px dotted #ddd; color:#444; font-style:italic; }
    .doc-group { margin-bottom:8px; page-break-inside:avoid; break-inside:avoid; }
    .doc-group:last-child { margin-bottom:0; }
    .doc-cat { font-weight:bold; color:#444; margin-bottom:3px; }
    .doc-cat span { color:#999; font-weight:normal; }
    table { width:100%; border-collapse:collapse; }
    th { background:${rgba(accent, 0.12)}; color:${accent}; text-align:left; font-size:9px; padding:4px 7px; }
    td { padding:4px 7px; border-bottom:1px solid #eee; font-size:9.5px; }
    td:not(.d-name) { white-space:nowrap; }
    tr:nth-child(even) td { background:${rgba(accent, 0.04)}; }
    /* Same column widths in every category, so the groups line up. */
    table.docs { table-layout:fixed; }
    table.docs th:first-child { width:${isPremium ? 36 : 50}%; }
    table.docs td { overflow:hidden; text-overflow:ellipsis; }
    table.docs td.d-name { overflow-wrap:anywhere; }
    .notes { line-height:1.6; }
    tr.d-note td { padding-top:0; color:#555; font-style:italic; }
  </style></head><body>
    ${hero}
    <div class="grid">
      ${career}${personalPanel}${contact}${education}${seaService}${documentsPanel}${physical}${nextOfKin}${notes}
    </div>
  </body></html>`;
};
