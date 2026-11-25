// ===================================
// Scan → fill (prototype, branch ocr-prototype, 2026-11-23).
// Text is recognised on the phone (expo-text-extractor: Apple Vision on iOS, ML Kit
// via Play Services on Android). Nothing leaves the device and nothing costs money per scan.
// This file only turns the recognised lines into form fields. Every guess is shown to the
// seafarer in the form, so a wrong guess costs one correction, not a wrong record.
// ===================================

import { extractTextFromImage, isSupported } from 'expo-text-extractor';

export interface DocGuess {
  category?: string;
  name?: string;
  number?: string;
  issueDate?: string;  // yyyy-mm-dd
  expiryDate?: string; // yyyy-mm-dd
  noExpiry?: boolean;  // "Valid until: unlimited"
}

export const ocrSupported = (): boolean => {
  try { return !!isSupported; } catch { return false; }
};

export const recogniseLines = async (uri: string): Promise<string[]> => {
  const raw = await extractTextFromImage(uri);
  // Vision returns lines, ML Kit returns blocks that may hold several lines.
  return raw.flatMap(s => s.split(/\r?\n/)).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
};

// ---------- dates ----------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

const toIso = (y: number, m: number, d: number): string | null => {
  if (y < 100) y += y >= 70 ? 1900 : 2000;
  if (y < 1950 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null; // 31.02 etc.
  return `${y}-${pad(m)}-${pad(d)}`;
};

interface FoundDate { iso: string; line: number; index: number; }

const DATE_RES: { re: RegExp; parse: (m: RegExpExecArray) => string | null }[] = [
  // 2025-03-14
  { re: /\b(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/g, parse: m => toIso(+m[1], +m[2], +m[3]) },
  // 14.03.2025, 14/03/25. Day first, unless the "month" is over 12 (then it was US order).
  {
    re: /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})\b/g,
    parse: m => (+m[2] > 12 ? toIso(+m[3], +m[1], +m[2]) : toIso(+m[3], +m[2], +m[1])),
  },
  // 14 MAR 2025, 14-Mar-2025, 14 March 2025
  {
    re: /\b(\d{1,2})[\s.\-\/]*([A-Za-z]{3,9})[\s.,\-\/]*(\d{4})\b/g,
    parse: m => { const mo = MONTHS[m[2].slice(0, 3).toLowerCase()] ?? MONTHS[m[2].slice(0, 4).toLowerCase()]; return mo ? toIso(+m[3], mo, +m[1]) : null; },
  },
  // March 14, 2025
  {
    re: /\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g,
    parse: m => { const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; return mo ? toIso(+m[3], mo, +m[2]) : null; },
  },
];

const findDates = (lines: string[]): FoundDate[] => {
  const out: FoundDate[] = [];
  lines.forEach((text, line) => {
    const taken: [number, number][] = [];
    for (const { re, parse } of DATE_RES) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const s = m.index, e = s + m[0].length;
        if (taken.some(([a, b]) => s < b && e > a)) continue;
        const iso = parse(m);
        if (iso) { out.push({ iso, line, index: s }); taken.push([s, e]); }
      }
    }
  });
  return out;
};

const EXPIRY_RE = /(expir|valid\s*(until|till|to|thru|through)|validity|until|действ\w*\s*до|срок\s*действ|дійсн\w*\s*до|термін\s*дії|gültig\s*bis|ważn\w*\s*do)/i;
const ISSUE_RE = /(date\s*of\s*issue|issue\s*date|issued\s*(on|date)?|date\s*issued|дата\s*выдачи|выдан|дата\s*видачі|видан|ausstellungs|data\s*wydania)/i;
const UNLIMITED_RE = /(unlimited|indefinite|no\s*expir|not\s*limited|without\s*limit|permanent|безстроков|бессрочн|без\s*обмеж|без\s*ограничен|unbefristet|bezterminow)/i;
const BIRTH_RE = /(birth|рожд|народж|geburt|urodz)/i;

type Kind = 'issue' | 'expiry' | 'birth' | null;

const labelOf = (text: string): Kind => {
  // The label nearest the date wins, so test the tail of the text first.
  const tail = text.slice(-40);
  for (const s of [tail, text]) {
    if (BIRTH_RE.test(s)) return 'birth';
    if (EXPIRY_RE.test(s)) return 'expiry';
    if (ISSUE_RE.test(s)) return 'issue';
  }
  return null;
};

const kindOf = (d: FoundDate, lines: string[]): Kind => {
  const before = lines[d.line].slice(0, d.index);
  const own = labelOf(before);
  if (own) return own;
  // "Date of expiry" on one line and the date under it.
  if (!before.replace(/[^A-Za-zА-Яа-я]/g, '') && d.line > 0) return labelOf(lines[d.line - 1]);
  return null;
};

// ---------- number ----------

const NUMBER_LABEL = /(?:certificate|cert\.?|document|doc\.?|passport|book|licen[cs]e|registration|reg\.?|serial|ref\.?)?\s*(?:\bno\b\.?|\bnr\b\.?|n[º°]\.?|\bn[e29gо](?=\s*\d)|\bn(?=\s+\d)|number|num\.?|№|#|номер|н-р)\s*[:.\-]?\s*/i;
const NUMBER_TOKEN = /^[A-ZА-Я0-9][A-ZА-Я0-9\-\/ ]{2,24}/i;

const cleanNumber = (s: string): string | null => {
  const m = s.match(NUMBER_TOKEN);
  if (!m) return null;
  // Stop at the next word that is a label, not part of the number.
  const v = m[0].split(/\s{2,}| (?=[A-Za-zА-Яа-я]{4,})/)[0].trim().replace(/[\s\-\/]+$/, '');
  if (v.length < 3 || !/\d/.test(v)) return null;
  // OCR splits digit runs: "39 19" → "3919". Spaces between a letter series and digits stay.
  return v.replace(/(\d)\s*([\/\-])\s*(?=\d)/g, '$1$2').replace(/(\d)\s+(?=\d)/g, '$1');
};

const findNumber = (lines: string[]): string | undefined => {
  // A label alone on its line ("Certificate ID", "Certificate No."): the value is under or above it.
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*(certificate|document|cert\.?)\s*(id|no\.?|number|№)\s*:?\s*$/i.test(lines[i])) continue;
    const v = [lines[i + 1], lines[i - 1]].map(l => (l && /^[A-Z0-9][A-Z0-9\-\/ ]{3,24}$/i.test(l.trim()) ? cleanNumber(l.trim()) : null)).find(Boolean);
    if (v) return v;
  }
  for (let i = 0; i < lines.length; i++) {
    const m = NUMBER_LABEL.exec(lines[i]);
    if (!m || !/(no|nr|n[º°]|n|number|num|№|#|номер|н-р)/i.test(m[0])) continue;
    const rest = lines[i].slice(m.index + m[0].length);
    const v = cleanNumber(rest) ?? (rest.trim() === '' && lines[i + 1] ? cleanNumber(lines[i + 1]) : null);
    if (v) return v;
  }
  return undefined;
};

// ---------- MRZ (passports, seafarer ID cards) ----------

const mrzDate = (s: string, future: boolean): string | undefined => {
  if (!/^\d{6}$/.test(s)) return undefined;
  const yy = +s.slice(0, 2);
  const nowYY = new Date().getFullYear() % 100;
  const y = future ? 2000 + yy : (yy > nowYY ? 1900 + yy : 2000 + yy);
  return toIso(y, +s.slice(2, 4), +s.slice(4, 6)) ?? undefined;
};

const parseMrz = (lines: string[]): DocGuess | null => {
  const mrz = lines
    .map(l => l.replace(/\s/g, '').toUpperCase().replace(/«/g, '<<'))
    .filter(l => /^[A-Z0-9<]{28,46}$/.test(l) && l.includes('<'));
  if (mrz.length < 2) return null;

  // TD3 (passport): 2 × 44. Line 2: number 0–8, expiry 21–26.
  const l2 = mrz.find(l => l.length >= 42 && /^[A-Z0-9<]{9}\d[A-Z<]{3}\d{6}/.test(l));
  if (l2) {
    const first = mrz.find(l => l !== l2 && l.startsWith('P')) || '';
    return {
      number: l2.slice(0, 9).replace(/</g, '') || undefined,
      expiryDate: mrzDate(l2.slice(21, 27), true),
      ...(first ? { category: 'Passport', name: 'Passport' } : {}),
    };
  }
  // TD1 (ID card): 3 × 30. Line 1: number 5–13. Line 2: expiry 8–13.
  const t1 = mrz.find(l => l.length >= 28 && l.length <= 32 && /^[AIC][A-Z<][A-Z<]{3}/.test(l));
  const t2 = t1 ? mrz[mrz.indexOf(t1) + 1] : undefined;
  if (t1 && t2) {
    return { number: t1.slice(5, 14).replace(/</g, '') || undefined, expiryDate: mrzDate(t2.slice(8, 14), true) };
  }
  return null;
};

// ---------- document type ----------

// Tested in order. `title: true` rules look only at the header (first lines), where the
// document says what it is; body text mentions other documents ("…як зазначено у
// підтвердженні", "…certificate of competency") and must not decide the type.
const TYPES: { re: RegExp; category: string; name: string; title?: boolean }[] = [
  { re: /seafarer'?s?\s*identity|SID\b|seam[ae]n'?s?\s*identi(ty|fication)\s*(card|document)|посвідчення\s*(особи\s*)?моряка|удостоверение\s*(личности\s*)?моряка/i, category: "Seaman's Book", name: "Seafarer's Identity Document" },
  { re: /seam[ae]n'?s?\s*(book|discharge)|seafarer'?s?\s*(record\s*)?book|seagoing\s*record|discharge\s*book|послужн/i, category: "Seaman's Book", name: "Seaman's Book" },
  { re: /passport|паспорт/i, category: 'Passport', name: 'Passport' },
  { re: /bachelor|бакалавр/i, category: 'Diplomas', name: "Bachelor's Diploma", title: true },
  { re: /master'?s\s*(degree|diploma)|магістр|магистр/i, category: 'Diplomas', name: "Master's Diploma", title: true },
  { re: /endorsement|^\s*(підтвердження|подтверждение)\s*$/im, category: 'National Endorsements', name: 'Endorsement', title: true },
  // A CoP is an STCW certificate even when its title says "medical care" or "medical first aid".
  { re: /certificate\s*of\s*proficiency|свідоцтво\s*фахівця|свидетельство\s*специалиста|свідоцтво\s*про\s*(кваліфікацію|підготовку)|свидетельство\s*о\s*(квалификации|подготовке)/i, category: 'STCW Certificates', name: '' },
  { re: /medical\s*(certificate|fitness|examination)|health\s*certificate|fit\s*for\s*(sea\s*)?duty|медицинск\w*\s*(справк|свидетельств|сертификат)|медичн\w*\s*(довідк|свідоцтв|сертифікат)/i, category: 'Medical Certificates', name: 'Medical Certificate' },
  { re: /certificate\s*of\s*competen|^\s*(диплом|diploma)\s*$/im, category: 'Diplomas', name: 'Certificate of Competency', title: true },
  { re: /certificate\s*of\s*competen|диплом\s*(капітана|штурмана|помічника|механіка|оператора)/i, category: 'Diplomas', name: 'Certificate of Competency' },
  { re: /BOSIET|HUET|FOET|GWO|OPITO/i, category: 'Offshore Certifications', name: '' },
  { re: /basic\s*safety|survival\s*craft|fire\s*fighting|first\s*aid|security\s*awareness|ship\s*security|tanker|ECDIS|GMDSS|proficiency|STCW|ПДНВ|ПДМНВ/i, category: 'STCW Certificates', name: '' },
];

// The capacity line of a CoC: "Chief mate on ships of 500 gross tonnage or more".
const CAPACITY_RE = /^[«"]?(master|chief\s*mate|chief\s*officer|officer\s*in\s*charge|second\s*mate|third\s*mate|chief\s*engineer|second\s*engineer|third\s*engineer|electro[\s-]*technical\s*officer|ETO\b|ratings?\s*forming|able\s*seafarer|general\s*operator|restricted\s*operator|капітан\b|капитан\b|штурман\b|вахтовий\s*помічник|старший\s*помічник|старший\s*помощник|старший\s*механік|старший\s*механик|загальний\s*оператор|обмежений\s*оператор|общий\s*оператор)/i;

// "Старший помічник капітана суден валовою місткістю…" → "Старший помічник капітана".
const trimCapacity = (s: string) => s.replace(/^[«"]/, '').replace(/\s+/g, ' ').replace(/\s+(суден|судов|on\s+(sea-?going\s+)?ships|of\s+ships|on\s+a\s+ship)(?=\s|$).*$/i, '').trim();

// No capacity line? The STCW regulation tells the level: "правила II/2" → master / chief mate.
const REG_CAPACITY: [RegExp, string][] = [
  [/\bII\s*\/\s*1\b/, 'Officer in charge of a navigational watch (II/1)'],
  [/\bII\s*\/\s*2\b/, 'Master / Chief mate (II/2)'],
  [/\bII\s*\/\s*3\b/, 'Officer / Master, ships under 500 GT (II/3)'],
  [/\bIII\s*\/\s*1\b/, 'Officer in charge of an engineering watch (III/1)'],
  [/\bIII\s*\/\s*2\b/, 'Chief / Second engineer (III/2)'],
  [/\bIII\s*\/\s*6\b/, 'Electro-technical officer (III/6)'],
  [/\bIV\s*\/\s*2\b/, 'GMDSS radio operator (IV/2)'],
];
const capacityFromRegulation = (all: string) => REG_CAPACITY.find(([re]) => re.test(all))?.[1];

const OFFSHORE_NAMES = ['BOSIET', 'HUET', 'FOET', 'GWO'];

const HEAD = 10; // lines that count as the header

const KEEP_UPPER = /^(ECDIS|GMDSS|ARPA|BRM|ERM|STCW|IMO|ISM|ISPS|SSO|CSO|DPA|FRC|PSSR|PSCRB|AIS|GOC|ROC|LNG|LPG|IGF|HV|OOW|UKR|II|III|IV|VI|VII|ГМЗЛБ|ПДНВ|ЕКНІС)$/i;

// "THE OPERATIONAL USE OF ECDIS" → "The Operational Use of ECDIS";
// Cyrillic → sentence case ("Ознайомлення, початкова підготовка…").
const niceCase = (s: string): string => {
  s = s.replace(/\s+/g, ' ').trim();
  const letters = s.replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ]/g, '');
  if (!letters || letters !== letters.toUpperCase()) return s;
  const cyr = /[А-Яа-яІіЇїЄєҐґ]/.test(letters);
  const small = /^(in|of|for|on|as|and|the|to|by|at|with|a|an|or)$/i;
  return s.split(' ').map((w, i) => {
    const core = w.replace(/[^\wА-Яа-яІіЇїЄєҐґ]/g, '');
    if (KEEP_UPPER.test(core)) return w;
    const lw = w.toLowerCase();
    if (cyr) return i === 0 ? lw.charAt(0).toUpperCase() + lw.slice(1) : lw;
    if (i > 0 && small.test(core)) return lw;
    return lw.replace(/^([^a-z]*)([a-z])/, (_m, p, c) => p + c.toUpperCase());
  }).join(' ');
};

const isCapsLine = (l: string): boolean => {
  const letters = l.replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ]/g, '');
  if (letters.length < 5) return false;
  const up = letters.replace(/[^A-ZА-ЯІЇЄҐ]/g, '').length;
  return up / letters.length >= 0.8;
};

// Lines that are never a course title even when printed in capitals.
const NOT_TITLE = /certif|свідоцтв|свидетельств|convention|конвенц|ukraine|україн|украин|training\s*cent|навчальн|учебн|товариств|LLC|ISO\s*\d|bureau|veritas|issued|видано|выдано|date|дата|^this\s|^цим\s|^has\s/i;

// The course name usually follows "…on the syllabus", "has successfully completed",
// "Успішно закінчив курс підготовки…", either quoted or as the next line(s) in capitals.
const ANCHOR_RE = /(syllabus|successfully\s+completed|satisfactorily\s+completed|has\s+completed|completed\s+the\s+(training|course)|course\s+of\s+training|training\s+course|пройшов\s+підготовку|пройшла\s+підготовку|прошел\s+подготовку|за\s+курсом|закінчив\s+курс|закінчила\s+курс|пройшов\s+курс|пройшла\s+курс|прошел\s+курс|прошла\s+курс|курс\s+підготовки|курс\s+подготовки|за\s+програмою)/i;

// Bilingual certificates (Ukrainian + English) give two titles: prefer the English one.
const courseTitle = (lines: string[]): string | undefined => {
  const found: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = titleAt(lines, i);
    if (t) found.push(t);
  }
  return found.find(t => /[A-Za-z]{3}/.test(t) && !/[А-Яа-яІіЇїЄєҐґ]/.test(t)) || found[0];
};

const titleAt = (lines: string[], i: number): string | undefined => {
  {
    if (!ANCHOR_RE.test(lines[i])) return undefined;
    // Quoted: …on the syllabus "PERSONAL SAFETY AND SOCIAL RESPONSIBILITIES" based on…
    const two = `${lines[i]} ${lines[i + 1] || ''}`;
    const q = two.match(/["«“]([^"»”]{6,90})["»”]/);
    if (q && !NOT_TITLE.test(q[1])) return niceCase(q[1]);
    // Capitals within the next few lines; a title may run over two or three lines.
    for (let j = i + 1; j <= i + 4 && j < lines.length; j++) {
      if (!isCapsLine(lines[j]) || NOT_TITLE.test(lines[j])) continue;
      const parts = [lines[j]];
      for (let k = j + 1; k < j + 3 && k < lines.length && isCapsLine(lines[k]) && !NOT_TITLE.test(lines[k]); k++) parts.push(lines[k]);
      return niceCase(parts.join(' '));
    }
    // "has successfully completed" / "Wärtsilä NaviSailor 4000 by Transas"
    const next = lines[i + 1] || '';
    if (/(completed|syllabus|course)\s*:?\s*$/i.test(lines[i]) && next.length >= 6 && next.length <= 70 && !/^[a-zа-яії]/.test(next) && !NOT_TITLE.test(next)) {
      return next.replace(/\s+/g, ' ').trim();
    }
  }
  return undefined;
};

const guessType = (lines: string[]): Pick<DocGuess, 'category' | 'name'> => {
  const head = lines.slice(0, HEAD).join('\n');
  const all = lines.join('\n');
  // Header first: what the document calls itself beats what its body mentions.
  const t = TYPES.find(x => x.re.test(head)) || TYPES.find(x => !x.title && x.re.test(all));
  if (!t) return {};

  let name = t.name;
  if (t.category === 'Offshore Certifications') name = OFFSHORE_NAMES.find(n => all.toUpperCase().includes(n)) || '';
  if (t.category === 'STCW Certificates') {
    // "CERTIFICATE OF PROFICIENCY" / "IN MEDICAL CARE": title continues on the next line(s).
    const i = lines.findIndex(l => /certificate\s*of\s*proficiency/i.test(l) && l.length <= 80);
    let cop = '';
    if (i >= 0) {
      const rest = lines[i].replace(/^.*certificate\s*of\s*proficiency/i, '').replace(/(n[º°oe2]|№|#)\s*\S+.*$/i, '').trim();
      if (/^(in|for|as|on)\b/i.test(rest)) cop = `Certificate of Proficiency ${rest}`;
      else {
        const cont = lines.slice(i + 1, i + 3).find(l => /^(in|for|as|on)\b/i.test(l) && l.length <= 60);
        if (cont) cop = `Certificate of Proficiency ${cont}`;
      }
    }
    const course = cop ? '' : courseTitle(lines);
    if (!cop && !course && i >= 0) {
      // Last resort: the title's second line (often another colour) read as a separate block.
      const far = lines.find(l => /^(IN|FOR|AS|ON)\s+[A-Z][A-Z\s\-&,']{3,55}$/.test(l));
      if (far) cop = `Certificate of Proficiency ${far}`;
    }
    name = cop ? niceCase(cop).replace(/^certificate of proficiency/i, 'Certificate of Proficiency') : (course || '');
    if (cop) {
      // niceCase keeps mixed-case input as is; tidy "IN MEDICAL CARE" when only the tail was caps.
      name = name.replace(/ (IN|FOR|AS|ON) ([A-Z][A-Z\s\-&,']+)$/, (_m, p, r) => ` ${p.toLowerCase()} ${niceCase(r)}`);
    }
  }
  if (t.category === 'Diplomas' && t.name === 'Certificate of Competency') {
    const cap = lines.find(l => CAPACITY_RE.test(l) && l.length <= 90)
      || lines.map(l => l.match(/звання\s+([А-ЯІЇЄҐ][а-яіїєґ'’]+(?:\s+[а-яіїєґ'’]+){0,3})/)?.[1]).find(Boolean);
    const capName = cap ? trimCapacity(cap) : capacityFromRegulation(lines.slice(0, 15).join(' '));
    if (capName) name = `${name} — ${capName}`;
  }
  if (t.category === 'National Endorsements') {
    const cap = lines.find(l => CAPACITY_RE.test(l) && l.length <= 90);
    if (cap) name = `${name} — ${trimCapacity(cap)}`;
  }
  return { category: t.category, name: name || undefined };
};

// ---------- Latin only ----------
// Scan → fill writes Latin text only. Whoever wants Cyrillic types it by hand.

const CYR = /[А-Яа-яІіЇїЄєҐґЁё]/;

// Cyrillic letters that look like Latin ones, common in document series ("АВ 571113").
const LOOKALIKE: Record<string, string> = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', І: 'I', У: 'Y',
  а: 'a', е: 'e', к: 'k', м: 'm', о: 'o', р: 'p', с: 'c', т: 't', х: 'x', і: 'i', у: 'y',
};

const CAPACITY_EN: [RegExp, string][] = [
  [/^старш\S*\s+поміч\S*|^старш\S*\s+помощ\S*/i, 'Chief Mate'],
  [/^вахт\S*\s+поміч\S*|^вахт\S*\s+помощ\S*|^штурман/i, 'Officer in charge of a navigational watch'],
  [/^капітан|^капитан/i, 'Master'],
  [/^старш\S*\s+механ/i, 'Chief Engineer'],
  [/^друг\S*\s+механ|^втор\S*\s+механ/i, 'Second Engineer'],
  [/^вахт\S*\s+механ/i, 'Officer in charge of an engineering watch'],
  [/^електромеханік|^электромеханик/i, 'Electro-technical Officer'],
  [/^загальн\S*\s+оператор|^общ\S*\s+оператор/i, 'GMDSS General Operator'],
  [/^обмежен\S*\s+оператор|^ограничен\S*\s+оператор/i, 'GMDSS Restricted Operator'],
];

const latinOnly = (g: DocGuess): DocGuess => {
  if (g.number && CYR.test(g.number)) {
    const n = g.number.replace(/[А-Яа-яІіЇїЄєҐґЁё]/g, c => LOOKALIKE[c] ?? c);
    if (CYR.test(n)) delete g.number; else g.number = n;
  }
  if (g.name && CYR.test(g.name)) {
    // "Certificate of Competency — Старший помічник капітана": translate the capacity part.
    const [base, cap] = g.name.split(' — ');
    const capEn = cap && (CYR.test(cap) ? CAPACITY_EN.find(([re]) => re.test(cap.trim()))?.[1] : cap);
    if (!CYR.test(base)) g.name = capEn ? `${base} — ${capEn}` : base;
    else delete g.name;
  }
  return g;
};

// ---------- all together ----------

export const parseDocText = (lines: string[]): DocGuess => {
  const guess: DocGuess = { ...guessType(lines) };

  const dates = findDates(lines);
  const labelled = dates.map(d => ({ ...d, kind: kindOf(d, lines) }));
  guess.expiryDate = labelled.find(d => d.kind === 'expiry')?.iso;
  guess.issueDate = labelled.find(d => d.kind === 'issue')?.iso;

  // No labels: drop birth dates and anything older than 15 years (that is a birth date,
  // not a document still in use), then the latest past date is the issue date and the
  // latest date after it is the expiry.
  if (!guess.issueDate || !guess.expiryDate) {
    const today = new Date().toISOString().slice(0, 10);
    const floor = `${new Date().getFullYear() - 15}-01-01`;
    const free = labelled
      .filter(d => d.kind === null && d.iso >= floor && d.iso !== guess.issueDate && d.iso !== guess.expiryDate)
      .map(d => d.iso)
      .sort();
    if (!guess.issueDate) {
      const past = free.filter(d => d <= today && (!guess.expiryDate || d < guess.expiryDate));
      guess.issueDate = past[past.length - 1];
    }
    if (!guess.expiryDate) {
      const later = free.filter(d => !guess.issueDate || d > guess.issueDate);
      const exp = later[later.length - 1];
      if (exp && (exp > today || guess.issueDate)) guess.expiryDate = exp;
    }
  }

  guess.number = findNumber(lines);

  const mrz = parseMrz(lines);
  if (mrz) {
    // The MRZ is machine-printed with check digits, so it beats the visual zone.
    if (mrz.number) guess.number = mrz.number;
    if (mrz.expiryDate) guess.expiryDate = mrz.expiryDate;
    if (mrz.category) { guess.category = mrz.category; guess.name = guess.name || mrz.name; }
  }

  if (guess.issueDate && guess.expiryDate && guess.issueDate >= guess.expiryDate) delete guess.issueDate;

  // "Valid until: Unlimited", "Термін дії: безстроковий" — no expiry at all.
  const unlimited = lines.findIndex((l, i) => UNLIMITED_RE.test(l) && (EXPIRY_RE.test(l) || (i > 0 && EXPIRY_RE.test(lines[i - 1]))));
  if (unlimited >= 0 && !mrz?.expiryDate) {
    guess.noExpiry = true;
    delete guess.expiryDate;
  }
  return latinOnly(guess);
};
