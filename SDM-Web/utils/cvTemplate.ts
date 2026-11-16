// CV design engine — config-driven HTML builder used by the CV "design
// constructor". Produces a print-ready A4 CV whose layout, accent colour, font,
// and feature toggles come from a CvDesignConfig.
import qrcode from 'qrcode-generator';
import { formatDate, allPhones } from './helpers';
import { t } from './i18n';
import { VESSEL_TYPES } from '../components/VesselTypeInput';
import { buildSeaServiceSection } from './cvSeaService';

export type CvLayout = 'classic' | 'minimal' | 'executive' | 'banner' | 'sidebar' | 'panels';

// Sections the user can show, hide and (where the layout allows) reorder.
export type CvSectionId =
  | 'career' | 'personal' | 'contact' | 'seaService' | 'documents'
  | 'education' | 'physical' | 'nextOfKin' | 'notes';

// Optional table columns. Vessel, position, sign on/off and the document name
// are the point of a CV, so they can't be hidden.
export type CvColumnId =
  | 'vesselType' | 'teu' | 'machinery' | 'area'
  | 'flag' | 'grossTonnage' | 'company' | 'dp' | 'crane' | 'comments'
  | 'docNumber' | 'docIssueDate' | 'docExpiryDate' | 'docIssuePlace';

// Fields only the panels layout prints; the document table has no room for them.
export const PANELS_ONLY_COLUMNS: CvColumnId[] = ['docIssuePlace'];

export interface CvDesignConfig {
  layout: CvLayout;
  accent: string;            // hex, e.g. '#1976d2'
  font: 'sans' | 'serif';
  showPhoto: boolean;
  showAppQr: boolean;        // app link QR in the header
  showContactQr: boolean;    // vCard QR
  uppercaseHeadings: boolean;
  zebra: boolean;            // striped tables
  sectionOrder: CvSectionId[];
  hiddenSections: CvSectionId[];
  hiddenColumns: CvColumnId[];
  // Records are excluded, not included, so a record added later appears in
  // every saved version until the user takes it out.
  excludedSeaService: string[];
  excludedDocuments: string[];
}

export const CV_LAYOUTS: { id: CvLayout; name: string }[] = [
  { id: 'classic',   name: 'Classic' },
  { id: 'minimal',   name: 'Minimal' },
  { id: 'executive', name: 'Executive' },
  { id: 'banner',    name: 'Banner' },
  { id: 'sidebar',   name: 'Sidebar' },
  { id: 'panels',    name: 'Panels' },
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
  sectionOrder: ['career', 'personal', 'contact', 'seaService', 'documents', 'education', 'physical', 'nextOfKin', 'notes'],
  hiddenSections: [],
  hiddenColumns: [],
  excludedSeaService: [],
  excludedDocuments: [],
};

// The sidebar layout places these in its left column at fixed positions, so
// they can be hidden there but not reordered.
const SIDEBAR_FIXED_SECTIONS: CvSectionId[] = ['personal', 'contact', 'education', 'physical'];

// Only the sidebar and panels layouts have a place for physical data.
export const cvSectionsForLayout = (layout: CvLayout, order: CvSectionId[]): CvSectionId[] =>
  order.filter(id => id !== 'physical' || layout === 'sidebar' || layout === 'panels');

export const isCvSectionMovable = (layout: CvLayout, id: CvSectionId): boolean =>
  layout !== 'sidebar' || !SIDEBAR_FIXED_SECTIONS.includes(id);

// Swaps a section with its neighbour among `rows`, the movable rows on screen.
export const moveCvSection = (
  order: CvSectionId[], id: CvSectionId, dir: -1 | 1, rows: CvSectionId[],
): CvSectionId[] => {
  const other = rows[rows.indexOf(id) + dir];
  if (!rows.includes(id) || !other) return order;
  return order.map(x => (x === id ? other : x === other ? id : x));
};

// Stored configs may predate a field or come from a newer build: fill the gaps,
// drop unknown ids, and keep any section the stored order doesn't know about.
export const normalizeCvConfig = (raw: any): CvDesignConfig => {
  const merged = { ...defaultCvConfig, ...(raw && typeof raw === 'object' ? raw : {}) };
  const list = (v: any): string[] => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
  const known = defaultCvConfig.sectionOrder;
  const order = list(merged.sectionOrder).filter((id, i, a) => known.includes(id as CvSectionId) && a.indexOf(id) === i) as CvSectionId[];
  return {
    ...merged,
    layout: CV_LAYOUTS.some(l => l.id === merged.layout) ? merged.layout : defaultCvConfig.layout,
    sectionOrder: [...order, ...known.filter(id => !order.includes(id))],
    hiddenSections: list(merged.hiddenSections) as CvSectionId[],
    hiddenColumns: list(merged.hiddenColumns) as CvColumnId[],
    excludedSeaService: list(merged.excludedSeaService),
    excludedDocuments: list(merged.excludedDocuments),
  };
};

const CV_QR_TARGET = 'https://sdm.kuka-soft.com';

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
  const hasContact = p?.firstName || p?.lastName || allPhones(p).length > 0 || p?.email;
  if (!hasContact) return '';
  const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  const telegramHandle = p.telegram ? (String(p.telegram).startsWith('@') ? p.telegram : `@${p.telegram}`) : '';
  const whatsappNumber = p.whatsapp ? String(p.whatsapp).replace(/\D/g, '') : '';
  return [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${p.lastName || ''};${p.firstName || ''};${p.middleName || ''};;`,
    `FN:${fullName}`,
    (title || p.appliedPosition) ? `TITLE:${title || p.appliedPosition}` : '',
    ...allPhones(p).map((n: string) => `TEL;TYPE=CELL:${n}`),
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

// Поле свободное: кто-то пишет «12000», кто-то «12000 kW», кто-то «2 × 5400 kW».
// Голое число без единицы в резюме читается плохо, поэтому к чистым числам
// дописываем kW; всё, где единица уже указана, оставляем как ввёл пользователь.
// Numeric fields are free text: someone types «12000», someone «12000 kW»,
// someone «2 × 5400 kW». A bare number reads badly in a CV, so the customary
// unit is appended to plain numbers only; anything else is kept as typed.
// Empty → '' so the parts can be joined into one cell.
const withUnit = (raw: string | undefined, unit: string): string => {
  const v = String(raw || '').trim();
  if (!v) return '';
  return /^[\d\s.,]+$/.test(v) ? `${v} ${unit}` : v;
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

export const sortDocumentsForCv = (documents: any[]): any[] => documents.slice().sort(
  (a: any, b: any) => (DOCUMENT_ORDER[a.category] || 10) - (DOCUMENT_ORDER[b.category] || 10)
);

export const sortSeaServiceForCv = (seaService: any[]): any[] => [...seaService].sort((a: any, b: any) => {
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

const fontStack = (font: 'sans' | 'serif') =>
  font === 'serif' ? `Georgia, 'Times New Roman', serif` : `Arial, Helvetica, sans-serif`;

// ── Shared, layout-independent content blocks ────────────────────────────────
const buildBlocks = (state: any, isPremium: boolean, cfg: CvDesignConfig) => {
  const { biometrics, seaService, documents, nextOfKin, notes, includeNotesInCV, education } = state;
  const isHidden = (id: CvSectionId) => cfg.hiddenSections.includes(id);
  const hasColumn = (id: CvColumnId) => !cfg.hiddenColumns.includes(id);
  // A hidden section must not leak through the page header, the sidebar or the
  // vCard QR, so its fields are blanked here rather than in each layout.
  const personal = {
    ...state.personal,
    ...(isHidden('personal') ? { birthDate: '', birthPlace: '', nationality: '' } : {}),
    ...(isHidden('contact') ? { email: '', whatsapp: '', address: '', nearestAirport: '' } : {}),
  };
  // Main phone plus the extra mobiles, e.g. «+380 50 111 22 33, +44 7700 900123».
  const phones = isHidden('contact') ? '' : allPhones(personal).join(', ');

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
  const contactQrUrl = (cfg.showContactQr && !isHidden('contact')) ? makeQrDataUrl(buildVCard(personal, positionLine)) : '';

  const sortedDocuments = isHidden('documents') ? [] : sortDocumentsForCv(
    documents.filter((d: any) => !cfg.excludedDocuments.includes(d.id))
  );
  const sortedSeaService = isHidden('seaService') ? [] : sortSeaServiceForCv(
    seaService.filter((s: any) => !cfg.excludedSeaService.includes(s.id))
  );

  const documentsHtml = sortedDocuments.length > 0 ? `
    <div class="section">
      <h2>${t('cv.sections.documents')}</h2>
      <table>
        <thead><tr>
          <th>${t('cv.table.document')}</th>
          ${isPremium
            ? `${hasColumn('docNumber') ? `<th>${t('cv.table.number')}</th>` : ''}${hasColumn('docIssueDate') ? `<th>${t('cv.table.issueDate')}</th>` : ''}${hasColumn('docExpiryDate') ? `<th>${t('cv.table.expiryDate')}</th>` : ''}`
            : `<th style="text-align:center;">Available in Unlimited version</th>`}
        </tr></thead>
        <tbody>
          ${sortedDocuments.map((d: any) => `<tr>
            <td>${wrapAfterFiveWords(d.name)}</td>
            ${isPremium
              ? `${hasColumn('docNumber') ? `<td>${d.number || '-'}</td>` : ''}${hasColumn('docIssueDate') ? `<td>${formatDate(d.issueDate)}</td>` : ''}${hasColumn('docExpiryDate') ? `<td>${formatDate(d.expiryDate)}</td>` : ''}`
              : `<td style="text-align:center;color:#d32f2f;">***</td>`}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  // Table for full-width layouts, one card per contract for the sidebar ones.
  const seaOpts = { accent: cfg.accent, zebra: cfg.zebra, hasColumn };
  const seaServiceHtml = buildSeaServiceSection(sortedSeaService, seaOpts);
  const voyageBlocksHtml = buildSeaServiceSection(sortedSeaService, { ...seaOpts, compact: true });

  const nextOfKinHtml = (!isHidden('nextOfKin') && nextOfKin && nextOfKin.name) ? `
    <div class="section">
      <h2>${t('nextOfKin.title')}</h2>
      <div class="info-row"><span class="info-label">${t('nextOfKin.fields.name')}:</span> ${nextOfKin.name}</div>
      ${isPremium ? `
        <div class="info-row"><span class="info-label">${t('nextOfKin.fields.relationship')}:</span> ${nextOfKin.relationship || '-'}</div>
        <div class="info-row"><span class="info-label">${t('nextOfKin.fields.phone')}:</span> ${nextOfKin.phone || '-'}</div>
        <div class="info-row"><span class="info-label">${t('nextOfKin.fields.email')}:</span> ${nextOfKin.email || '-'}</div>
      ` : `<div style="color:#d32f2f;font-size:10px;">Full details available in Unlimited version</div>`}
    </div>` : '';

  const educationInner = (!isHidden('education') && education && (education.institution || education.degree)) ? `
    <h2>${t('education.title')}</h2>
    ${education.institution ? `<div class="info-row"><span class="info-label">${t('education.fields.institution')}:</span> ${education.institution}</div>` : ''}
    ${education.degree ? `<div class="info-row"><span class="info-label">${t('education.fields.degree')}:</span> ${education.degree}</div>` : ''}
    ${education.specialization ? `<div class="info-row"><span class="info-label">${t('education.fields.specialization')}:</span> ${education.specialization}</div>` : ''}
    ${education.graduationYear ? `<div class="info-row"><span class="info-label">${t('education.fields.graduationYear')}:</span> ${education.graduationYear}</div>` : ''}
    ${education.languages ? `<div class="info-row"><span class="info-label">${t('education.fields.languages')}:</span> ${education.languages}</div>` : ''}
    ${education.englishLevel ? `<div class="info-row"><span class="info-label">${t('education.fields.englishLevel')}:</span> ${education.englishLevel}</div>` : ''}
    ${education.additionalSkills ? `<div class="info-row"><span class="info-label">${t('education.fields.additionalSkills')}:</span> ${education.additionalSkills}</div>` : ''}` : '';

  const notesHtml = (!isHidden('notes') && includeNotesInCV && notes) ? `
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

  const personalDetails = isHidden('personal') ? '' : `
    <div class="section">
      <h2>${t('personal.sections.personalDetails')}</h2>
      <div class="info-row"><span class="info-label">${t('personal.fields.dateOfBirth')}:</span> ${formatDate(personal.birthDate)}</div>
      <div class="info-row"><span class="info-label">${t('personal.fields.placeOfBirth')}:</span> ${personal.birthPlace || '-'}</div>
      <div class="info-row"><span class="info-label">${t('personal.fields.nationality')}:</span> ${personal.nationality || '-'}</div>
    </div>`;

  const contactInfo = isHidden('contact') ? '' : `
    <div class="section">
      <h2>${t('personal.sections.contactInformation')}</h2>
      <div class="info-row"><span class="info-label">${t('personal.fields.phone')}:</span> ${phones || '-'}</div>
      <div class="info-row"><span class="info-label">${t('personal.fields.email')}:</span> ${personal.email || '-'}</div>
      ${personal.whatsapp ? `<div class="info-row"><span class="info-label">${t('personal.fields.whatsapp')}:</span> ${personal.whatsapp}</div>` : ''}
      ${personal.address ? `<div class="info-row"><span class="info-label">${t('personal.fields.address')}:</span> ${[personal.address, personal.city, personal.country].filter(Boolean).join(', ')}</div>` : ''}
      ${personal.nearestAirport ? `<div class="info-row"><span class="info-label">${t('personal.fields.nearestAirport')}:</span> ${personal.nearestAirport}</div>` : ''}
    </div>`;

  const careerPrefs = isHidden('career') ? '' : `
    <div class="pref-box">
      <div class="pref-title">${t('personal.sections.careerPreferences')}</div>
      <div class="info-row"><span class="info-label">${t('seaService.form.vesselType')}:</span><span>${vesselTypeLine}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.minDayRate')}:</span><span>${dayRateLine}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.availabilityDate')}:</span><span>${personal.availabilityDate ? formatDate(personal.availabilityDate) : '-'}</span></div>
    </div>`;

  const hasPhysical = !isHidden('physical') && !!(biometrics && (biometrics.height || biometrics.weight || biometrics.shoeSize || biometrics.bloodType));

  return {
    personal, phones, biometrics, fullName, positionLine, appQrUrl, contactQrUrl,
    sortedSeaService, sortedDocuments, vesselTypeLine, dayRateLine,
    documentsHtml, seaServiceHtml, voyageBlocksHtml, nextOfKinHtml, educationInner, educationHtml,
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

// Joins the blocks a layout places in its body, in the user's section order.
const orderedBlocks = (cfg: CvDesignConfig, blocks: Partial<Record<CvSectionId, string>>) =>
  cfg.sectionOrder.map(id => blocks[id] || '').join('');

const sectionsBody = (b: any, cfg: CvDesignConfig) => orderedBlocks(cfg, {
  career: b.careerPrefs, personal: b.personalDetails, contact: b.contactInfo,
  seaService: b.seaServiceHtml, documents: b.documentsHtml, education: b.educationHtml,
  nextOfKin: b.nextOfKinHtml, notes: b.notesHtml,
});

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
            ${b.phones ? `${t('personal.fields.phone')}: ${b.phones}` : ''}
            ${b.phones && b.personal.email ? ' &nbsp;|&nbsp; ' : ''}
            ${b.personal.email ? `${t('personal.fields.email')}: ${b.personal.email}` : ''}
          </div>
        </div>
        ${(cfg.showPhoto && b.personal.photo) ? `<img class="top-photo" src="${b.personal.photo}"/>` : ''}
      </div>
      <div class="page">
        ${appQrRow(b)}
        ${sectionsBody(b, cfg)}
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
        <div class="ct">${[b.phones && `${t('personal.fields.phone')}: ${b.phones}`, b.personal.email && `${t('personal.fields.email')}: ${b.personal.email}`].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>
      </div>
      ${sectionsBody(b, cfg)}`;
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
        ${[b.phones && `${t('personal.fields.phone')}: ${b.phones}`, b.personal.email && `${t('personal.fields.email')}: ${b.personal.email}`].filter(Boolean).join(' | ')}
      </div>
    </div>
    ${sectionsBody(b, cfg)}`;
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
    .voyage { border-left:3px solid ${accent}; background:${hexToRgba(accent, 0.05)}; padding:6px 10px; margin-bottom:8px; page-break-inside:avoid; }
    .v-top { display:flex; justify-content:space-between; gap:8px; }
    .v-vessel { font-weight:bold; font-size:11.5px; }
    .v-dates { font-size:10px; color:#666; white-space:nowrap; }
    .v-pos { font-size:10.5px; margin-top:2px; }
    .v-sub { color:#777; }
    .v-line { font-size:10px; margin-top:3px; color:#333; }
    .v-label { color:#777; font-weight:bold; }
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
        ${(b.phones || b.personal.email || b.personal.nationality || b.personal.birthDate || b.personal.nearestAirport) ? `<div class="sb-section">
          <div class="sb-title">${t('personal.sections.contactInformation')}</div>
          ${b.phones ? `<div class="sb-row"><span>${t('personal.fields.phone')}:</span> ${b.phones}</div>` : ''}
          ${b.personal.email ? `<div class="sb-row"><span>${t('personal.fields.email')}:</span> ${b.personal.email}</div>` : ''}
          ${b.personal.nationality ? `<div class="sb-row"><span>${t('personal.fields.nationality')}:</span> ${b.personal.nationality}</div>` : ''}
          ${b.personal.birthDate ? `<div class="sb-row"><span>${t('personal.fields.dateOfBirth')}:</span> ${formatDate(b.personal.birthDate)}</div>` : ''}
          ${b.personal.nearestAirport ? `<div class="sb-row"><span>${t('personal.fields.nearestAirport')}:</span> ${b.personal.nearestAirport}</div>` : ''}
        </div>` : ''}
        ${physicalHtml}
        ${eduSidebar}
        ${contactQrDark}
      </div>
      <div class="main">
        ${appQrRow(b)}
        ${orderedBlocks(cfg, {
          career: b.careerPrefs, seaService: b.voyageBlocksHtml, documents: b.documentsHtml,
          nextOfKin: b.nextOfKinHtml, notes: b.notesHtml,
        })}
      </div>
    </div>
  </body></html>`;
};

// ── Panels layout (every section a card, every filled field shown) ───────────
// The other layouts trim records to fit a table row; this one prints the whole
// record. Values are escaped here because user text lands in the page as HTML.
const esc = (v: any): string => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escLines = (v: any): string => esc(String(v ?? '').trim()).split('\n').join('<br/>');

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
  const parts = [
    y ? `${y} ${t('seaService.years')}` : '',
    m ? `${m} ${t('seaService.months')}` : '',
    days ? `${days} ${t('seaService.days')}` : '',
  ].filter(Boolean);
  return parts.join(' ');
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

const panelsLayout = (state: any, b: any, isPremium: boolean, cfg: CvDesignConfig): string => {
  const accent = cfg.accent;
  const fam = fontStack(cfg.font);
  const hCase = cfg.uppercaseHeadings ? 'uppercase' : 'none';
  const isHidden = (id: CvSectionId) => cfg.hiddenSections.includes(id);
  const hasColumn = (id: CvColumnId) => !cfg.hiddenColumns.includes(id);
  const p = b.personal;

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

  const career = isHidden('career') ? '' : panel(t('personal.sections.careerPreferences'), rows([
    [t('personal.fields.appliedPosition'), esc(b.positionLine)],
    [t('personal.fields.vesselType'), esc(b.vesselTypeLine)],
    [t('personal.fields.minDayRate'), esc(String(b.dayRateLine).trim())],
    [t('personal.fields.availabilityDate'), p.availabilityDate ? formatDate(p.availabilityDate) : ''],
  ]));

  const personalPanel = isHidden('personal') ? '' : panel(t('personal.sections.personalDetails'), rows([
    [t('personal.fields.dateOfBirth'), p.birthDate ? formatDate(p.birthDate) : ''],
    [t('personal.fields.placeOfBirth'), esc(p.birthPlace)],
    [t('personal.fields.nationality'), esc(p.nationality)],
  ]));

  const address = [p.address, p.city, p.postalCode, p.country].map(v => String(v || '').trim()).filter(Boolean).join(', ');
  const telegram = p.telegram ? (String(p.telegram).startsWith('@') ? p.telegram : `@${p.telegram}`) : '';
  const contactRows = isHidden('contact') ? '' : rows([
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
      ${b.contactQrUrl ? `<div class="cqr"><img src="${b.contactQrUrl}" alt="Contact QR"/><div>${esc(t('cv.scanContact'))}</div></div>` : ''}
    </div>` : '');

  const bio = b.biometrics || {};
  const physical = isHidden('physical') ? '' : panel(t('cv.sections.physicalData'), rows([
    [t('biometrics.fields.height'), withUnit(esc(bio.height), 'cm')],
    [t('biometrics.fields.weight'), withUnit(esc(bio.weight), 'kg')],
    [t('biometrics.fields.shoeSize'), esc(bio.shoeSize)],
    [t('biometrics.fields.overallSize'), esc(bio.overallSize)],
    [t('biometrics.fields.eyeColor'), esc(colourLabel('eyeColors', bio.eyeColor))],
    [t('biometrics.fields.hairColor'), esc(colourLabel('hairColors', bio.hairColor))],
    [t('biometrics.fields.bloodType'), esc(bio.bloodType)],
  ]));

  const edu = state.education || {};
  const education = isHidden('education') ? '' : panel(t('education.title'), rows([
    [t('education.fields.institution'), esc(edu.institution)],
    [t('education.fields.degree'), esc(edu.degree)],
    [t('education.fields.specialization'), esc(edu.specialization)],
    [t('education.fields.graduationYear'), esc(edu.graduationYear)],
    [t('education.fields.languages'), esc(edu.languages)],
    [t('education.fields.additionalSkills'), escLines(edu.additionalSkills)],
  ]));

  const nok = state.nextOfKin || {};
  const nextOfKin = (isHidden('nextOfKin') || !nok.name) ? '' : panel(t('nextOfKin.title'), isPremium
    ? rows([
      [t('nextOfKin.fields.name'), esc(nok.name)],
      [t('nextOfKin.fields.relationship'), esc(nok.relationship)],
      [t('nextOfKin.fields.phone'), esc(nok.phone)],
      [t('nextOfKin.fields.email'), esc(nok.email)],
      [t('nextOfKin.fields.address'), esc(nok.address)],
    ])
    : `${rows([[t('nextOfKin.fields.name'), esc(nok.name)]])}<div class="locked">Full details available in Unlimited version</div>`);

  // Sea service: one card per contract with every filled field.
  const contracts: any[] = b.sortedSeaService;
  let totalMonths = 0;
  let totalDays = 0;
  const contractCards = contracts.map((s: any) => {
    const span = monthsAndDays(s.signOn, s.signOff);
    totalMonths += span.months;
    totalDays += span.days;
    const position = s.position === 'Other' ? (s.customPosition || '') : (s.position || '');
    const vesselType = s.vesselType === 'Other' ? (s.customVesselType || '') : (s.vesselType ? getVesselTypeLabel(s.vesselType) : '');
    const facts = rows([
      ...(hasColumn('flag') ? [[t('seaService.form.flag'), esc(s.flag)]] : []),
      ...(hasColumn('grossTonnage') ? [[t('seaService.form.grt'), esc(s.grossTonnage)]] : []),
      ...(hasColumn('teu') ? [[t('cv.table.teu'), esc(s.teu)]] : []),
      ...(hasColumn('machinery') ? [
        [t('seaService.form.engineType'), esc(s.engineType)],
        [t('seaService.form.enginePower'), withUnit(esc(s.enginePower), 'kW')],
        [t('seaService.form.propulsionType'), esc(s.propulsionType)],
        [t('seaService.form.reeferPower'), withUnit(esc(s.reeferPower), 'kW')],
      ] : []),
      ...(hasColumn('dp') ? [[t('seaService.form.dpClass'), esc(s.dpClass)], [t('seaService.form.dpSystemName'), esc(s.dpSystem)]] : []),
      ...(hasColumn('crane') ? [
        [t('seaService.form.craneMake'), esc(s.craneMake)],
        [t('seaService.form.craneType'), esc(s.craneType)],
        [t('seaService.form.craneSwl'), withUnit(esc(s.craneSwl), 't')],
      ] : []),
      ...(hasColumn('area') ? [[t('seaService.form.sailingArea'), esc(s.sailingArea)]] : []),
    ] as [string, string][]);
    const duration = formatSpan(span.months, span.days);
    return `
      <div class="contract">
        <div class="c-top">
          <div><span class="c-vessel">${esc(s.vesselName) || '-'}</span>${hasColumn('vesselType') && vesselType ? `<span class="tag">${esc(vesselType)}</span>` : ''}</div>
          <div class="c-dates">${formatDate(s.signOn)} — ${formatDate(s.signOff)}${duration ? `<div class="c-dur">${esc(duration)}</div>` : ''}</div>
        </div>
        <div class="c-pos">${esc(position) || '-'}${hasColumn('company') && s.company ? ` <span class="c-co">· ${esc(s.company)}</span>` : ''}</div>
        ${facts ? `<div class="facts">${facts}</div>` : ''}
        ${hasColumn('comments') && String(s.comments || '').trim() ? `<div class="c-note">${escLines(s.comments)}</div>` : ''}
      </div>`;
  }).join('');
  totalMonths += Math.floor(totalDays / 30);
  const total = formatSpan(totalMonths, totalDays % 30);
  const seaService = panel(t('cv.sections.seaService'), contractCards, true,
    total ? `<span class="badge">${esc(t('seaService.totalTime'))}: ${esc(total)}</span>` : '');

  // Documents grouped by category, already in CV order.
  const docs: any[] = b.sortedDocuments;
  const groups: { category: string; items: any[] }[] = [];
  docs.forEach(d => {
    const cat = d.category || 'Uncategorized';
    const last = groups[groups.length - 1];
    if (last && last.category === cat) last.items.push(d); else groups.push({ category: cat, items: [d] });
  });
  const docCols: [CvColumnId, string, (d: any) => string][] = [
    ['docNumber', t('cv.table.number'), d => esc(d.number) || '-'],
    ['docIssueDate', t('cv.table.issueDate'), d => formatDate(d.issueDate)],
    ['docExpiryDate', t('cv.table.expiryDate'), d => d.noExpiryDate ? esc(t('documents.form.noExpiryDate')) : formatDate(d.expiryDate)],
    ['docIssuePlace', t('documents.form.issuePlace'), d => esc(d.issuePlace) || '-'],
  ];
  const shownCols = docCols.filter(([id]) => hasColumn(id));
  const documentsBody = groups.map(g => `
    <div class="doc-group">
      <div class="doc-cat">${esc(t(`documents.categories.${CATEGORY_KEYS[g.category] || 'other'}`))} <span>${g.items.length}</span></div>
      <table class="docs">
        <thead><tr><th>${esc(t('cv.table.document'))}</th>${isPremium
          ? shownCols.map(([, label]) => `<th>${esc(label)}</th>`).join('')
          : '<th style="text-align:center;">Available in Unlimited version</th>'}</tr></thead>
        <tbody>${g.items.map(d => `<tr><td class="d-name">${esc(d.name)}</td>${isPremium
          ? shownCols.map(([, , cell]) => `<td>${cell(d)}</td>`).join('')
          : '<td style="text-align:center;color:#d32f2f;">***</td>'}</tr>`).join('')}</tbody>
      </table>
    </div>`).join('');
  const documentsPanel = panel(t('cv.sections.documents'), documentsBody, true,
    docs.length ? `<span class="badge">${docs.length}</span>` : '');

  const notes = (!isHidden('notes') && state.includeNotesInCV && state.notes)
    ? panel(t('notes.title'), `<p class="notes">${escLines(state.notes)}</p>`, true) : '';

  const contacts = [b.phones, p.email].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  const hero = `
    <header class="hero">
      ${(cfg.showPhoto && p.photo) ? `<img class="h-photo" src="${esc(p.photo)}" alt=""/>` : ''}
      <div class="h-main">
        <h1>${esc(b.fullName)}</h1>
        ${b.positionLine ? `<div class="h-pos">${esc(b.positionLine)}</div>` : ''}
        ${contacts ? `<div class="h-ct">${contacts}</div>` : ''}
      </div>
      ${b.appQrUrl ? `<div class="h-qr"><img src="${b.appQrUrl}" alt="QR"/><span>Seafarer Documents Manager</span></div>` : ''}
    </header>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fam}; color:#2b2b2b; font-size:10.5px; line-height:1.45; background:#fff; }
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
    .panel { border:1px solid ${hexToRgba(accent, 0.25)}; border-top:3px solid ${accent}; border-radius:8px; padding:9px 12px 10px; background:#fff; page-break-inside:avoid; break-inside:avoid; }
    .panel.wide { grid-column:1 / -1; page-break-inside:auto; break-inside:auto; }
    .p-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; page-break-after:avoid; break-after:avoid; }
    h2 { color:${accent}; font-size:12.5px; letter-spacing:.4px; text-transform:${hCase}; }
    .badge { background:${hexToRgba(accent, 0.12)}; color:${accent}; font-weight:bold; font-size:9.5px; border-radius:10px; padding:2px 9px; white-space:nowrap; }
    .kv { display:flex; gap:8px; padding:3px 0; border-bottom:1px dotted #e3e3e3; }
    .kv:last-child { border-bottom:none; }
    .k { color:#777; width:42%; flex-shrink:0; }
    .v { font-weight:600; min-width:0; overflow-wrap:anywhere; }
    .contact { display:flex; gap:10px; align-items:flex-start; }
    .contact-rows { flex:1; min-width:0; }
    .cqr { width:92px; text-align:center; flex-shrink:0; font-size:7.5px; color:#777; font-style:italic; line-height:1.3; }
    .cqr img { width:86px; height:86px; padding:3px; border:1px solid #e0e0e0; border-radius:6px; display:block; margin-bottom:3px; }
    .locked { color:#d32f2f; font-size:9.5px; margin-top:4px; }
    .contract { border:1px solid #e6e6e6; border-left:3px solid ${accent}; border-radius:6px; padding:7px 10px; margin-bottom:7px; page-break-inside:avoid; break-inside:avoid; ${cfg.zebra ? `background:${hexToRgba(accent, 0.03)};` : ''} }
    .contract:last-child { margin-bottom:0; }
    .c-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .c-vessel { font-weight:bold; font-size:12px; }
    .tag { display:inline-block; margin-left:7px; font-size:9px; color:${accent}; border:1px solid ${hexToRgba(accent, 0.4)}; border-radius:9px; padding:0 7px; vertical-align:1px; }
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
    th { background:${hexToRgba(accent, 0.12)}; color:${accent}; text-align:left; font-size:9px; padding:4px 7px; }
    td { padding:4px 7px; border-bottom:1px solid #eee; font-size:9.5px; }
    td:not(.d-name) { white-space:nowrap; }
    /* Same column widths in every category, so the groups line up. */
    table.docs { table-layout:fixed; }
    table.docs th:first-child { width:${isPremium && shownCols.length ? Math.max(30, 100 - shownCols.length * 16) : 50}%; }
    table.docs td { overflow:hidden; text-overflow:ellipsis; }
    table.docs td.d-name { overflow-wrap:anywhere; }
    ${cfg.zebra ? `tr:nth-child(even) td { background:${hexToRgba(accent, 0.04)}; }` : ''}
    .notes { line-height:1.6; }
  </style></head><body>
    ${hero}
    <div class="grid">
      ${orderedBlocks(cfg, {
        career, personal: personalPanel, contact, seaService, documents: documentsPanel,
        education, physical, nextOfKin, notes,
      })}
    </div>
  </body></html>`;
};

export const buildCvHtml = (state: any, isPremium: boolean, cfg: CvDesignConfig): string => {
  const b = buildBlocks(state, isPremium, cfg);
  if (cfg.layout === 'sidebar') return sidebarLayout(b, cfg);
  if (cfg.layout === 'panels') return panelsLayout(state, b, isPremium, cfg);
  return singleColumn(b, cfg);
};
