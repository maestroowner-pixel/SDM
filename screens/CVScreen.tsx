import React, { useState, useEffect } from 'react'; 
import { StyleSheet, View, Text, ScrollView, Alert, Image, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useData } from '../contexts/DataContext'; 
import { Button } from '../components/Button';
import { formatDate, formatDateForFilename } from '../utils/helpers';
import { VESSEL_TYPES } from '../components/VesselTypeInput';
import { Ionicons } from '@expo/vector-icons';
import { playSuccessSound } from '../utils/sound';
import { t } from '../utils/i18n';
import { useSubscription } from '../hooks/useSubscription';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО

const GHOST_ROSE_IMAGE = require('../assets/images/ghost-rose.png');

const getVesselTypeLabel = (value: string): string => {
  const found = VESSEL_TYPES.find(t => t.value === value);
  return found ? found.label : value;
};

const wrapAfterFiveWords = (text: string): string => {
  if (!text) return '';
  const words = text.split(' ');
  if (words.length <= 5) return text;
  const firstLine = words.slice(0, 5).join(' ');
  const secondLine = words.slice(5).join(' ');
  return `${firstLine}<br/>${secondLine}`;
};

const DOCUMENT_ORDER: Record<string, number> = {
  'Passport': 1,
  "Seaman's Book": 2,
  'Medical Certificates': 3,
  'Diplomas': 4,
  'STCW Certificates': 5,
  'National Endorsements': 6,
  'Offshore Certifications': 7,
  'Other': 8,
  'Uncategorized': 9,
};

const CV_DESIGNS = [
  { id: 1, name: 'Classic',   accent: '#1976d2', bg: '#e3f0fb' },
  { id: 2, name: 'Executive', accent: '#002147', bg: '#e8edf2' },
  { id: 3, name: 'Minimal',   accent: '#00796b', bg: '#e0f2f1' },
  { id: 4, name: 'Offshore',  accent: '#e23a2e', bg: '#ececee' },
] as const;

export const CVScreen: React.FC<{ onDisableSwipe?: () => void }> = ({ onDisableSwipe }) => {
  const { state, updatePersonal } = useData();
  const { isPremium } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [cvDesign, setCvDesign] = useState<1|2|3|4>(1);
  const isDark = state.theme === 'dark';
  const isTablet = useTablet();

  const [lastGeneratedDate, setLastGeneratedDate] = useState(state.personal.lastCVGeneratedDate || '');

  useEffect(() => {
    if (state.personal.lastCVGeneratedDate && state.personal.lastCVGeneratedDate !== lastGeneratedDate) {
      setLastGeneratedDate(state.personal.lastCVGeneratedDate);
    }
  }, [state.personal.lastCVGeneratedDate]);

  const generateHTML = (design: 1|2|3|4 = 1) => {
    const { personal, biometrics, seaService, documents, nextOfKin, notes, includeNotesInCV, education } = state;

    const fullName = [personal.firstName, personal.middleName, personal.lastName]
      .filter(Boolean).join(' ') || t('cv.defaultName');

    const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://sdm.free.nf";

    const photoHtml = personal.photo ? `
      <div style="float: right; margin-left: 20px; margin-bottom: 10px;">
        <img src="${personal.photo}" style="width: 140px; height: 180px; object-fit: cover; border-radius: 4px;" />
      </div>` : '';

    // ── Документы ────────────────────────────────────────────────────────────
    const sortedDocuments = documents.slice().sort((a, b) => {
      const orderA = DOCUMENT_ORDER[a.category] || 10;
      const orderB = DOCUMENT_ORDER[b.category] || 10;
      return orderA - orderB;
    });

    const documentsHtml = sortedDocuments.length > 0 ? `
      <div class="section">
        <h2>${t('cv.sections.documents')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('cv.table.document')}</th>
              ${isPremium ? `
                <th>${t('cv.table.number')}</th>
                <th>${t('cv.table.issueDate')}</th>
                <th>${t('cv.table.expiryDate')}</th>
              ` : `<th style="text-align:center;color:#d32f2f;">Available in Unlimited version</th>`}
            </tr>
          </thead>
          <tbody>
            ${sortedDocuments.map(d => `
            <tr>
              <td>${wrapAfterFiveWords(d.name)}</td>
              ${isPremium ? `
                <td>${d.number || '-'}</td>
                <td>${formatDate(d.issueDate)}</td>
                <td>${formatDate(d.expiryDate)}</td>
              ` : `<td style="text-align:center;color:#d32f2f;">***</td>`}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '';

    // ── Морской стаж ──────────────────────────────────────────────────────────
    const sortedSeaService = [...seaService].sort((a, b) => {
      const timeA = a.signOff ? new Date(a.signOff).getTime() : 0;
      const timeB = b.signOff ? new Date(b.signOff).getTime() : 0;
      if (timeA === 0 && timeB === 0) {
        const signOnA = a.signOn ? new Date(a.signOn).getTime() : 0;
        const signOnB = b.signOn ? new Date(b.signOn).getTime() : 0;
        return signOnB - signOnA;
      }
      if (timeA === 0) return -1;
      if (timeB === 0) return 1;
      return timeB - timeA;
    });

    const seaServiceHtml = sortedSeaService.length > 0 ? `
      <div class="section">
        <h2>${t('cv.sections.seaService')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('seaService.form.vesselName')}</th>
              <th>${t('seaService.form.position')}</th>
              <th>${t('seaService.form.vesselType')}</th>
              <th>${t('seaService.form.signOn')}</th>
              <th>${t('seaService.form.signOff')}</th>
            </tr>
          </thead>
          <tbody>
            ${sortedSeaService.map(s => `
            <tr>
              <td>${s.vesselName || '-'}</td>
              <td>${s.position === 'Other' ? (s.customPosition || '-') : (s.position || '-')}</td>
              <td>${s.vesselType === 'Other' ? (s.customVesselType || '-') : (s.vesselType ? getVesselTypeLabel(s.vesselType) : '-')}</td>
              <td>${formatDate(s.signOn)}</td>
              <td>${formatDate(s.signOff)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '';

    // ── Ближайший родственник ─────────────────────────────────────────────────
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

    // ── Образование ───────────────────────────────────────────────────────────
    const educationHtml = (education && (education.institution || education.degree)) ? `
      <div class="section">
        <h2>${t('education.title')}</h2>
        ${education.institution ? `<div class="info-row"><span class="info-label">${t('education.fields.institution')}:</span> ${education.institution}</div>` : ''}
        ${education.degree ? `<div class="info-row"><span class="info-label">${t('education.fields.degree')}:</span> ${education.degree}</div>` : ''}
        ${education.specialization ? `<div class="info-row"><span class="info-label">${t('education.fields.specialization')}:</span> ${education.specialization}</div>` : ''}
        ${education.graduationYear ? `<div class="info-row"><span class="info-label">${t('education.fields.graduationYear')}:</span> ${education.graduationYear}</div>` : ''}
        ${education.languages ? `<div class="info-row"><span class="info-label">${t('education.fields.languages')}:</span> ${education.languages}</div>` : ''}
        ${education.englishLevel ? `<div class="info-row"><span class="info-label">${t('education.fields.englishLevel')}:</span> ${education.englishLevel}</div>` : ''}
        ${education.additionalSkills ? `<div class="info-row"><span class="info-label">${t('education.fields.additionalSkills')}:</span> ${education.additionalSkills}</div>` : ''}
      </div>` : '';

    // ── Заметки ───────────────────────────────────────────────────────────────
    const notesHtml = (includeNotesInCV && notes) ? `
      <div class="section">
        <h2>${t('notes.title')}</h2>
        <p style="font-size:10px;line-height:1.6;">${notes.split('\n').join('<br/>')}</p>
      </div>` : '';

    const vesselTypeLine = personal.vesselType === 'Other' ? personal.customVesselType : (personal.vesselType ? getVesselTypeLabel(personal.vesselType) : '-');
    const dayRateLine = personal.minDayRate ? `${personal.minDayRate} ${personal.minDayRateCurrency || ''} ${personal.isRateNegotiable ? '(Negotiable)' : ''}` : '-';
    const positionLine = personal.appliedPosition === 'Other' ? personal.customPosition : personal.appliedPosition;

    // ── Design 1: Classic Blue ────────────────────────────────────────────────
    if (design === 1) return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #333; font-size: 11px; line-height: 1.4; }
  h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; font-size: 24px; margin: 0 0 15px 0; }
  h2 { color: #1976d2; margin: 20px 0 12px 0; font-size: 14px; page-break-inside: avoid; border-left: 3px solid #1976d2; padding-left: 8px; }
  .header { margin-bottom: 20px; overflow: hidden; page-break-inside: avoid; }
  .qr-header { display: flex; align-items: center; margin-bottom: 15px; }
  .qr-header img { width: 50px; height: 50px; margin-right: 10px; }
  .qr-text { font-size: 9px; color: #777; font-style: italic; }
  .contact-summary { margin-bottom: 10px; font-size: 10px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
  th { background-color: #f5f5f5; font-weight: bold; }
  .info-row { display: flex; margin-bottom: 6px; page-break-inside: avoid; }
  .info-label { font-weight: bold; width: 150px; flex-shrink: 0; color: #666; }
  .section { margin-bottom: 18px; }
</style></head><body>
  <div class="qr-header">
    <img src="${qrCodeUrl}" alt="QR" />
    <span class="qr-text">Generated by Seafarer Documents Manager</span>
  </div>
  <div class="header">
    ${photoHtml}
    <h1>${fullName}</h1>
    <div class="contact-summary">
      ${personal.phone ? `<span>${t('personal.fields.phone')}: ${personal.phone} | </span>` : ''}
      ${personal.email ? `<span>${t('personal.fields.email')}: ${personal.email}</span>` : ''}
    </div>
    ${positionLine ? `<p style="font-size:14px;margin-top:5px;"><strong>${positionLine}</strong></p>` : ''}
    <div style="margin-top:12px;padding-top:8px;border-top:1px solid #eee;">
      <p style="color:#1976d2;font-weight:bold;font-size:12px;margin-bottom:5px;">${t('personal.sections.careerPreferences')}</p>
      <div class="info-row" style="margin-bottom:4px;"><span class="info-label">${t('seaService.form.vesselType')}:</span><span>${vesselTypeLine}</span></div>
      <div class="info-row" style="margin-bottom:4px;"><span class="info-label">${t('personal.fields.minDayRate')}:</span><span>${dayRateLine}</span></div>
      <div class="info-row" style="margin-bottom:4px;"><span class="info-label">${t('personal.fields.availabilityDate')}:</span><span>${personal.availabilityDate ? formatDate(personal.availabilityDate) : '-'}</span></div>
    </div>
  </div>
  <div class="section">
    <h2>${t('personal.sections.personalDetails')}</h2>
    <div class="info-row"><span class="info-label">${t('personal.fields.dateOfBirth')}:</span> ${formatDate(personal.birthDate)}</div>
    <div class="info-row"><span class="info-label">${t('personal.fields.placeOfBirth')}:</span> ${personal.birthPlace || '-'}</div>
    <div class="info-row"><span class="info-label">${t('personal.fields.nationality')}:</span> ${personal.nationality || '-'}</div>
  </div>
  <div class="section">
    <h2>${t('personal.sections.contactInformation')}</h2>
    <div class="info-row"><span class="info-label">${t('personal.fields.phone')}:</span> ${personal.phone || '-'}</div>
    <div class="info-row"><span class="info-label">${t('personal.fields.email')}:</span> ${personal.email || '-'}</div>
    ${personal.whatsapp ? `<div class="info-row"><span class="info-label">${t('personal.fields.whatsapp')}:</span> ${personal.whatsapp}</div>` : ''}
    ${personal.address ? `<div class="info-row"><span class="info-label">${t('personal.fields.address')}:</span> ${[personal.address, personal.city, personal.country].filter(Boolean).join(', ')}</div>` : ''}
    ${personal.nearestAirport ? `<div class="info-row"><span class="info-label">${t('personal.fields.nearestAirport')}:</span> ${personal.nearestAirport}</div>` : ''}
  </div>
  ${seaServiceHtml}${documentsHtml}${educationHtml}${nextOfKinHtml}${notesHtml}
</body></html>`;

    // ── Design 2: Navy Executive ──────────────────────────────────────────────
    if (design === 2) return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; color: #222; font-size: 11px; line-height: 1.5; }
  .page { padding: 20mm; }
  .top-bar { background: #002147; padding: 24px 20mm; display: flex; align-items: center; justify-content: space-between; page-break-inside: avoid; }
  .top-bar-left { flex: 1; }
  .top-name { color: #ffffff; font-size: 26px; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px; }
  .top-position { color: #B8860B; font-size: 13px; font-style: italic; margin-bottom: 6px; }
  .top-contact { color: rgba(255,255,255,0.75); font-size: 10px; }
  .top-photo { width: 100px; height: 130px; object-fit: cover; border: 3px solid #B8860B; margin-left: 20px; }
  .qr-row { display: flex; align-items: center; background: #f0f4f8; padding: 8px 20mm; border-bottom: 1px solid #dce3ea; }
  .qr-row img { width: 40px; height: 40px; margin-right: 8px; }
  .qr-label { font-size: 8px; color: #888; font-style: italic; }
  h2 { color: #002147; font-size: 13px; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #B8860B; padding-bottom: 4px; margin: 18px 0 10px 0; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-family: Arial, sans-serif; }
  th { background: #002147; color: #ffffff; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: normal; }
  td { border-bottom: 1px solid #e0e6ed; padding: 6px 8px; font-size: 10px; }
  tr:nth-child(even) td { background: #f7f9fc; }
  .info-row { display: flex; margin-bottom: 5px; font-family: Arial, sans-serif; page-break-inside: avoid; }
  .info-label { font-weight: bold; width: 155px; flex-shrink: 0; color: #002147; font-size: 10px; }
  .info-val { font-size: 10px; color: #333; }
  .section { margin-bottom: 16px; }
  .pref-box { background: #f0f4f8; border-left: 4px solid #B8860B; padding: 10px 14px; margin-top: 4px; font-family: Arial, sans-serif; }
  .pref-title { color: #002147; font-weight: bold; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
</style></head><body>
  <div class="top-bar">
    <div class="top-bar-left">
      <div class="top-name">${fullName}</div>
      ${positionLine ? `<div class="top-position">${positionLine}</div>` : ''}
      <div class="top-contact">
        ${personal.phone ? `${t('personal.fields.phone')}: ${personal.phone}` : ''}
        ${personal.phone && personal.email ? ' &nbsp;|&nbsp; ' : ''}
        ${personal.email ? `${t('personal.fields.email')}: ${personal.email}` : ''}
      </div>
    </div>
    ${personal.photo ? `<img class="top-photo" src="${personal.photo}" />` : ''}
  </div>
  <div class="qr-row">
    <img src="${qrCodeUrl}" alt="QR" />
    <span class="qr-label">Generated by Seafarer Documents Manager</span>
  </div>
  <div class="page">
    <div class="pref-box" style="margin-bottom:16px;">
      <div class="pref-title">${t('personal.sections.careerPreferences')}</div>
      <div class="info-row"><span class="info-label">${t('seaService.form.vesselType')}:</span><span class="info-val">${vesselTypeLine}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.minDayRate')}:</span><span class="info-val">${dayRateLine}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.availabilityDate')}:</span><span class="info-val">${personal.availabilityDate ? formatDate(personal.availabilityDate) : '-'}</span></div>
    </div>
    <div class="section">
      <h2>${t('personal.sections.personalDetails')}</h2>
      <div class="info-row"><span class="info-label">${t('personal.fields.dateOfBirth')}:</span><span class="info-val">${formatDate(personal.birthDate)}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.placeOfBirth')}:</span><span class="info-val">${personal.birthPlace || '-'}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.nationality')}:</span><span class="info-val">${personal.nationality || '-'}</span></div>
    </div>
    <div class="section">
      <h2>${t('personal.sections.contactInformation')}</h2>
      <div class="info-row"><span class="info-label">${t('personal.fields.phone')}:</span><span class="info-val">${personal.phone || '-'}</span></div>
      <div class="info-row"><span class="info-label">${t('personal.fields.email')}:</span><span class="info-val">${personal.email || '-'}</span></div>
      ${personal.whatsapp ? `<div class="info-row"><span class="info-label">${t('personal.fields.whatsapp')}:</span><span class="info-val">${personal.whatsapp}</span></div>` : ''}
      ${personal.address ? `<div class="info-row"><span class="info-label">${t('personal.fields.address')}:</span><span class="info-val">${[personal.address, personal.city, personal.country].filter(Boolean).join(', ')}</span></div>` : ''}
      ${personal.nearestAirport ? `<div class="info-row"><span class="info-label">${t('personal.fields.nearestAirport')}:</span><span class="info-val">${personal.nearestAirport}</span></div>` : ''}
    </div>
    ${seaServiceHtml}${documentsHtml}${educationHtml}${nextOfKinHtml}${notesHtml}
  </div>
</body></html>`;

    // ── Design 4: Offshore (dark sidebar) ─────────────────────────────────────
    if (design === 4) {
      const locationLine = [personal.address, personal.postalCode, personal.city, personal.country].filter(Boolean).join(', ');

      const hasPhysical = !!(biometrics && (biometrics.height || biometrics.weight || biometrics.shoeSize || biometrics.bloodType));
      const physicalHtml = !hasPhysical ? '' : `
        <div class="sb-section">
          <div class="sb-title">${t('cv.sections.physicalData')}</div>
          <div class="info-list">
            ${biometrics.height ? `<div><span class="lbl">${t('cv.fields.height')}:</span> ${biometrics.height}</div>` : ''}
            ${biometrics.weight ? `<div><span class="lbl">${t('cv.fields.weight')}:</span> ${biometrics.weight}</div>` : ''}
            ${biometrics.shoeSize ? `<div><span class="lbl">${t('cv.fields.shoeSize')}:</span> ${biometrics.shoeSize}</div>` : ''}
            ${biometrics.bloodType ? `<div><span class="lbl">${t('cv.fields.bloodType')}:</span> ${biometrics.bloodType}</div>` : ''}
          </div>
        </div>`;

      const hasEducation = !!(education && (education.institution || education.degree || education.specialization));
      const eduSidebarHtml = !hasEducation ? '' : `
        <div class="sb-section">
          <div class="sb-title">${t('education.title')}</div>
          <div class="sb-text">
            ${education.institution ? `${education.institution}<br>` : ''}
            ${education.degree ? `${t('education.fields.degree')}: ${education.degree}<br>` : ''}
            ${education.specialization ? `${t('education.fields.specialization')}: ${education.specialization}<br>` : ''}
            ${education.graduationYear ? `${t('education.fields.graduationYear')}: ${education.graduationYear}<br>` : ''}
            ${education.languages ? `${t('education.fields.languages')}: ${education.languages}<br>` : ''}
            ${education.englishLevel ? `${t('education.fields.englishLevel')}: ${education.englishLevel}` : ''}
          </div>
        </div>`;

      const pinSvg = '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>';
      const phoneSvg = '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
      const mailSvg = '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>';
      const waSvg = '<svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.04c-.24.68-1.42 1.31-1.95 1.36-.5.05-1.13.07-1.83-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.2-4.98-4.4-.15-.2-1.19-1.58-1.19-3.01 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.51-.1.2-.15.32-.29.49-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.2-.29.39-.24.66-.15.27.1 1.71.81 2 .96.29.15.49.22.56.34.07.12.07.69-.17 1.37z"/></svg>';

      return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; font-size: 11px; line-height: 1.45;
         background: linear-gradient(to right, #2f3338 0, #2f3338 34%, #ffffff 34%, #ffffff 100%); }
  .wrap { display: flex; align-items: stretch; min-height: 100%; }
  svg { display: block; }

  /* sidebar */
  .left { width: 34%; color: #e7eaec; }
  .photo { width: 100%; height: 250px; overflow: hidden; }
  .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .left-inner { padding: 20px 22px 30px; }
  .name { font-size: 20px; font-weight: 700; letter-spacing: .4px; line-height: 1.15; }
  .role { font-size: 12.5px; font-weight: 600; color: #cfd3d6; margin-top: 4px; }
  .loc { display: flex; gap: 9px; margin-top: 18px; font-size: 11px; line-height: 1.5; }
  .loc .ic { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
  .loc .ic svg { width: 15px; height: 15px; fill: #f26b21; }
  .sb-section { margin-top: 22px; }
  .sb-title { font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; text-align: center;
              padding-bottom: 7px; margin-bottom: 11px; border-bottom: 1px solid #4a4f55; }
  .contact-row { display: flex; align-items: center; gap: 9px; font-size: 11px; margin-bottom: 10px; word-break: break-all; }
  .contact-row .ic { width: 15px; height: 15px; flex-shrink: 0; }
  .contact-row .ic svg { width: 15px; height: 15px; fill: #f26b21; }
  .contact-row .ic.wa svg { fill: #25d366; }
  .info-list { font-size: 11px; line-height: 1.85; }
  .info-list .lbl { color: #aeb2b6; }
  .sb-text { font-size: 11px; line-height: 1.6; }

  /* main */
  .right { width: 66%; }
  .r-header { background: #f3f4f5; padding: 22px 26px 18px; text-align: center; }
  .r-header h1 { font-size: 24px; font-weight: 800; letter-spacing: .6px; color: #1b1d20; }
  .r-header .red { font-size: 16px; font-weight: 800; letter-spacing: .6px; color: #e23a2e; margin-top: 3px; text-transform: uppercase; }
  .r-header .divider { height: 2px; background: #2f3338; margin: 12px 0; }
  .r-header .summary { font-size: 11px; color: #555; }
  .r-body { padding: 18px 26px 28px; }
  .pref-box { background: #f6f7f8; border-left: 4px solid #e23a2e; padding: 10px 14px; margin-bottom: 18px; }
  .pref-title { color: #1b1d20; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  h2 { color: #1b1d20; font-size: 15px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase;
       border-bottom: 2px solid #2f3338; padding-bottom: 5px; margin: 18px 0 10px; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #2f3338; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 600; }
  td { border-bottom: 1px solid #e0e0e0; padding: 7px 8px; font-size: 10px; vertical-align: top; }
  .section { margin-bottom: 18px; }
  .info-row { display: flex; margin-bottom: 5px; page-break-inside: avoid; }
  .info-label { font-weight: 700; width: 140px; flex-shrink: 0; color: #555; font-size: 10px; }
  .qr-row { display: flex; align-items: center; margin-bottom: 12px; }
  .qr-row img { width: 36px; height: 36px; margin-right: 8px; opacity: .7; }
  .qr-row span { font-size: 8px; color: #999; font-style: italic; }
</style></head><body>
  <div class="wrap">

    <aside class="left">
      ${personal.photo ? `<div class="photo"><img src="${personal.photo}" /></div>` : ''}
      <div class="left-inner">
        <div class="name">${fullName}</div>
        ${positionLine ? `<div class="role">${positionLine}</div>` : ''}

        ${(locationLine || personal.nearestAirport) ? `
        <div class="loc">
          <span class="ic">${pinSvg}</span>
          <span>${locationLine || ''}${(locationLine && personal.nearestAirport) ? '<br><br>' : ''}${personal.nearestAirport ? `${t('personal.fields.nearestAirport')}:<br>${personal.nearestAirport}` : ''}</span>
        </div>` : ''}

        <div class="sb-section">
          <div class="sb-title">${t('personal.sections.contactInformation')}</div>
          ${personal.phone ? `<div class="contact-row"><span class="ic">${phoneSvg}</span><span>${personal.phone}</span></div>` : ''}
          ${personal.email ? `<div class="contact-row"><span class="ic">${mailSvg}</span><span>${personal.email}</span></div>` : ''}
          ${personal.whatsapp ? `<div class="contact-row"><span class="ic wa">${waSvg}</span><span>${personal.whatsapp}</span></div>` : ''}
        </div>

        <div class="sb-section">
          <div class="sb-title">${t('personal.sections.personalDetails')}</div>
          <div class="info-list">
            <div><span class="lbl">${t('personal.fields.nationality')}:</span> ${personal.nationality || '-'}</div>
            <div><span class="lbl">${t('personal.fields.dateOfBirth')}:</span> ${formatDate(personal.birthDate)}</div>
            ${personal.birthPlace ? `<div><span class="lbl">${t('personal.fields.placeOfBirth')}:</span> ${personal.birthPlace}</div>` : ''}
          </div>
        </div>

        ${physicalHtml}
        ${eduSidebarHtml}
      </div>
    </aside>

    <main class="right">
      <div class="r-header">
        <h1>${fullName}</h1>
        ${positionLine ? `<div class="red">${positionLine}</div>` : ''}
        <div class="divider"></div>
        <div class="summary">${[personal.phone, personal.email].filter(Boolean).join('  |  ')}</div>
      </div>
      <div class="r-body">
        <div class="qr-row">
          <img src="${qrCodeUrl}" alt="QR" />
          <span>Generated by Seafarer Documents Manager</span>
        </div>

        <div class="pref-box">
          <div class="pref-title">${t('personal.sections.careerPreferences')}</div>
          <div class="info-row"><span class="info-label">${t('seaService.form.vesselType')}:</span><span>${vesselTypeLine}</span></div>
          <div class="info-row"><span class="info-label">${t('personal.fields.minDayRate')}:</span><span>${dayRateLine}</span></div>
          <div class="info-row"><span class="info-label">${t('personal.fields.availabilityDate')}:</span><span>${personal.availabilityDate ? formatDate(personal.availabilityDate) : '-'}</span></div>
        </div>

        ${seaServiceHtml}${documentsHtml}${nextOfKinHtml}${notesHtml}
      </div>
    </main>

  </div>
</body></html>`;
    }

    // ── Design 3: Modern Minimal ──────────────────────────────────────────────
    return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  @page { size: A4; margin: 18mm 22mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #2d2d2d; font-size: 10.5px; line-height: 1.6; background: #fff; }
  .header-block { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px solid #00796b; margin-bottom: 16px; page-break-inside: avoid; }
  .header-left { flex: 1; }
  .name-line { font-size: 28px; font-weight: 300; color: #1a1a1a; letter-spacing: -0.5px; margin-bottom: 3px; }
  .name-line strong { font-weight: 700; }
  .position-line { font-size: 13px; color: #00796b; font-weight: 500; margin-bottom: 8px; }
  .contact-line { font-size: 9.5px; color: #666; }
  .header-photo { width: 90px; height: 115px; object-fit: cover; border-radius: 4px; margin-left: 16px; }
  .qr-stamp { display: flex; align-items: center; margin-bottom: 14px; }
  .qr-stamp img { width: 36px; height: 36px; margin-right: 7px; opacity: 0.6; }
  .qr-stamp span { font-size: 8px; color: #bbb; }
  h2 { font-size: 10px; font-weight: 700; color: #00796b; text-transform: uppercase; letter-spacing: 2px; margin: 18px 0 8px 0; page-break-inside: avoid; }
  .divider { height: 1px; background: #e0e0e0; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: left; font-size: 9px; font-weight: 700; color: #00796b; text-transform: uppercase; letter-spacing: 1px; padding: 5px 8px; border-bottom: 2px solid #00796b; }
  td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(odd) td { background: #f9fdfb; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 4px 0; }
  .info-row { display: flex; width: 100%; margin-bottom: 4px; page-break-inside: avoid; }
  .info-label { font-weight: 600; width: 145px; flex-shrink: 0; color: #555; font-size: 10px; }
  .info-val { font-size: 10px; color: #2d2d2d; }
  .section { margin-bottom: 14px; }
  .pref-grid { display: flex; gap: 20px; background: #f0faf8; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
  .pref-item { flex: 1; }
  .pref-key { font-size: 8.5px; font-weight: 700; color: #00796b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .pref-val { font-size: 10.5px; color: #2d2d2d; }
</style></head><body>
  <div class="qr-stamp">
    <img src="${qrCodeUrl}" alt="QR" />
    <span>Generated by Seafarer Documents Manager</span>
  </div>
  <div class="header-block">
    <div class="header-left">
      <div class="name-line"><strong>${fullName.split(' ').slice(0,-1).join(' ')} </strong>${fullName.split(' ').slice(-1)[0]}</div>
      ${positionLine ? `<div class="position-line">${positionLine}</div>` : ''}
      <div class="contact-line">
        ${[personal.phone, personal.email, personal.whatsapp ? `WhatsApp: ${personal.whatsapp}` : ''].filter(Boolean).join('  ·  ')}
      </div>
    </div>
    ${personal.photo ? `<img class="header-photo" src="${personal.photo}" />` : ''}
  </div>

  <div class="pref-grid">
    <div class="pref-item"><div class="pref-key">${t('seaService.form.vesselType')}</div><div class="pref-val">${vesselTypeLine}</div></div>
    <div class="pref-item"><div class="pref-key">${t('personal.fields.minDayRate')}</div><div class="pref-val">${dayRateLine}</div></div>
    <div class="pref-item"><div class="pref-key">${t('personal.fields.availabilityDate')}</div><div class="pref-val">${personal.availabilityDate ? formatDate(personal.availabilityDate) : '-'}</div></div>
  </div>

  <div class="section">
    <h2>${t('personal.sections.personalDetails')}</h2>
    <div class="divider"></div>
    <div class="info-row"><span class="info-label">${t('personal.fields.dateOfBirth')}:</span><span class="info-val">${formatDate(personal.birthDate)}</span></div>
    <div class="info-row"><span class="info-label">${t('personal.fields.placeOfBirth')}:</span><span class="info-val">${personal.birthPlace || '-'}</span></div>
    <div class="info-row"><span class="info-label">${t('personal.fields.nationality')}:</span><span class="info-val">${personal.nationality || '-'}</span></div>
  </div>

  <div class="section">
    <h2>${t('personal.sections.contactInformation')}</h2>
    <div class="divider"></div>
    <div class="info-row"><span class="info-label">${t('personal.fields.phone')}:</span><span class="info-val">${personal.phone || '-'}</span></div>
    <div class="info-row"><span class="info-label">${t('personal.fields.email')}:</span><span class="info-val">${personal.email || '-'}</span></div>
    ${personal.whatsapp ? `<div class="info-row"><span class="info-label">${t('personal.fields.whatsapp')}:</span><span class="info-val">${personal.whatsapp}</span></div>` : ''}
    ${personal.address ? `<div class="info-row"><span class="info-label">${t('personal.fields.address')}:</span><span class="info-val">${[personal.address, personal.city, personal.country].filter(Boolean).join(', ')}</span></div>` : ''}
    ${personal.nearestAirport ? `<div class="info-row"><span class="info-label">${t('personal.fields.nearestAirport')}:</span><span class="info-val">${personal.nearestAirport}</span></div>` : ''}
  </div>

  ${seaServiceHtml}${documentsHtml}${educationHtml}${nextOfKinHtml}${notesHtml}
</body></html>`;
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      const html = generateHTML(cvDesign);
      const { uri } = await Print.printToFileAsync({ html });

      const dateStr = formatDateForFilename(new Date());
      const lastName = state.personal.lastName || 'Seaman';
      const fileName = `CV_${lastName}_${dateStr}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      // Удаляем старый файл если существует — idempotent не падает если файла нет
      await FileSystem.deleteAsync(newUri, { idempotent: true });

      await FileSystem.moveAsync({ from: uri, to: newUri });

      const currentDate = new Date().toISOString();
      updatePersonal({ ...state.personal, lastCVGeneratedDate: currentDate });
      setLastGeneratedDate(currentDate);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
        onDisableSwipe?.();
        playSuccessSound();
      } else {
        playSuccessSound();
        Alert.alert(t('common.success'), `PDF saved!\n\nFile: ${fileName}`);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('cv.alerts.errorMessage'));
      console.error('PDF generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasData = state.personal.firstName || state.seaService.length > 0 || state.documents.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 2 }}>
      <View style={{ flex: 1 }}>
        <Image source={GHOST_ROSE_IMAGE} style={[styles.roseBackground, { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]} resizeMode="cover" />

        {/* ↓ ИЗМЕНЕНО: contentContainerStyle для центрирования на iPad */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={isTablet ? styles.scrollContentTablet : styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ↓ ИЗМЕНЕНО: обёртка с maxWidth для iPad */}
          <View style={isTablet ? styles.centeredContent : undefined}>
            <View style={[styles.sectionUI, isDark ? styles.sectionDark : styles.sectionLight]}>
              <Ionicons name="document-text" size={isTablet ? 64 : 48} color={isDark ? '#64b5f6' : '#1976d2'} style={styles.icon} />
              <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>{t('cv.title')}</Text>
              <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
                {t('cv.subtitle')}
              </Text>
              
              {hasData ? (
                <>
                  {lastGeneratedDate ? (
                    <View style={styles.lastGeneratedBlock}>
                      <Ionicons name="time-outline" size={16} color={isDark ? '#90caf9' : '#1976d2'} />
                      <Text style={[styles.lastGeneratedText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        {t('cv.lastGenerated')}: {new Date(lastGeneratedDate).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}

                  {!isPremium && (
                    <View style={styles.trialWarning}>
                      <Ionicons name="alert-circle" size={20} color="#f44336" />
                      <Text style={styles.trialWarningText}>{t('cv.trialNotice')}</Text>
                    </View>
                  )}

                  <View style={styles.previewInfo}>
                    <Text style={[styles.previewTitle, isDark ? styles.textLight : styles.textDark]}>{t('cv.willInclude')}</Text>
                    <View style={styles.previewList}>
                      <View style={styles.previewItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>{t('cv.includes.personalInfo')}</Text>
                      </View>
                      {state.nextOfKin && state.nextOfKin.name && (
                        <View style={styles.previewItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                            {t('nextOfKin.title')} {isPremium ? '' : '(Basic info only)'}
                          </Text>
                        </View>
                      )}
                      {state.seaService.length > 0 && (
                        <View style={styles.previewItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                            {t('cv.includes.seaService', { count: state.seaService.length })}
                          </Text>
                        </View>
                      )}
                      {state.documents.length > 0 && (
                        <View style={styles.previewItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                            {t('cv.includes.documents', { count: state.documents.length })} {isPremium ? '' : '(Names only)'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.designPicker}>
                    <Text style={[styles.designPickerLabel, isDark ? styles.textMuted : styles.textMutedLight]}>
                      CV Design
                    </Text>
                    <View style={styles.designPickerRow}>
                      {CV_DESIGNS.map(d => (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.designCard, cvDesign === d.id && { borderColor: d.accent, borderWidth: 2 }, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : d.bg }]}
                          onPress={() => setCvDesign(d.id)}
                        >
                          <View style={[styles.designCardStripe, { backgroundColor: d.accent }]} />
                          <Text style={[styles.designCardName, { color: d.accent }]}>{d.name}</Text>
                          {cvDesign === d.id && <Ionicons name="checkmark-circle" size={14} color={d.accent} style={{ marginTop: 2 }} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Button
                    title={loading ? t('common.loading') : t('cv.generateButton')}
                    onPress={generatePDF}
                    loading={loading}
                    icon="share-outline"
                    style={{ marginTop: 16, width: '100%' }}
                  />
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>{t('cv.emptyMessage')}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  roseBackground: { position: 'absolute', width: '100%', height: '100%', zIndex: -1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  // ↓ НОВЫЕ СТИЛИ для iPad
  scrollContentTablet: {
    padding: 24,
    alignItems: 'center',
  },
  centeredContent: {
    width: '100%',
    maxWidth: 640,
  },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  sectionUI: { padding: 24, borderRadius: 16, alignItems: 'center' },
  sectionDark: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  sectionLight: { backgroundColor: 'rgba(255, 255, 255, 0.3)', },
  icon: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  lastGeneratedBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 8, borderRadius: 8, backgroundColor: 'rgba(100, 181, 246, 0.1)' },
  lastGeneratedText: { marginLeft: 8, fontSize: 12 },
  trialWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244, 67, 54, 0.1)', padding: 10, borderRadius: 8, marginBottom: 20 },
  trialWarningText: { color: '#f44336', fontSize: 12, marginLeft: 8, flexShrink: 1 },
  previewInfo: { width: '100%' },
  previewTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  previewList: { flexDirection: 'column', gap: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center' },
  previewText: { fontSize: 14, marginLeft: 8 },
  designPicker: { width: '100%', marginTop: 20 },
  designPickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  designPickerRow: { flexDirection: 'row', gap: 10 },
  designCard: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden', alignItems: 'center', paddingVertical: 10 },
  designCardStripe: { width: '100%', height: 4, marginBottom: 8 },
  designCardName: { fontSize: 11, fontWeight: '600' },
  emptyState: { paddingVertical: 20 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  textLight: { color: '#fff' },
  textDark: { color: '#333' },
  textMuted: { color: 'rgba(255, 255, 255, 0.6)' },
  textMutedLight: { color: 'rgba(0, 0, 0, 0.5)' },
});