import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/Button';
import { formatDate, formatDateForFilename } from '../utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { playSuccessSound } from '../utils/sound';

export const CVScreen: React.FC = () => {
  const { state } = useData();
  const [loading, setLoading] = useState(false);
  const isDark = state.theme === 'dark';

  const generateHTML = () => {
    const { personal, biometrics, education, seaService, documents } = state;
    const fullName = `${personal.firstName} ${personal.lastName}`.trim() || 'Seafarer';

    const photoHtml = personal.photo ? `
      <div style="float: right; margin-left: 20px; margin-bottom: 10px;">
        <img src="${personal.photo}" style="width: 70px; height: 90px; object-fit: cover; border-radius: 4px;" />
      </div>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; font-size: 12px; }
    h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
    h2 { color: #1976d2; margin-top: 25px; font-size: 14px; }
    .header { margin-bottom: 20px; overflow: hidden; }
    .contact-info { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px; }
    .contact-item { margin-right: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-label { font-weight: bold; width: 150px; }
    .section { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    ${photoHtml}
    <h1>${fullName}</h1>
    <div class="contact-info">
      ${personal.phone ? `<span class="contact-item">Phone: ${personal.phone}</span>` : ''}
      ${personal.email ? `<span class="contact-item">Email: ${personal.email}</span>` : ''}
      ${personal.nationality ? `<span class="contact-item">Nationality: ${personal.nationality}</span>` : ''}
    </div>
    ${personal.appliedPosition ? `<p><strong>Applied Position:</strong> ${personal.appliedPosition}</p>` : ''}
  </div>

  <div class="section">
    <h2>Personal Information</h2>
    <div class="info-row"><span class="info-label">Date of Birth:</span> ${personal.birthDate || '-'}</div>
    <div class="info-row"><span class="info-label">Place of Birth:</span> ${personal.birthPlace || '-'}</div>
    <div class="info-row"><span class="info-label">Address:</span> ${[personal.address, personal.city, personal.country].filter(Boolean).join(', ') || '-'}</div>
  </div>

  ${biometrics.height || biometrics.weight ? `
  <div class="section">
    <h2>Physical Data</h2>
    <div class="info-row"><span class="info-label">Height:</span> ${biometrics.height ? biometrics.height + ' cm' : '-'}</div>
    <div class="info-row"><span class="info-label">Weight:</span> ${biometrics.weight ? biometrics.weight + ' kg' : '-'}</div>
    <div class="info-row"><span class="info-label">Shoe Size:</span> ${biometrics.shoeSize || '-'}</div>
    <div class="info-row"><span class="info-label">Blood Type:</span> ${biometrics.bloodType || '-'}</div>
  </div>
  ` : ''}

  ${education.institution || education.degree ? `
  <div class="section">
    <h2>Education</h2>
    <div class="info-row"><span class="info-label">Institution:</span> ${education.institution || '-'}</div>
    <div class="info-row"><span class="info-label">Degree:</span> ${education.degree || '-'}</div>
    <div class="info-row"><span class="info-label">Specialization:</span> ${education.specialization || '-'}</div>
    <div class="info-row"><span class="info-label">Graduation:</span> ${education.graduationYear || '-'}</div>
    ${education.languages ? `<div class="info-row"><span class="info-label">Languages:</span> ${education.languages}</div>` : ''}
    ${education.additionalSkills ? `<div class="info-row"><span class="info-label">Skills:</span> ${education.additionalSkills}</div>` : ''}
  </div>
  ` : ''}

  ${seaService.length > 0 ? `
  <div class="section">
    <h2>Sea Service</h2>
    <table>
      <thead>
        <tr>
          <th>Vessel</th>
          <th>Type</th>
          <th>Position</th>
          <th>Company</th>
          <th>Sign On</th>
          <th>Sign Off</th>
        </tr>
      </thead>
      <tbody>
        ${seaService.map(s => `
        <tr>
          <td>${s.vesselName}</td>
          <td>${s.vesselType || '-'}</td>
          <td>${s.position}</td>
          <td>${s.company || '-'}</td>
          <td>${formatDate(s.signOn)}</td>
          <td>${formatDate(s.signOff)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${documents.length > 0 ? `
  <div class="section">
    <h2>Documents & Certificates</h2>
    <table>
      <thead>
        <tr>
          <th>Document</th>
          <th>Number</th>
          <th>Issue Date</th>
          <th>Expiry Date</th>
        </tr>
      </thead>
      <tbody>
        ${documents.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.number || '-'}</td>
          <td>${formatDate(d.issueDate)}</td>
          <td>${formatDate(d.expiryDate)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <footer style="margin-top: 30px; text-align: center; color: #999; font-size: 10px;">
    Generated by Seafarer Documents Manager
  </footer>
</body>
</html>
    `;
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      
      const dateStr = formatDateForFilename(new Date());
      const firstName = state.personal.firstName || 'Name';
      const lastName = state.personal.lastName || 'Surname';
      const fileName = `${dateStr}-CV_${firstName}_${lastName}.pdf`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
        playSuccessSound();
      } else {
        playSuccessSound();
        Alert.alert('Success', 'PDF generated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hasData = state.personal.firstName || state.seaService.length > 0 || state.documents.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Ionicons name="document-text" size={48} color={isDark ? '#64b5f6' : '#1976d2'} style={styles.icon} />
          <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Generate CV</Text>
          <Text style={[styles.subtitle, isDark ? styles.textMuted : styles.textMutedLight]}>
            Create a professional PDF resume with all your information
          </Text>
          
          {hasData ? (
            <>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewTitle, isDark ? styles.textLight : styles.textDark]}>
                  CV will include:
                </Text>
                <View style={styles.previewList}>
                  {state.personal.firstName && (
                    <View style={styles.previewItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        Personal Information
                      </Text>
                    </View>
                  )}
                  {(state.biometrics.height || state.biometrics.weight) && (
                    <View style={styles.previewItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        Physical Data
                      </Text>
                    </View>
                  )}
                  {state.education.institution && (
                    <View style={styles.previewItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        Education
                      </Text>
                    </View>
                  )}
                  {state.seaService.length > 0 && (
                    <View style={styles.previewItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        {state.seaService.length} Sea Service Record(s)
                      </Text>
                    </View>
                  )}
                  {state.documents.length > 0 && (
                    <View style={styles.previewItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.previewText, isDark ? styles.textMuted : styles.textMutedLight]}>
                        {state.documents.length} Document(s)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Button 
                title="Generate & Share PDF" 
                onPress={generatePDF} 
                loading={loading}
                style={{ marginTop: 20 }}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>
                Add some information first to generate your CV
              </Text>
            </View>
          )}
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
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  previewInfo: {
    width: '100%',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewList: {
    gap: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewText: {
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
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
