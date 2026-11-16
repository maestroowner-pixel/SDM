// Sea service section of the table and sidebar CV layouts — the part a crewing
// manager reads first. Every filled field of a contract is printed: vessel facts
// under the name, DP under the rank, duration under the dates, comments in a row
// of their own. The section opens with sea time totals by rank and vessel type,
// so even records with only name, rank and dates give a full picture.
// Kept identical in the mobile app and SDM Web (utils/cvSeaService.ts in both).
import { formatDate } from './helpers';
import { t } from './i18n';
import { VESSEL_TYPES } from '../components/VesselTypeInput';

export type SeaColumn =
  | 'vesselType' | 'teu' | 'machinery' | 'area'
  | 'flag' | 'grossTonnage' | 'company' | 'dp' | 'crane' | 'comments';

export interface SeaSectionOptions {
  accent: string;
  zebra?: boolean;
  // Card per contract instead of a table: sidebar layouts leave the main column
  // ~⅔ of A4, too narrow for a table.
  compact?: boolean;
  hasColumn?: (id: SeaColumn) => boolean;
}

// User text lands in the page as HTML.
const esc = (v: any): string => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const str = (v: any): string => String(v ?? '').trim();

// Bare numbers get the customary unit; anything else is kept as typed.
const withUnit = (raw: any, unit: string): string => {
  const v = str(raw);
  if (!v) return '';
  return /^[\d\s.,]+$/.test(v) ? `${v} ${unit}` : v;
};

const rgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = (i: number) => parseInt(full.slice(i, i + 2), 16) || 0;
  return `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${alpha})`;
};

const vesselTypeOf = (s: any): string => s.vesselType === 'Other'
  ? str(s.customVesselType)
  : (s.vesselType ? (VESSEL_TYPES.find(v => v.value === s.vesselType)?.label || s.vesselType) : '');
const positionOf = (s: any): string => str(s.position === 'Other' ? s.customPosition : s.position);

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

// Sums like the sea service screen: days roll over into months at 30.
const addSpan = (a: { months: number; days: number }, b: { months: number; days: number }) => {
  const days = a.days + b.days;
  return { months: a.months + b.months + Math.floor(days / 30), days: days % 30 };
};

const shortSpan = ({ months, days }: { months: number; days: number }): string => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [
    y ? `${y} ${t('cv.table.yShort')}` : '',
    m ? `${m} ${t('cv.table.mShort')}` : '',
    days ? `${days} ${t('cv.table.dShort')}` : '',
  ].filter(Boolean).join(' ');
};

const machinery = (s: any): string => {
  const reefer = withUnit(s.reeferPower, 'kW');
  return [
    str(s.engineType),
    withUnit(s.enginePower, 'kW'),
    str(s.propulsionType),
    reefer ? `${t('cv.table.reefer')} ${reefer}` : '',
  ].filter(Boolean).join(' · ');
};

export const buildSeaServiceSection = (records: any[], opts: SeaSectionOptions): string => {
  if (!records.length) return '';
  const { accent, zebra = false, compact = false } = opts;
  const has = opts.hasColumn || (() => true);

  const rows = records.map((s: any) => {
    const span = monthsAndDays(s.signOn, s.signOff);
    const grt = str(s.grossTonnage);
    return {
      s,
      span,
      vessel: str(s.vesselName),
      position: positionOf(s),
      type: has('vesselType') ? vesselTypeOf(s) : '',
      facts: [
        has('flag') ? str(s.flag) : '',
        has('grossTonnage') && grt ? `${t('seaService.form.grt')} ${grt}` : '',
        has('teu') ? withUnit(s.teu, 'TEU') : '',
      ].filter(Boolean),
      company: has('company') ? str(s.company) : '',
      // Labelled: a bare «DP2 · K-Pos» under the rank is easy to miss.
      dp: has('dp') ? [
        str(s.dpClass) ? `${t('seaService.form.dpClass')}: ${str(s.dpClass)}` : '',
        str(s.dpSystem) ? `${t('seaService.form.dpSystemName')}: ${str(s.dpSystem)}` : '',
      ].filter(Boolean).join(' · ') : '',
      // «Crane: Liebherr RL-K 4200 · Offshore Pedestal Crane · SWL 250 t»
      crane: has('crane') ? (() => {
        const parts = [str(s.craneMake), str(s.craneType), withUnit(s.craneSwl, 't') ? `SWL ${withUnit(s.craneSwl, 't')}` : ''].filter(Boolean);
        return parts.length ? `${t('cv.table.crane')}: ${parts.join(' · ')}` : '';
      })() : '',
      mach: has('machinery') ? machinery(s) : '',
      area: has('area') ? str(s.sailingArea) : '',
      note: has('comments') ? str(s.comments) : '',
    };
  });

  // ── Totals: overall, by rank, by vessel type ───────────────────────────────
  const zero = { months: 0, days: 0 };
  const total = rows.reduce((acc, r) => addSpan(acc, r.span), zero);
  const tally = (key: (r: typeof rows[number]) => string) => {
    const map = new Map<string, { months: number; days: number }>();
    rows.forEach(r => {
      const k = key(r);
      if (!k || (!r.span.months && !r.span.days)) return;
      map.set(k, addSpan(map.get(k) || zero, r.span));
    });
    return [...map.entries()]
      .sort((a, b) => (b[1].months * 30 + b[1].days) - (a[1].months * 30 + a[1].days))
      .map(([k, v]) => `<span class="ss-chip">${esc(k)} <b>${esc(shortSpan(v))}</b></span>`)
      .join('');
  };
  const byRank = tally(r => r.position);
  const byType = has('vesselType') ? tally(r => r.type) : '';
  const totalText = shortSpan(total);
  const summary = `
    <div class="ss-sum">
      <div class="ss-total">${totalText ? `<span class="ss-k">${esc(t('seaService.totalTime'))}</span> <b>${esc(totalText)}</b> · ` : ''}${rows.length} ${esc(t('cv.table.contracts'))}</div>
      ${byRank ? `<div class="ss-row"><span class="ss-k">${esc(t('seaService.form.position'))}</span>${byRank}</div>` : ''}
      ${byType ? `<div class="ss-row"><span class="ss-k">${esc(t('seaService.form.vesselType'))}</span>${byType}</div>` : ''}
    </div>`;

  const period = (r: typeof rows[number]) => {
    const dur = shortSpan(r.span);
    return `${formatDate(r.s.signOn)} — ${formatDate(r.s.signOff)}${dur ? `<div class="ss-dur">${esc(dur)}</div>` : ''}`;
  };
  const noteHtml = (note: string) => esc(note).split('\n').join('<br/>');

  const style = `
    <style>
      .ss-sum { border:1px solid ${rgba(accent, 0.25)}; background:${rgba(accent, 0.05)}; border-radius:5px; padding:6px 9px; margin:0 0 8px; font-size:9.5px; page-break-inside:avoid; }
      .ss-total { font-size:10.5px; margin-bottom:2px; }
      .ss-total b { color:${accent}; }
      .ss-row { margin-top:3px; line-height:1.9; }
      .ss-k { color:#777; font-size:8.5px; text-transform:uppercase; letter-spacing:.4px; margin-right:6px; }
      .ss-chip { display:inline-block; border:1px solid ${rgba(accent, 0.3)}; border-radius:9px; padding:0 7px; margin:0 4px 0 0; line-height:15px; white-space:nowrap; background:#fff; }
      .ss-chip b { color:${accent}; font-weight:600; }
      table.ss { width:100%; border-collapse:collapse; }
      table.ss td { vertical-align:top; background:none; }
      table.ss tbody { page-break-inside:avoid; break-inside:avoid; }
      ${zebra ? `table.ss tbody:nth-of-type(even) td { background:${rgba(accent, 0.05)}; }` : ''}
      table.ss tr.ss-main.ss-has-note td { border-bottom:none; }
      .ss-v { font-weight:700; }
      .ss-sub { color:#666; font-size:8.5px; margin-top:1px; }
      .ss-dp { color:${accent}; font-size:8.5px; font-weight:600; margin-top:1px; }
      .ss-co { color:#444; font-size:8.5px; font-style:italic; margin-top:1px; }
      .ss-dur { color:${accent}; font-weight:600; font-size:9px; margin-top:2px; }
      td.ss-per { white-space:nowrap; }
      .ss-note { color:#555; font-size:8.5px; font-style:italic; }
      .ss-note b { font-style:normal; color:#777; }
      .ss-card { border-left:3px solid ${accent}; background:${rgba(accent, 0.05)}; padding:5px 9px; margin-bottom:7px; page-break-inside:avoid; break-inside:avoid; font-size:10px; }
      .ss-top { display:flex; justify-content:space-between; gap:8px; }
      .ss-top .ss-dates { text-align:right; white-space:nowrap; font-size:9px; color:#555; }
      .ss-card .ss-note { margin-top:2px; }
    </style>`;

  if (compact) {
    const cards = rows.map(r => {
      const sub = [r.type, r.company].filter(Boolean).map(esc).join(' · ');
      const facts = [...r.facts, r.mach, r.area].filter(Boolean).map(esc).join(' · ');
      return `
      <div class="ss-card">
        <div class="ss-top"><span class="ss-v">${esc(r.vessel) || '-'}</span><span class="ss-dates">${period(r)}</span></div>
        <div>${esc(r.position) || '-'}${sub ? ` <span class="ss-sub">· ${sub}</span>` : ''}</div>
        ${r.dp ? `<div class="ss-dp">${esc(r.dp)}</div>` : ''}
        ${r.crane ? `<div class="ss-dp">${esc(r.crane)}</div>` : ''}
        ${facts ? `<div class="ss-sub">${facts}</div>` : ''}
        ${r.note ? `<div class="ss-note">${noteHtml(r.note)}</div>` : ''}
      </div>`;
    }).join('');
    return `${style}
    <div class="section">
      <h2>${t('cv.sections.seaService')}</h2>
      ${summary}
      ${cards}
    </div>`;
  }

  // Machinery and area are separate columns only when someone filled them in;
  // a deck officer's CV keeps the short table.
  const showMach = rows.some(r => r.mach);
  const showArea = rows.some(r => r.area);
  const colCount = 3 + (showMach ? 1 : 0) + (showArea ? 1 : 0);
  const body = rows.map(r => {
    const sub = [r.type, ...r.facts].filter(Boolean).map(esc).join(' · ');
    return `
        <tbody>
          <tr class="ss-main${r.note ? ' ss-has-note' : ''}">
            <td><div class="ss-v">${esc(r.vessel) || '-'}</div>${sub ? `<div class="ss-sub">${sub}</div>` : ''}${r.company ? `<div class="ss-co">${esc(r.company)}</div>` : ''}</td>
            <td>${esc(r.position) || '-'}${r.dp ? `<div class="ss-dp">${esc(r.dp)}</div>` : ''}${r.crane ? `<div class="ss-dp">${esc(r.crane)}</div>` : ''}</td>
            ${showMach ? `<td>${esc(r.mach) || '-'}</td>` : ''}
            ${showArea ? `<td>${esc(r.area) || '-'}</td>` : ''}
            <td class="ss-per">${period(r)}</td>
          </tr>
          ${r.note ? `<tr><td colspan="${colCount}" class="ss-note"><b>${esc(t('seaService.form.comments'))}:</b> ${noteHtml(r.note)}</td></tr>` : ''}
        </tbody>`;
  }).join('');

  return `${style}
    <div class="section">
      <h2>${t('cv.sections.seaService')}</h2>
      ${summary}
      <table class="ss">
        <thead><tr>
          <th>${t('seaService.form.vesselName')}</th>
          <th>${t('seaService.form.position')}</th>
          ${showMach ? `<th>${t('cv.table.machinery')}</th>` : ''}
          ${showArea ? `<th>${t('cv.table.area')}</th>` : ''}
          <th>${t('cv.table.period')}</th>
        </tr></thead>
        ${body}
      </table>
    </div>`;
};
