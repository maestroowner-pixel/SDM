// Example data seeded on first launch (DataContext) so no screen starts empty; fully editable.
// One fictional seafarer that fills every screen (documents, sea service,
// personal, biometrics, education, next of kin, notes, DP and crane logs).
// DP and crane logs are filled but their tabs stay off until the user enables them.
// Dates are relative to "today" so the documents always show expired / expiring / valid states.
// Kept identical in the mobile app and SDM-Web (utils/sampleData.ts).
import type { AppState, DPDayRecord, DPSlotValue } from '../contexts/DataContext';

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const shift = (days: number, months = 0, years = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years, d.getMonth() + months, d.getDate() + days);
  return iso(d);
};

// 48 half-hour slots; each [from, to, value] range uses slot indexes (0 = 00:00, 47 = 23:30).
const day = (date: string, ranges: [number, number, DPSlotValue][]): DPDayRecord => {
  const slots = new Array<DPSlotValue>(48).fill(0);
  ranges.forEach(([from, to, v]) => { for (let i = from; i <= to; i++) slots[i] = v; });
  return { id: date, date, slots };
};

export const buildSampleData = (): Partial<AppState> => {
  const contractStart = shift(-40);
  const contractEnd = shift(50);

  const dpDays: DPDayRecord[] = [];
  const craneDays: DPDayRecord[] = [];
  for (let i = 14; i >= 1; i--) {
    const date = shift(-i);
    // Watches 08-12 / 20-24 with active DP on most days, passive at the end of each watch.
    dpDays.push(day(date, i % 3 === 0
      ? [[16, 21, 2], [40, 45, 2]]
      : [[16, 21, 1], [22, 23, 2], [40, 45, 1], [46, 47, 2]]));
    if (i % 2 === 0) craneDays.push(day(date, [[18, 22, 1], [28, 31, 1]]));
  }

  return {
    documents: [
      { id: 'sample-doc-1', category: 'Passport', name: 'International Passport', number: 'FA1234567', issueDate: shift(0, 0, -4), expiryDate: shift(0, 0, 6), noExpiryDate: false, issuePlace: 'Kyiv, Ukraine', notes: 'Sample: valid passport' },
      { id: 'sample-doc-2', category: "Seaman's Book", name: "Seaman's Identity Document", number: 'AB 0987654', issueDate: shift(0, 0, -3), expiryDate: shift(0, 2), noExpiryDate: false, issuePlace: 'Odesa, Ukraine', notes: 'Sample: expires within 3 months' },
      { id: 'sample-doc-3', category: 'Diplomas', name: 'Certificate of Competency — Chief Mate', number: 'COC-778812', issueDate: shift(0, 0, -2), expiryDate: shift(0, 0, 3), noExpiryDate: false, issuePlace: 'Maritime Administration', notes: 'STCW II/2' },
      { id: 'sample-doc-4', category: 'Diplomas', name: 'Navigation Officer Diploma', number: 'D-2010-5521', issueDate: '2010-06-30', expiryDate: '', noExpiryDate: true, issuePlace: 'Odesa Maritime Academy', notes: '' },
      { id: 'sample-doc-5', category: 'Medical Certificates', name: 'Medical Fitness Certificate', number: 'MED-44120', issueDate: shift(-350), expiryDate: shift(15), noExpiryDate: false, issuePlace: 'Clinic Port Health', notes: 'Sample: expires in 15 days' },
      { id: 'sample-doc-6', category: 'Medical Certificates', name: 'Yellow Fever Vaccination', number: 'YF-0021', issueDate: '2015-03-12', expiryDate: '', noExpiryDate: true, issuePlace: 'WHO Centre', notes: '' },
      { id: 'sample-doc-7', category: 'STCW Certificates', name: 'Basic Safety Training', number: 'BST-55120', issueDate: shift(0, 0, -5), expiryDate: shift(-20), noExpiryDate: false, issuePlace: 'Training Centre', notes: 'Sample: already expired' },
      { id: 'sample-doc-8', category: 'STCW Certificates', name: 'Advanced Fire Fighting', number: 'AFF-9912', issueDate: shift(0, 0, -1), expiryDate: shift(0, 0, 4), noExpiryDate: false, issuePlace: 'Training Centre', notes: '' },
      { id: 'sample-doc-9', category: 'Offshore Certifications', name: 'BOSIET with CA-EBS', number: 'OPITO-332211', issueDate: shift(0, 0, -2), expiryDate: shift(0, 0, 2), noExpiryDate: false, issuePlace: 'Aberdeen, UK', notes: '' },
      { id: 'sample-doc-10', category: 'Offshore Certifications', name: 'DP Unlimited Certificate (NI)', number: 'NI-DP-48210', issueDate: shift(0, 0, -3), expiryDate: shift(0, 0, 2), noExpiryDate: false, issuePlace: 'The Nautical Institute', notes: '' },
      { id: 'sample-doc-11', category: 'National Endorsements', name: 'Flag Endorsement — Marshall Islands', number: 'MI-77310', issueDate: shift(0, -6), expiryDate: shift(0, 4), noExpiryDate: false, issuePlace: 'RMI Maritime Administrator', notes: '' },
      { id: 'sample-doc-12', category: 'Other', name: 'Driving Licence', number: 'DL-1188', issueDate: '2012-09-01', expiryDate: shift(0, 0, 8), noExpiryDate: false, issuePlace: 'Kyiv', notes: '' },
    ],
    seaService: [
      {
        id: 'sample-ss-1', vesselName: 'Northern Sentinel', vesselType: 'Offshore Construction Vessel', flag: 'Norway', grossTonnage: '12450',
        engineType: 'Wärtsilä 6L32', enginePower: '14400 kW', propulsionType: 'Diesel-electric', sailingArea: 'North Sea',
        craneMake: 'Liebherr RL-K 4200', craneType: 'Offshore Pedestal Crane', craneSwl: '250',
        position: 'Chief Officer DPO', signOn: contractStart, signOff: '', company: 'Sample Offshore AS',
        dpClass: 'DP2', dpSystem: 'Kongsberg K-Pos', comments: 'Current contract (sample)', countForRevalidation: true,
      },
      {
        id: 'sample-ss-2', vesselName: 'Atlantic Pioneer', vesselType: 'Platform Supply', flag: 'United Kingdom', grossTonnage: '4300',
        engineType: 'Caterpillar 3516', enginePower: '6000 kW', propulsionType: 'Diesel-mechanical', sailingArea: 'North Sea',
        position: 'SDPO', signOn: shift(-120, -2, -1), signOff: shift(-120, 1, -1), company: 'Sample Marine Ltd',
        dpClass: 'DP2', dpSystem: 'Kongsberg K-Pos', comments: '', countForRevalidation: true,
      },
      {
        id: 'sample-ss-3', vesselName: 'Ocean Harmony', vesselType: 'Bulk Carrier', flag: 'Panama', grossTonnage: '43500',
        engineType: 'MAN B&W 6S50MC', enginePower: '9480 kW', sailingArea: 'Worldwide',
        position: 'Chief Officer', signOn: shift(0, -1, -3), signOff: shift(0, 4, -3), company: 'Sample Shipping Inc',
        dpClass: '', dpSystem: '', comments: 'Overlaps nothing; tests a non-DP record',
      },
      {
        id: 'sample-ss-4', vesselName: 'Blue Trader', vesselType: 'Container Ship', flag: 'Liberia', grossTonnage: '28000',
        engineType: 'Sulzer 7RTA62', enginePower: '19600 kW', teu: '2500', reeferPower: '400', sailingArea: 'Asia – Europe',
        position: 'Other', customPosition: '2nd Officer (custom)', signOn: shift(0, 2, -5), signOff: shift(0, 8, -5), company: 'Sample Lines',
        dpClass: '', dpSystem: '', comments: '',
      },
    ],
    personal: {
      firstName: 'John', lastName: 'Sample', middleName: 'Test', birthDate: '1985-04-12', birthPlace: 'Odesa', nationality: 'Ukrainian',
      phone: '+380 50 000 0001', mobilePhone2: '+47 900 00 001', mobilePhone3: '', email: 'john.sample@example.com',
      whatsapp: '+380500000001', telegram: '@john_sample', teams: 'john.sample@example.com',
      address: '1 Harbour Street, apt. 10', city: 'Odesa', country: 'Ukraine', postalCode: '65000',
      visaUSA: 'C1/D until 2029', visaSchengen: 'Multiple entry', visaAustralia: '',
      appliedPosition: 'Chief Officer DPO', customPosition: '', vesselType: 'Offshore Construction Vessel', customVesselType: '',
      minDayRate: '550', minDayRateCurrency: '$', isRateNegotiable: true, photo: '',
      nearestAirport: 'Odesa (ODS)', availabilityDate: contractEnd, lastCVGeneratedDate: '',
    },
    biometrics: { height: '182', weight: '84', shoeSize: '44', overallSize: 'L / 52', eyeColor: 'Brown', hairColor: 'Black', bloodType: 'A+' },
    education: {
      institution: 'Odesa National Maritime Academy', degree: 'Master of Navigation', specialization: 'Navigation and Ship Handling',
      graduationYear: '2008', additionalSkills: 'DP operations, crane operations, ECDIS (Transas, JRC), ISM/ISPS audits',
      languages: 'Ukrainian (native), Russian (fluent), English', englishLevel: 'Advanced',
    },
    nextOfKin: { name: 'Jane Sample', relationship: 'Wife', phone: '+380 50 000 0002', email: 'jane.sample@example.com', address: '1 Harbour Street, apt. 10, Odesa' },
    notes: 'Sample notes for testing.\n\n- Next medical due in 15 days\n- BST expired — book refresher\n- Prefers rotation 4/4 weeks',
    includeNotesInCV: true,
    dpInfo: {
      company: 'Sample Offshore AS', fullName: 'John Test Sample', dob: '1985-04-12', rank: 'Chief Officer DPO',
      vesselName: 'Northern Sentinel', grt: '12450', imo: '9876543', dpClass: 'DP2',
      contractStart, contractEnd, signatoryName: 'Peter Captain', signatoryRank: 'Master', companyContacts: 'crewing@example.com, +47 000 00 000',
    },
    dpDays,
    craneInfo: {
      company: 'Sample Offshore AS', vesselName: 'Northern Sentinel', imo: '9876543',
      craneMake: 'Liebherr RL-K 4200', craneType: 'Offshore Pedestal Crane', craneSwl: '250',
      contractStart, contractEnd, signatoryName: 'Peter Captain', signatoryRank: 'Master', companyContacts: 'crewing@example.com',
    },
    craneDays,
  };
};
