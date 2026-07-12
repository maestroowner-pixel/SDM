// CV design engine — config-driven HTML builder used by the CV "design
// constructor". Produces a print-ready A4 CV whose layout, accent colour, font,
// and feature toggles come from a CvDesignConfig.
import qrcode from 'qrcode-generator';
import { formatDate } from './helpers';
import { t } from './i18n';
import { VESSEL_TYPES } from '../components/VesselTypeInput';

export type CvLayout = 'classic' | 'minimal' | 'executive' | 'banner' | 'sidebar';

export interface CvDesignConfig {
  layout: CvLayout;
  accent: string;            // hex, e.g. '#1976d2'
  font: 'sans' | 'serif';
  showPhoto: boolean;
  showAppQr: boolean;        // app link QR in the header
  showContactQr: boolean;    // vCard QR
  uppercaseHeadings: boolean;
  zebra: boolean;            // striped tables
}

export const CV_LAYOUTS: { id: CvLayout; name: string }[] = [
  { id: 'classic',   name: 'Classic' },
  { id: 'minimal',   name: 'Minimal' },
  { id: 'executive', name: 'Executive' },
  { id: 'banner',    name: 'Banner' },
  { id: 'sidebar',   name: 'Sidebar' },
];

export const ACCENT_PRESETS: { name: string; color: string }[] = [
  { name: 'Blue',     color: '#1976d2' },
  { name: 'Navy',     color: '#002147' },
  { name: 'Teal',     color: '#00838f' },
  { name: 'Red',      color: '#e23a2e' },
  { name: 'Graphite', color: '#37474f' },
  { name: 'Green',    color: '#2e7d32' },
  { name: 'Purple',   color: '#5e35b1' },
  { name: 'Orange',   color: '#e65100' },
];

export const defaultCvConfig: CvDesignConfig = {
  layout: 'classic',
  accent: '#1976d2',
  font: 'sans',
  showPhoto: true,
  showAppQr: true,
  showContactQr: true,
  uppercaseHeadings: false,
  zebra: true,
};

const CV_QR_TARGET = 'https://sdm.kuka-lab.com';

const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const makeQrDataUrl = (data: string): string => {
  try {
    if (!data) return '';
    const qr = qrcode(0, 'M');
    qr.addData(data);
    qr.make();
    return qr.createDataURL(4, 8);
  } catch {
    return '';
  }
};

const buildVCard = (p: any, title?: string): string => {
  const hasContact = p?.firstName || p?.lastName || p?.phone || p?.email;
  if (!hasContact) return '';
  const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  const telegramHandle = p.telegram ? (String(p.telegram).startsWith('@') ? p.telegram : `@${p.telegram}`) : '';
  const whatsappNumber = p.whatsapp ? String(p.whatsapp).replace(/\D/g, '') : '';
  return [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${p.lastName || ''};${p.firstName || ''};${p.middleName || ''};;`,
    `FN:${fullName}`,
    (title || p.appliedPosition) ? `TITLE:${title || p.appliedPosition}` : '',
    p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
    p.email ? `EMAIL:${p.email}` : '',
    telegramHandle ? `X-SOCIALPROFILE;TYPE=telegram:${telegramHandle}` : '',
    whatsappNumber ? `X-SOCIALPROFILE;TYPE=whatsapp:${p.whatsapp}` : '',
    p.teams ? `X-SOCIALPROFILE;TYPE=teams:${p.teams}` : '',
    telegramHandle ? `URL;TYPE=Telegram:https://t.me/${String(telegramHandle).replace('@', '')}` : '',
    whatsappNumber ? `URL;TYPE=WhatsApp:https://wa.me/${whatsappNumber}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n');
};

const getVesselTypeLabel = (value: string): string => {
  const found = VESSEL_TYPES.find(v => v.value === value);
  return found ? found.label : value;
};

const wrapAfterFiveWords = (text: string): string => {
  if (!text) return '';
  const words = text.split(' ');
  if (words.length <= 5) return text;
  return `${words.slice(0, 5).join(' ')}<br/>${words.slice(5).join(' ')}`;
};

const DOCUMENT_ORDER: Record<string, number> = {
  'Passport': 1, "Seaman's Book": 2, 'Medical Certificates': 3, 'Diplomas': 4,
  'STCW Certificates': 5, 'National Endorsements': 6, 'Offshore Certifications': 7,
  'Other': 8, 'Uncategorized': 9,
};

const fontStack = (font: 'sans' | 'serif') =>
  font === 'serif' ? `Georgia, 'Times New Roman', serif` : `Arial, Helvetica, sans-serif`;

// ── Shared, layout-independent content blocks ────────────────────────────────
const buildBlocks = (state: any, isPremium: boolean, cfg: CvDesignConfig) => {
  const { personal, biometrics, seaService, documents, nextOfKin, notes, includeNotesInCV, education } = state;

  const fullName = [personal.firstName, personal.middleName, personal.lastName]
    .filter(Boolean).join(' ') || t('cv.defaultName');

  const positionLine = personal.appliedPosition === 'Other' ? personal.customPosition : personal.appliedPosition;
  const vesselTypeLine = personal.vesselType === 'Other'
    ? personal.customVesselType
    : (personal.vesselType ? getVesselTypeLabel(personal.vesselType) : '-');
  const dayRateLine = personal.minDayRate
    ? `${personal.minDayRate} ${personal.minDayRateCurrency || ''} ${personal.isRateNegotiable ? '(Negotiable)' : ''}`
    : '-';

  const appQrUrl = cfg.showAppQr ? makeQrDataUrl(CV_QR_TARGET) : '';
  const contactQrUrl = cfg.showContactQr ? makeQrDataUrl(buildVCard(personal, positionLine)) : '';

  const sortedDocuments = documents.slice().sort(
    (a: any, b: any) => (DOCUMENT_ORDER[a.category] || 10) - (DOCUMENT_ORDER[b.category] || 10)
  );
  const sortedSeaService = [...seaService].sort((a: any, b: any) => {
    const tA = a.signOff ? new Date(a.signOff).getTime() : 0;
    const tB = b.signOff ? new Date(b.signOff).getTime() : 0;
    if (tA === 0 && tB === 0) {
      const oA = a.signOn ? new Date(a.signOn).getTime() : 0;
      const oB = b.signOn ? new Date(b.signOn).getTime() : 0;
      return oB - oA;
    }
    if (tA === 0) return -1;
    if (tB === 0) return 1;
    return tB - tA;
  });

  const documentsHtml = sortedDocuments.length > 0 ? `
    <div class="section">
      <h2>${t('cv.sections.documents')}</h2>
      <table>
        <thead><tr>
          <th>${t('cv.table.document')}</th>
          ${isPremium
            ? `<th>${t('cv.table.number')}</th><th>${t('cv.table.issueDate')}</th><th>${t('cv.table.expiryDate')}</th>`
            : `<th style="text-align:center;">Available in Unlimited version</th>`}
        </tr></thead>
        <tbody>
          ${sortedDocuments.map((d: any) => `<tr>
            <td>${wrapAfterFiveWords(d.name)}</td>
            ${isPremium
              ? `<td>${d.number || '-'}</td><td>${formatDate(d.issueDate)}</td><td>${formatDate(d.expiryDate)}</td>`
              : `<td style="text-align:center;color:#d32f2f;">***</td>`}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const seaServiceHtml = sortedSeaService.length > 0 ? `
    <div class="section">
      <h2>${t('cv.sections.seaService')}</h2>
      <table>
        <thead><tr>
          <th>${t('seaService.form.vesselName')}</th>
          <th>${t('seaService.form.position')}</th>
          <th>${t('seaService.form.vesselType')}</th>
          <th>${t('seaService.form.signOn')}</th>
          <th>${t('seaService.form.signOff')}</th>
        </tr></thead>
        <tbody>
          ${sortedSeaService.map((s: any) => `<tr>
            <td>${s.vesselName || '-'}</td>
            <td>${s.position === 'Other' ? (s.customPosition || '-') : (s.position || '-')}</td>
            <td>${s.vesselType === 'Other' ? (s.customVesselType || '-') : (s.vesselType ? getVesselTypeLabel(s.vesselType) : '-')}</td>
            <td>${formatDate(s.signOn)}</td>
            <td>${formatDate(s.signOff)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const nextOfKinHtml = (nextOfKin && nextOfKin.name) ? `
    <div class="section">
      <h2>${t('nextOfKin.title')}</h2>
      <div class="info-row"><span class="info-label">${t('nextOfKin.fields.name')}:</span> ${nextOfKin.name}</div>
      ${isPremium ? `
        <div class="info-row"><span class="info-label">${t('nextOfKin.fields.relationship')}:</span> ${nextOfKin.relationship || '-'}</div>
        <div class="info-row"><span class="info-label">${t('nextOfKin.fields.phone')}:</span> ${nextOfKin.phone || '-'}</div>
        <div class="info-row"><span class="info-label">${t('nextOfKin.fields.email')}:</span> ${nextOfKin.email || '-'}</div>
      ` : `<div style="color:#d32f2f;font-size:10px;">Full details available in Unlimited version</div>`}
    </div>` : '';

  const educationInner = (education && (education.institution || education.degree)) ? `
    <h2>${t('education.title')}</h2>
    ${education.institution ? `<div class="info-row"><span class="info-label">${t('education.fields.institution')}:</span> ${education.institution}</div>` : ''}
    ${education.degree ? `<div class="info-row"><span class="info-label">${t('education.fields.degree')}:</span> ${education.degree}</div>` : ''}
    ${education.specialization ? `<div class="info-row"><span class="info-label">${t('education.fields.specialization')}:</span> ${education.specialization}</div>` : ''}
    ${education.graduationYear ? `<div class="info-row"><span class="info-label">${t('education.fields.graduationYear')}:</span> ${education.graduationYear}</div>` : ''}
    ${education.languages ? `<div class="info-row"><span class="info-label">${t('education.fields.languages')}:</span> ${education.languages}</div>` : ''}
    ${education.englishLevel ? `<div class="info-row"><span class="info-label">${t('education.fields.englishLevel')}:</span> ${education.englishLevel}</div>` : ''}
    ${education.additionalSkills ? `<div class="info-row"><span class="info-label">${t('education.fields.additionalSkills')}:</span> ${education.additionalSkills}</div>` : ''}` : '';

  const notesHtml = (includeNotesInCV && notes) ? `
    <div class="section">
      <h2>${t('notes.title')}</h2>
      <p style="font-size:10px;line-height:1.6;">${notes.split('\n').join('<br/>')}</p>
    </div>` : '';

  const contactQrCell = contactQrUrl ? `
    <div style="flex-shrink:0;text-align:center;width:120px;page-break-inside:avoid;">
      <img src="${contactQrUrl}" style="width:110px;height:110px;background:#fff;padding:4px;border:1px solid #e0e0e0;border-radius:6px;" alt="Contact QR" />
      <div style="font-size:8.5px;color:#777;font-style:italic;margin-top:5px;line-height:1.35;">${t('cv.scanContact')}</div>
    </div>` : '';

  const educationHtml = (educationInner || contactQrCell) ? `
    <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;page-break-inside:avoid;">
      <div style="flex:1;min-width:0;">${educationInner}</div>
      ${contactQrCell}
    </div>` : '';

  const personalDetails = `
    <div class="section">
      <h2>${t('personal.sections.personalDetails')}</h2>
      <div class="info-row"><span class="info-label">${t('personal.fields.dateOfBirth')}:</span> ${formatDate(personal.birthDate)}</div>
      <div class="info-row"><span class="info-label">${t('personal.fields.placeOfBirth')}:</span> ${personal.birthPlace || '-'}</div>
      <div class="info-row"><span class="info-label">${t('personal.fields.nationality')}:</span> ${personal.nationality || '-'}</div>
    </div>`;

  const contactInfo = `
    <div class="section">
      <h2>${t('personal.sections.contactInformation')}</h2>
      <div class="info-row"><span class="info-label">${t('personal.fields.phone')}:</span> ${personal.phone || '-'}</div>
      <div class="info-row"><span class="info-label">${t('personal.fields.email')}:</span> ${personal.email || '-'}</div>
      ${personal.whatsapp ? `<div class="info-row"><span class="info-label">${t('personal.fields.whatsapp')}:</span> ${personal.whatsapp}</div>` : ''}
      ${personal.address ? `<div class="info-row"><span class="info-label">${t('personal.fields.address')}:</span> ${[personal.address, personal.city, personal.country].filter(Boolean).join(', ')}</div>` : ''}
      ${personal.nearestAirport ? `<div class="info-row"><span class="info-label">${t('personal.fields.nearestAirport')}:</span> ${personal.nearestAirport}</div>` : ''}
    </div>`;

  const careerPrefs = `
    <div class="pref-box">
      <div class="pref-title">${t('personal.sections.careerPreferences')}</div>
      <div class="info-row"><span class="info-label">${t('seaService.form.vesselType')}:</span><span>${vesselTypeLine}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.minDayRate')}:</span><span>${dayRateLine}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.availabilityDate')}:</span><span>${personal.availabilityDate ? formatDate(personal.availabilityDate) : '-'}</span></div>
    </div>`;

  const hasPhysical = !!(biometrics && (biometrics.height || biometrics.weight || biometrics.shoeSize || biometrics.bloodType));

  return {
    personal, biometrics, fullName, positionLine, appQrUrl, contactQrUrl,
    documentsHtml, seaServiceHtml, nextOfKinHtml, educationInner, educationHtml,
    notesHtml, personalDetails, contactInfo, careerPrefs, contactQrCell, hasPhysical,
  };
};

// ── Base CSS shared by single-column layouts ─────────────────────────────────
const baseCss = (cfg: CvDesignConfig) => {
  const accent = cfg.accent;
  const fam = fontStack(cfg.font);
  const hCase = cfg.uppercaseHeadings ? 'uppercase' : 'none';
  const zebra = cfg.zebra ? `tr:nth-child(even) td { background: ${hexToRgba(accent, 0.05)}; }` : '';
  return `
    @page { size: A4; margin: 18mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${fam}; color: #2b2b2b; font-size: 11px; line-height: 1.45; }
    h1 { color: ${accent}; font-size: 24px; margin: 0 0 6px 0; letter-spacing: .3px; }
    h2 { color: ${accent}; font-size: 13.5px; margin: 18px 0 10px 0; text-transform: ${hCase};
         letter-spacing: .5px; page-break-inside: avoid; }
    .section { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: ${accent}; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; }
    td { border-bottom: 1px solid #e3e3e3; padding: 6px 8px; font-size: 10px; }
    ${zebra}
    .info-row { display: flex; margin-bottom: 5px; page-break-inside: avoid; }
    .info-label { font-weight: bold; width: 150px; flex-shrink: 0; color: #555; }
    .pref-box { background: ${hexToRgba(accent, 0.08)}; border-left: 4px solid ${accent}; padding: 10px 14px; margin-bottom: 14px; }
    .pref-title { color: ${accent}; font-weight: bold; font-size: 11px; margin-bottom: 6px; text-transform: ${hCase}; letter-spacing: .5px; }
    .app-qr { display: flex; align-items: center; margin-bottom: 12px; }
    .app-qr img { width: 46px; height: 46px; margin-right: 8px; }
    .app-qr span { font-size: 9px; color: #888; font-style: italic; }
    .photo { width: 130px; height: 168px; object-fit: cover; border-radius: 4px; }
  `;
};

const appQrRow = (b: any) => b.appQrUrl
  ? `<div class="app-qr"><img src="${b.appQrUrl}" alt="QR"/><span>Generated by Seafarer Documents Manager</span></div>`
  : '';

const sectionsBody = (b: any) =>
  `${b.seaServiceHtml}${b.documentsHtml}${b.educationHtml}${b.nextOfKinHtml}${b.notesHtml}`;

// ── Single-column layouts (classic / minimal / executive / banner) ───────────
const singleColumn = (b: any, cfg: CvDesignConfig): string => {
  const accent = cfg.accent;
  const photo = (cfg.showPhoto && b.personal.photo)
    ? `<img class="photo" src="${b.personal.photo}" style="float:right;margin-left:20px;"/>` : '';

  let header = '';
  let extraCss = '';

  if (cfg.layout === 'executive') {
    extraCss = `
      @page { margin: 0; }
      .top-bar { background: ${accent}; padding: 22px 18mm; display:flex; align-items:center; justify-content:space-between; page-break-inside:avoid; }
      .top-name { color:#fff; font-size:25px; font-weight:bold; letter-spacing:1px; }
      .top-position { color:${hexToRgba('#ffffff', 0.85)}; font-size:13px; font-style:italic; margin-top:4px; }
      .top-contact { color:${hexToRgba('#ffffff', 0.75)}; font-size:10px; margin-top:5px; }
      .top-photo { width:96px; height:124px; object-fit:cover; border:3px solid #fff; margin-left:20px; }
      .page { padding: 16mm 18mm; }
      h1 { display:none; }`;
    header = `
      <div class="top-bar">
        <div>
          <div class="top-name">${b.fullName}</div>
          ${b.positionLine ? `<div class="top-position">${b.positionLine}</div>` : ''}
          <div class="top-contact">
            ${b.personal.phone ? `${t('personal.fields.phone')}: ${b.personal.phone}` : ''}
            ${b.personal.phone && b.personal.email ? ' &nbsp;|&nbsp; ' : ''}
            ${b.personal.email ? `${t('personal.fields.email')}: ${b.personal.email}` : ''}
          </div>
        </div>
        ${(cfg.showPhoto && b.personal.photo) ? `<img class="top-photo" src="${b.personal.photo}"/>` : ''}
      </div>
      <div class="page">
        ${appQrRow(b)}
        ${b.careerPrefs}${b.personalDetails}${b.contactInfo}${sectionsBody(b)}
      </div>`;
    return page(cfg, extraCss, header, false);
  }

  if (cfg.layout === 'banner') {
    extraCss = `
      .banner { text-align:center; padding:18px 0 14px; border-top:4px solid ${accent}; border-bottom:1px solid ${hexToRgba(accent, 0.3)}; margin-bottom:16px; page-break-inside:avoid; }
      .banner h1 { color:${accent}; font-size:27px; letter-spacing:2px; margin:0; }
      .banner .pos { color:#666; font-size:13px; font-style:italic; margin-top:5px; }
      .banner .ct { color:#777; font-size:10px; margin-top:6px; }
      h2 { text-align:center; border:none; }
      h2:after { content:''; display:block; width:44px; height:3px; background:${accent}; margin:6px auto 0; }`;
    header = `
      ${appQrRow(b)}
      ${(cfg.showPhoto && b.personal.photo) ? `<div style="text-align:center;margin-bottom:10px;"><img class="photo" src="${b.personal.photo}"/></div>` : ''}
      <div class="banner">
        <h1>${b.fullName}</h1>
        ${b.positionLine ? `<div class="pos">${b.positionLine}</div>` : ''}
        <div class="ct">${[b.personal.phone && `${t('personal.fields.phone')}: ${b.personal.phone}`, b.personal.email && `${t('personal.fields.email')}: ${b.personal.email}`].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>
      </div>
      ${b.careerPrefs}${b.personalDetails}${b.contactInfo}${sectionsBody(b)}`;
    return page(cfg, extraCss, `<div class="wrap">${header}</div>`, false);
  }

  // classic & minimal
  if (cfg.layout === 'minimal') {
    extraCss = `
      h1 { font-weight:300; font-size:26px; letter-spacing:2px; }
      h2 { font-weight:600; font-size:12.5px; border-bottom:1px solid ${hexToRgba(accent, 0.35)}; padding-bottom:4px; }
      th { background:${hexToRgba(accent, 0.9)}; }`;
  } else {
    // classic
    extraCss = `
      h1 { border-bottom:2px solid ${accent}; padding-bottom:8px; }
      h2 { border-left:3px solid ${accent}; padding-left:8px; }`;
  }
  header = `
    ${appQrRow(b)}
    <div class="header" style="overflow:hidden;page-break-inside:avoid;margin-bottom:14px;">
      ${photo}
      <h1>${b.fullName}</h1>
      ${b.positionLine ? `<p style="font-size:14px;margin-top:5px;"><strong>${b.positionLine}</strong></p>` : ''}
      <div style="font-size:10px;color:#555;margin-top:6px;">
        ${[b.personal.phone && `${t('personal.fields.phone')}: ${b.personal.phone}`, b.personal.email && `${t('personal.fields.email')}: ${b.personal.email}`].filter(Boolean).join(' | ')}
      </div>
    </div>
    ${b.careerPrefs}${b.personalDetails}${b.contactInfo}${sectionsBody(b)}`;
  return page(cfg, extraCss, `<div class="wrap">${header}</div>`, false);
};

const page = (cfg: CvDesignConfig, extraCss: string, body: string, _sidebar: boolean): string =>
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${baseCss(cfg)}
    .wrap { }
    ${extraCss}
  </style></head><body>${body}</body></html>`;

// ── Sidebar layout (dark accent-tinted left column) ──────────────────────────
const sidebarLayout = (b: any, cfg: CvDesignConfig): string => {
  const accent = cfg.accent;
  const dark = '#12212f';
  const fam = fontStack(cfg.font);
  const hCase = cfg.uppercaseHeadings ? 'uppercase' : 'none';
  const zebra = cfg.zebra ? `tr:nth-child(even) td { background:${hexToRgba(accent, 0.05)}; }` : '';
  const bio = b.biometrics || {};

  const physicalHtml = b.hasPhysical ? `
    <div class="sb-section">
      <div class="sb-title">${t('cv.sections.physicalData')}</div>
      ${bio.height ? `<div class="sb-row"><span>${t('cv.fields.height')}:</span> ${bio.height}</div>` : ''}
      ${bio.weight ? `<div class="sb-row"><span>${t('cv.fields.weight')}:</span> ${bio.weight}</div>` : ''}
      ${bio.shoeSize ? `<div class="sb-row"><span>${t('cv.fields.shoeSize')}:</span> ${bio.shoeSize}</div>` : ''}
      ${bio.bloodType ? `<div class="sb-row"><span>${t('cv.fields.bloodType')}:</span> ${bio.bloodType}</div>` : ''}
    </div>` : '';

  const eduSidebar = b.educationInner ? `<div class="sb-section sb-edu">${b.educationInner}</div>` : '';
  const contactQrDark = b.contactQrUrl ? `
    <div class="sb-section" style="text-align:center;page-break-inside:avoid;">
      <img src="${b.contactQrUrl}" style="width:120px;height:120px;background:#fff;padding:6px;border-radius:8px;" alt="Contact QR"/>
      <div style="font-size:9px;color:#cfd3d6;margin-top:8px;line-height:1.4;">${t('cv.scanContact')}</div>
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fam}; color:#2b2b2b; font-size:11px; line-height:1.45; }
    .layout { display:flex; min-height:100vh; }
    .sidebar { width:34%; background:${dark}; color:#e8ecef; padding:20px 16px; }
    .sidebar .name { color:#fff; font-size:20px; font-weight:bold; line-height:1.2; }
    .sidebar .pos { color:${accent === dark ? '#7fd3e0' : accent}; filter:brightness(1.7); font-size:12px; font-style:italic; margin-top:5px; }
    .sb-photo { width:100%; max-width:150px; height:auto; border-radius:6px; margin:14px 0; border:3px solid ${hexToRgba(accent, 0.6)}; }
    .sb-section { margin-top:18px; }
    .sb-title { color:${accent}; filter:brightness(1.6); font-size:11px; font-weight:bold; text-transform:${hCase === 'none' ? 'uppercase' : hCase}; letter-spacing:1px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:5px; margin-bottom:8px; }
    .sb-row { font-size:10px; margin-bottom:4px; color:#cfd3d6; }
    .sb-row span { color:#9aa4ac; }
    .sb-edu h2 { color:${accent}; filter:brightness(1.6); font-size:11px; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px; }
    .sb-edu .info-row { display:block; font-size:10px; margin-bottom:3px; color:#cfd3d6; }
    .sb-edu .info-label { color:#9aa4ac; font-weight:bold; }
    .main { flex:1; padding:22px 20px; }
    .main h2 { color:${accent}; font-size:13.5px; text-transform:${hCase}; letter-spacing:.5px; border-left:3px solid ${accent}; padding-left:8px; margin:16px 0 10px; page-break-inside:avoid; }
    .main h2:first-child { margin-top:0; }
    .section { margin-bottom:14px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { background:${accent}; color:#fff; padding:6px 8px; text-align:left; font-size:10px; }
    td { border-bottom:1px solid #e3e3e3; padding:6px 8px; font-size:10px; }
    ${zebra}
    .info-row { display:flex; margin-bottom:5px; }
    .info-label { font-weight:bold; width:140px; flex-shrink:0; color:#555; }
    .app-qr { display:flex; align-items:center; margin-bottom:10px; }
    .app-qr img { width:40px; height:40px; margin-right:8px; }
    .app-qr span { font-size:8px; color:#888; font-style:italic; }
  </style></head><body>
    <div class="layout">
      <div class="sidebar">
        <div class="name">${b.fullName}</div>
        ${b.positionLine ? `<div class="pos">${b.positionLine}</div>` : ''}
        ${(cfg.showPhoto && b.personal.photo) ? `<img class="sb-photo" src="${b.personal.photo}"/>` : ''}
        <div class="sb-section">
          <div class="sb-title">${t('personal.sections.contactInformation')}</div>
          ${b.personal.phone ? `<div class="sb-row"><span>${t('personal.fields.phone')}:</span> ${b.personal.phone}</div>` : ''}
          ${b.personal.email ? `<div class="sb-row"><span>${t('personal.fields.email')}:</span> ${b.personal.email}</div>` : ''}
          ${b.personal.nationality ? `<div class="sb-row"><span>${t('personal.fields.nationality')}:</span> ${b.personal.nationality}</div>` : ''}
          ${b.personal.birthDate ? `<div class="sb-row"><span>${t('personal.fields.dateOfBirth')}:</span> ${formatDate(b.personal.birthDate)}</div>` : ''}
          ${b.personal.nearestAirport ? `<div class="sb-row"><span>${t('personal.fields.nearestAirport')}:</span> ${b.personal.nearestAirport}</div>` : ''}
        </div>
        ${physicalHtml}
        ${eduSidebar}
        ${contactQrDark}
      </div>
      <div class="main">
        ${appQrRow(b)}
        ${b.careerPrefs}
        ${b.seaServiceHtml}${b.documentsHtml}${b.nextOfKinHtml}${b.notesHtml}
      </div>
    </div>
  </body></html>`;
};

export const buildCvHtml = (state: any, isPremium: boolean, cfg: CvDesignConfig): string => {
  const b = buildBlocks(state, isPremium, cfg);
  if (cfg.layout === 'sidebar') return sidebarLayout(b, cfg);
  return singleColumn(b, cfg);
};
