import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useData } from '../contexts/DataContext';
import { Ionicons } from '@expo/vector-icons';

export const QRScreen: React.FC = () => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const { personal } = state;

  const generateVCard = () => {
    const fullName = `${personal.firstName} ${personal.lastName}`.trim();
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${personal.lastName};${personal.firstName};${personal.middleName};;`,
      `FN:${fullName}`,
      personal.phone ? `TEL;TYPE=CELL:${personal.phone}` : '',
      personal.email ? `EMAIL:${personal.email}` : '',
      personal.address ? `ADR;TYPE=HOME:;;${personal.address};${personal.city};;${personal.postalCode};${personal.country}` : '',
      personal.appliedPosition ? `TITLE:${personal.appliedPosition}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\n');
  };

  const hasContactInfo = personal.firstName || personal.lastName || personal.phone || personal.email;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Contact QR Code</Text>
          <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
            Scan this QR code to save contact information
          </Text>
          
          {hasContactInfo ? (
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={generateVCard()}
                  size={200}
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
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="qr-code-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
              <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>
                Add personal information to generate QR code
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.infoTitle, isDark ? styles.textLight : styles.textDark]}>
            <Ionicons name="information-circle" size={18} color={isDark ? '#64b5f6' : '#1976d2'} /> How to use
          </Text>
          <Text style={[styles.infoText, isDark ? styles.textMuted : styles.textMutedLight]}>
            1. Open camera on any smartphone{"\n"}
            2. Point at QR code{"\n"}
            3. Tap notification to save contact{"\n"}
            4. All your contact info will be saved automatically
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 14,
    color: '#64b5f6',
    marginTop: 4,
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
