import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import qrcode from 'qrcode-generator';
import { useData } from '../contexts/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../utils/i18n'; // Импорт функции локализации
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО
import { printHtml } from '../utils/webPrint';
import { alertMsg } from '../utils/webAlert';
import { formatDateForFilename } from '../utils/helpers';

// Импорт фонового изображения медуз
const GHOST_JELLYFISH_IMAGE = require('../assets/images/ghost-jellyfish.png');

export const QRScreen: React.FC = () => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const { personal } = state;
  const isTablet = useTablet(); // ← ДОБАВЛЕНО

  const generateVCard = () => {
    const fullName = `${personal.firstName} ${personal.lastName}`.trim();

    const telegramHandle = personal.telegram
      ? (personal.telegram.startsWith('@') ? personal.telegram : `@${personal.telegram}`)
      : '';
    const whatsappNumber = personal.whatsapp
      ? personal.whatsapp.replace(/\D/g, '')
      : '';

    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${personal.lastName};${personal.firstName};${personal.middleName};;`,
      `FN:${fullName}`,
      personal.appliedPosition ? `TITLE:${personal.appliedPosition}` : '',
      personal.phone       ? `TEL;TYPE=CELL:${personal.phone}` : '',
      personal.email       ? `EMAIL:${personal.email}` : '',
      telegramHandle       ? `X-SOCIALPROFILE;TYPE=telegram:${telegramHandle}` : '',
      whatsappNumber       ? `X-SOCIALPROFILE;TYPE=whatsapp:${personal.whatsapp}` : '',
      personal.teams       ? `X-SOCIALPROFILE;TYPE=teams:${personal.teams}` : '',
      telegramHandle       ? `URL;TYPE=Telegram:https://t.me/${telegramHandle.replace('@', '')}` : '',
      whatsappNumber       ? `URL;TYPE=WhatsApp:https://wa.me/${whatsappNumber}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\n');
  };

  const hasContactInfo = personal.firstName || personal.lastName || personal.phone || personal.email;

  const [saving, setSaving] = useState(false);

  // Build the vCard QR as a data URL and print it (Save as PDF) with name + contacts.
  const saveQrPdf = () => {
    try {
      setSaving(true);
      const qr = qrcode(0, 'M');
      qr.addData(generateVCard());
      qr.make();
      const qrDataUrl = qr.createDataURL(8, 12); // cellSize, margin → crisp image

      const fullName = `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
      const rows: string[] = [];
      const row = (label: string, val?: string) =>
        val ? rows.push(`<div class="row"><span class="lbl">${label}:</span> ${val}</div>`) : undefined;
      row(t('personal.fields.phone'), personal.phone);
      row(t('personal.fields.email'), personal.email);
      row(t('personal.fields.whatsapp'), personal.whatsapp);
      row(t('personal.fields.telegram'), personal.telegram
        ? (personal.telegram.startsWith('@') ? personal.telegram : `@${personal.telegram}`) : '');
      row(t('personal.fields.msTeams'), personal.teams);

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: A4; margin: 20mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1A3A5C; text-align: center; }
        .qr { width: 300px; height: 300px; margin: 10px auto 18px; }
        .name { font-size: 24px; font-weight: 700; }
        .pos { font-size: 15px; color: #1976d2; font-style: italic; margin-top: 4px; }
        .contacts { display: inline-block; text-align: left; margin-top: 18px; }
        .row { font-size: 13px; margin-bottom: 6px; color: #333; }
        .lbl { font-weight: bold; color: #555; }
        .hint { font-size: 11px; color: #888; font-style: italic; margin-top: 22px; }
      </style></head><body>
        <img class="qr" src="${qrDataUrl}" alt="Contact QR" />
        ${fullName ? `<div class="name">${fullName}</div>` : ''}
        ${personal.appliedPosition ? `<div class="pos">${personal.appliedPosition}</div>` : ''}
        ${rows.length ? `<div class="contacts">${rows.join('')}</div>` : ''}
        <div class="hint">${t('cv.scanContact')}</div>
      </body></html>`;

      const namePart = (personal.lastName || personal.firstName || 'Contact').replace(/[\s/]+/g, '_');
      const fileName = `QR_${namePart}_${formatDateForFilename(new Date())}`;
      printHtml(html, fileName);
    } catch (e) {
      console.error('QR PDF failed:', e);
      alertMsg(t('common.error'), 'Could not create QR PDF');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 2 }}>
      <View style={styles.container}>
        {/* Призрачные медузы на фоне */}
        <Image
          source={GHOST_JELLYFISH_IMAGE}
          style={[styles.jellyfishBackground, { opacity: isDark ? 0.08 : 0.22, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
          resizeMode="cover"
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]} showsVerticalScrollIndicator={false}>
          <View style={isTablet ? styles.centeredContent : undefined}>
          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            {/* Локализованный заголовок */}
            <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
              {t('qr.title')}
            </Text>
            {/* Локализованный подзаголовок */}
            <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
              {t('qr.subtitle')}
            </Text>
            
            {hasContactInfo ? (
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={generateVCard()}
                    size={isTablet ? 280 : 200}
                    backgroundColor="#fff"
                    color="#000"
                  />
                </View>
                <Text style={[styles.name, isDark ? styles.textLight : styles.textDark]}>
                  {`${personal.firstName} ${personal.lastName}`.trim()}
                </Text>
                {personal.appliedPosition && (
                  <Text style={styles.position}>{personal.appliedPosition}</Text>
                )}

                <TouchableOpacity style={styles.savePdfBtn} onPress={saveQrPdf} disabled={saving} activeOpacity={0.85}>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.savePdfBtnText}>
                    {saving ? '…' : (t('qr.saveAsPdf') !== 'qr.saveAsPdf' ? t('qr.saveAsPdf') : 'Save as PDF')}
                  </Text>
                </TouchableOpacity>

                <View style={styles.contactPreview}>
                  {personal.phone ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={15} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.contactText, isDark ? styles.textMuted : styles.textMutedLight]}>{personal.phone}</Text>
                    </View>
                  ) : null}
                  {personal.email ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={15} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.contactText, isDark ? styles.textMuted : styles.textMutedLight]}>{personal.email}</Text>
                    </View>
                  ) : null}
                  {personal.telegram ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="paper-plane-outline" size={15} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.contactText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        {personal.telegram.startsWith('@') ? personal.telegram : `@${personal.telegram}`}
                      </Text>
                    </View>
                  ) : null}
                  {personal.whatsapp ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="logo-whatsapp" size={15} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.contactText, isDark ? styles.textMuted : styles.textMutedLight]}>{personal.whatsapp}</Text>
                    </View>
                  ) : null}
                  {personal.teams ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="people-outline" size={15} color={isDark ? '#64b5f6' : '#1976d2'} />
                      <Text style={[styles.contactText, isDark ? styles.textMuted : styles.textMutedLight]}>{personal.teams}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="qr-code-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
                {/* Сообщение о пустом состоянии */}
                <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>
                  {t('qr.emptyMessage')}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            <Text style={[styles.infoTitle, isDark ? styles.textLight : styles.textDark]}>
              <Ionicons name="information-circle" size={18} color={isDark ? '#64b5f6' : '#1976d2'} /> {t('qr.howToUse.title')}
            </Text>
            {/* Список инструкций, собранный из локализации */}
            <Text style={[styles.infoText, isDark ? styles.textMuted : styles.textMutedLight]}>
              {`1. ${t('qr.howToUse.step1')}\n`}
              {`2. ${t('qr.howToUse.step2')}\n`}
              {`3. ${t('qr.howToUse.step3')}\n`}
              {`4. ${t('qr.howToUse.step4')}`}
            </Text>
          </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jellyfishBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollContentTablet: { alignItems: 'center' },
  centeredContent: { width: '100%', maxWidth: 560 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  position: {
    fontSize: 17,
    color: '#3fb4f7',
    marginTop: 4,
  },
  savePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  savePdfBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  contactPreview: {
    marginTop: 16,
    alignSelf: 'stretch',
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 24,
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
  textMuted: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  textMutedLight: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
});