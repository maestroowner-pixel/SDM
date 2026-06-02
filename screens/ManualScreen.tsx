import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Modal, SafeAreaView, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';

const GHOST_STARFISH_BG = require('../assets/images/ghost-starfish.png');

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: string;
  content: ContentBlock[];
}

type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] };

// ─── Контент мануала ──────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: 'compass-outline',
    content: [
      { type: 'paragraph', text: 'Seafarer Documents Manager (SDM) is a personal organiser for maritime professionals. It keeps all your certificates, sea service records, and personal details in one secure place on your device — no cloud, no account required.' },
      { type: 'heading', text: 'Navigation' },
      { type: 'list', items: [
        'Documents — certificate and document storage',
        'Sea Service — voyage log and sea time tracker',
        'Personal — personal and contact information',
        'CV — one-tap PDF résumé generation',
        'Settings — language, theme, backup, modules',
      ]},
      { type: 'heading', text: 'Optional modules (Settings → Modules)' },
      { type: 'list', items: [
        'DP Log — Dynamic Positioning hours tracker',
        'MPC — UK 12nm Midnight Position Check (auto-record)',
      ]},
      { type: 'tip', text: 'All data is stored locally on your device. Use Settings → Export Backup regularly to keep a copy.' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: 'documents-outline',
    content: [
      { type: 'paragraph', text: 'The Documents screen stores all your maritime certificates, passports, licences and other paperwork with expiry tracking.' },
      { type: 'heading', text: 'Adding a document' },
      { type: 'steps', items: [
        'Tap the + button (top right).',
        'Select a category from the chips: Passport, Seaman\'s Book, Diplomas, Medical Certificates, STCW Certificates, Offshore Certifications, National Endorsements, Other.',
        'Enter the document name (required).',
        'Enter document number, issue date, expiry date and place of issue.',
        'Tick "No expiry date" for permanent documents.',
        'Add notes in the Notes field if needed.',
        'Attach a PDF scan (up to 3 MB) using the paperclip button.',
        'Tap Save.',
      ]},
      { type: 'heading', text: 'Expiry badge colours' },
      { type: 'list', items: [
        'Red — expires in less than 60 days',
        'Yellow — expires in 60–90 days',
        'Green — more than 90 days remaining',
      ]},
      { type: 'heading', text: 'Search and filter' },
      { type: 'paragraph', text: 'Use the search bar to find documents by name, number or category. The category filter chips above the search bar narrow the list to one document type. The icon button toggles between grouping by type and sorting by expiry date.' },
      { type: 'heading', text: 'Editing and deleting' },
      { type: 'paragraph', text: 'Tap a card to view details. Use the pencil icon to edit or the bin icon to delete. Deleting a document also removes its attached PDF scan.' },
      { type: 'tip', text: 'Documents tab shows the count of documents in the tab bar badge.' },
      { type: 'warning', text: 'Free plan is limited to 5 documents. Upgrade to Unlimited for unrestricted storage.' },
    ],
  },
  {
    id: 'seaservice',
    title: 'Sea Service',
    icon: 'boat-outline',
    content: [
      { type: 'paragraph', text: 'The Sea Service screen is a voyage log that tracks every contract and automatically calculates your total sea time and STCW revalidation service.' },
      { type: 'heading', text: 'Adding a voyage' },
      { type: 'steps', items: [
        'Tap + (top right).',
        'Enter Vessel Name (required) and Position (required).',
        'Select Vessel Type from the list or type a custom value.',
        'Enter Flag, Gross Tonnage, Engine Type, Engine Power.',
        'Set Sign-On date. Leave Sign-Off blank if still on board.',
        'Enter Company name.',
        'Fill in DP Class and DP System if applicable.',
        'Add Comments for any additional details.',
        'Attach a PDF discharge book scan (up to 3 MB).',
        'Tap Save.',
      ]},
      { type: 'heading', text: 'Sea time calculation' },
      { type: 'paragraph', text: 'The header shows Total Days (all voyages) and Revalidation Service (months + days). Revalidation service counts only voyages with the R badge active (green). Tap the R badge on any card to toggle whether that voyage counts toward revalidation.' },
      { type: 'heading', text: 'Sorting' },
      { type: 'paragraph', text: 'Voyages are sorted with the most recent sign-off first. The active voyage (no sign-off date) always appears at the top.' },
      { type: 'tip', text: 'Tap the ⓘ icon next to the revalidation counter for an explanation of the STCW 12-month revalidation rule.' },
    ],
  },
  {
    id: 'cv',
    title: 'CV / PDF',
    icon: 'document-text-outline',
    content: [
      { type: 'paragraph', text: 'The CV screen generates a professional PDF résumé from your data with a single tap and shares it via the system share sheet.' },
      { type: 'heading', text: 'What is included' },
      { type: 'list', items: [
        'Full name, photo (if added), applied position',
        'Career preferences: desired vessel type, minimum day rate, availability date',
        'Personal details: date/place of birth, nationality',
        'Contact information: phone, email, WhatsApp, address, nearest airport',
        'Sea service table: vessel, position, type, sign-on / sign-off — sorted newest first',
        'Documents table: name, number, issue date, expiry date',
        'Education and language skills',
        'Next of Kin (basic info on free plan, full details on Unlimited)',
        'Notes (if "Include in CV" is enabled in the Notes screen)',
      ]},
      { type: 'heading', text: 'Generating the PDF' },
      { type: 'steps', items: [
        'Fill in your Personal Info, Sea Service, and Documents first.',
        'Open the CV tab.',
        'Tap "Generate & Share PDF".',
        'Choose where to send it: email, messenger, save to Files, etc.',
      ]},
      { type: 'tip', text: 'The date and time of the last generated CV is shown below the title.' },
      { type: 'warning', text: 'Free plan shows document names only (numbers and dates are hidden). Upgrade to Unlimited for the full CV.' },
    ],
  },
  {
    id: 'qr',
    title: 'QR Code',
    icon: 'qr-code-outline',
    content: [
      { type: 'paragraph', text: 'The QR screen generates a vCard QR code that anyone can scan with a smartphone camera to instantly save your contact details.' },
      { type: 'heading', text: 'What is encoded' },
      { type: 'list', items: [
        'Full name and applied position',
        'Mobile phone number',
        'Email address',
        'Telegram handle (with deep link to open Telegram)',
        'WhatsApp number (with deep link)',
        'Microsoft Teams handle',
      ]},
      { type: 'heading', text: 'Using the QR code' },
      { type: 'steps', items: [
        'Open the QR tab — the code generates automatically from your Personal Info.',
        'Show the screen to the other person.',
        'They scan it with the camera app.',
        'Contact is saved to their phone contacts instantly.',
      ]},
      { type: 'tip', text: 'The QR code does NOT include your home address — only contact and messenger details.' },
      { type: 'paragraph', text: 'The contact preview below the QR code shows exactly which fields will be shared.' },
    ],
  },
  {
    id: 'scans',
    title: 'Scans',
    icon: 'scan-outline',
    content: [
      { type: 'paragraph', text: 'The Scans screen is a single place that gathers every file stored in the app — PDF scans attached to Documents and Sea Service records, plus photos you capture with the camera. From here you can review, bundle and share, or delete them in bulk.' },
      { type: 'heading', text: 'What you see' },
      { type: 'paragraph', text: 'The header shows three counters: total files, currently selected, and the combined size of the selected files. Each row shows the file name, the document it belongs to, its size and the date it was added.' },
      { type: 'heading', text: 'Scan a document with the camera' },
      { type: 'steps', items: [
        'Tap the round + button (bottom right).',
        'Grant camera access the first time you are asked.',
        'Take a photo of the document.',
        'Crop away the excess on the editing screen and confirm.',
        'The app compresses the image and saves it as a compact PDF named SDM_scan_DDMMYYYY_HHMM.pdf.',
        'The new PDF appears at the top of the list automatically.',
      ]},
      { type: 'tip', text: 'The page size of the generated PDF matches the photo proportions, so the scan is always a single clean page (no black bar from a page break).' },
      { type: 'heading', text: 'Select, archive and share' },
      { type: 'steps', items: [
        'Tap a file (or its checkbox) to select it — selected rows glow cyan.',
        'Select as many files as you need.',
        'Tap "Archive & Send" to pack them into a single ZIP and open the system share sheet (email, messenger, Files, etc.).',
      ]},
      { type: 'heading', text: 'Deleting' },
      { type: 'paragraph', text: 'Select one or more files and tap Delete. This permanently removes the files from the device and detaches them from their document or sea service record. This action cannot be undone.' },
      { type: 'tip', text: 'Camera scans are kept together under a "Camera Scan" group, separate from document attachments, so they are easy to find.' },
    ],
  },
  {
    id: 'personal',
    title: 'Personal Info',
    icon: 'person-outline',
    content: [
      { type: 'paragraph', text: 'Personal Info is the foundation of your CV, QR code, and document header. The more you fill in, the richer your generated CV.' },
      { type: 'heading', text: 'Sections' },
      { type: 'list', items: [
        'Photo — tap to add from gallery or camera',
        'Full Name — first, middle, last name',
        'Date and Place of Birth',
        'Nationality',
        'Applied Position — shown prominently in the CV header',
        'Contact: phone, email, WhatsApp, Telegram, Teams',
        'Address, city, country, nearest airport',
        'Visa information: USA B1/B2, Schengen, Australia',
        'Career Preferences: desired vessel type, minimum day rate (with currency and negotiable flag), availability date',
      ]},
      { type: 'tip', text: 'Applied Position is used in the CV header and in the vCard QR code. Choose "Other" to type a custom rank.' },
      { type: 'heading', text: 'Biometrics' },
      { type: 'paragraph', text: 'A separate Biometrics section stores height, weight, shoe size, overall size, eye colour, hair colour and blood type. This section is stored separately and not included in the main CV PDF.' },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    icon: 'school-outline',
    content: [
      { type: 'paragraph', text: 'The Education screen stores your academic background and language skills. This information appears in the CV PDF.' },
      { type: 'heading', text: 'Fields' },
      { type: 'list', items: [
        'Educational Institution name',
        'Degree / qualification',
        'Specialisation',
        'Year of Graduation',
        'Languages spoken',
        'English level (e.g. B2, Upper-Intermediate)',
        'Additional skills (free text)',
      ]},
      { type: 'tip', text: 'The Additional Skills field is ideal for listing computer navigation systems, ECDIS types, or other technical competencies.' },
    ],
  },
  {
    id: 'nextofkin',
    title: 'Next of Kin',
    icon: 'people-outline',
    content: [
      { type: 'paragraph', text: 'Next of Kin stores your emergency contact information. It appears at the bottom of your generated CV.' },
      { type: 'heading', text: 'Fields' },
      { type: 'list', items: [
        'Name (required to include in CV)',
        'Relationship (spouse, parent, sibling, etc.)',
        'Phone number',
        'Email address',
        'Address',
      ]},
      { type: 'warning', text: 'Free plan shows only the name in the CV. Phone, email and address require Unlimited.' },
    ],
  },
  {
    id: 'notes',
    title: 'Notes',
    icon: 'create-outline',
    content: [
      { type: 'paragraph', text: 'Notes is a free-text field for anything that does not fit elsewhere: special endorsements, remarks for employers, medical notes, or personal reminders.' },
      { type: 'heading', text: 'Include in CV' },
      { type: 'paragraph', text: 'Toggle "Include Notes in CV" to append the notes section to the bottom of your generated PDF résumé. Useful for a cover letter paragraph or special remarks.' },
      { type: 'tip', text: 'Notes are plain text only. Line breaks are preserved in the PDF output.' },
    ],
  },
  {
    id: 'dp',
    title: 'DP Log',
    icon: 'navigate-outline',
    content: [
      { type: 'paragraph', text: 'DP Log is an optional module for Dynamic Positioning officers. Enable it in Settings → Modules → DP Log.' },
      { type: 'heading', text: 'What it does' },
      { type: 'paragraph', text: 'Tracks DP hours on vessels across 30-minute time slots (48 slots per day). Records are grouped by day. Total Active and Passive DP hours are calculated automatically.' },
      { type: 'heading', text: 'Setup' },
      { type: 'steps', items: [
        'Enable DP Log in Settings → Modules.',
        'Restart the app — the DP tab appears in the bottom navigation.',
        'On the DP screen, enter vessel name, IMO, GRT, DP class, contract dates.',
        'For each day, tap time slots to mark them as Active (blue) or Passive (grey).',
        'Export the month as a PDF DP Time record.',
      ]},
      { type: 'tip', text: 'DP Log is English-only in the current version.' },
    ],
  },
  {
    id: 'mpc',
    title: 'MPC',
    icon: 'flag-outline',
    content: [
      { type: 'paragraph', text: 'MPC (Midnight Position Check) is an optional module for seafarers working in UK waters. It automatically records your vessel\'s GPS coordinates at midnight London time and checks whether you are inside or outside the 12 nautical mile UK territorial waters zone.' },
      { type: 'heading', text: 'Why it matters' },
      { type: 'paragraph', text: 'UK seafarers may need to prove they were outside territorial waters at midnight on each day to avoid NI contribution liability. MPC automates this daily record.' },
      { type: 'heading', text: 'Enabling auto-record' },
      { type: 'steps', items: [
        'Enable MPC in Settings → Modules.',
        'Restart the app — the MPC tab appears.',
        'On the MPC screen, turn on the "Auto-record" toggle.',
        'Grant "Always" (background) location permission when prompted.',
        'The app will automatically record your midnight position every night.',
      ]},
      { type: 'heading', text: 'How auto-record works' },
      { type: 'paragraph', text: 'A background location task runs every ~10 minutes. At 23:55–00:05 London time it captures the most recent GPS fix, checks the UK 12nm zone polygon, and saves a record with status OUTSIDE or INSIDE. A silent notification confirms the save.' },
      { type: 'heading', text: 'Manual records' },
      { type: 'paragraph', text: 'Tap "+ Add Record" to enter a position manually. Use the GPS button to fill coordinates automatically. Tap a record to edit it.' },
      { type: 'heading', text: 'PDF export' },
      { type: 'paragraph', text: 'Select a month tab and tap "Export PDF" to generate a Midnight Position Check report with your name, rank, vessel name and the full month\'s records.' },
      { type: 'tip', text: 'GPS accuracy is Low (cell towers + Wi-Fi) for battery efficiency. This is sufficient for 12nm zone detection (~22 km margin).' },
      { type: 'warning', text: 'MPC is in Beta. Always verify records against vessel logs. Not for navigational use.' },
    ],
  },
  {
    id: 'backup',
    title: 'Backup & Restore',
    icon: 'cloud-outline',
    content: [
      { type: 'paragraph', text: 'All data is stored locally on your device. Use the backup feature to export and restore your data, or to transfer it to a new device.' },
      { type: 'heading', text: 'Exporting a backup' },
      { type: 'steps', items: [
        'Go to Settings → Data Management → Export Backup.',
        'The app creates a .sdm file with all your data.',
        'Share it to iCloud Drive, Google Drive, email, or any storage app.',
        'The file name includes a timestamp: seafarer_backup_YYYY-MM-DD.sdm',
      ]},
      { type: 'heading', text: 'Restoring a backup' },
      { type: 'steps', items: [
        'Go to Settings → Data Management → Import Backup.',
        'Select the .sdm file from your storage.',
        'All existing data will be replaced with the backup contents.',
        'A success message confirms the restore.',
      ]},
      { type: 'heading', text: 'Old .json backups' },
      { type: 'paragraph', text: 'Backups from older versions use .json format. SDM can still import them. After importing a .json backup, export a new .sdm backup for future use.' },
      { type: 'warning', text: 'Export and Import require an Unlimited subscription. The .sdm file is NOT encrypted — keep it safe and do not share it publicly.' },
      { type: 'heading', text: 'Clear all data' },
      { type: 'paragraph', text: 'Settings → Data Management → Clear All Data permanently deletes everything from the device. This cannot be undone. Export a backup first.' },
    ],
  },
  {
    id: 'subscription',
    title: 'Unlimited',
    icon: 'star-outline',
    content: [
      { type: 'paragraph', text: 'SDM has a free tier and an Unlimited plan. The free tier lets you explore the app with limited data.' },
      { type: 'heading', text: 'Free plan limits' },
      { type: 'list', items: [
        'Maximum 5 documents',
        'CV PDF shows document names only (numbers and dates hidden)',
        'Next of Kin: name only in CV',
        'No Export / Import backup',
      ]},
      { type: 'heading', text: 'Unlimited plan includes' },
      { type: 'list', items: [
        'Unlimited documents',
        'Full CV PDF with all document details',
        'Full Next of Kin details in CV',
        'Export and Import backup (.sdm)',
        'All future premium features',
      ]},
      { type: 'heading', text: 'Purchase options' },
      { type: 'list', items: [
        'Monthly subscription — auto-renews monthly',
        'Lifetime — one-time payment, never expires',
      ]},
      { type: 'heading', text: 'Restoring a purchase' },
      { type: 'paragraph', text: 'If you reinstall the app or switch devices, open Settings and your subscription is restored automatically when the app starts. If not, tap your subscription status — the app will refresh from the store.' },
      { type: 'tip', text: 'Lifetime is the best value if you plan to use the app long-term.' },
    ],
  },
];

// ─── Рендер блока контента ────────────────────────────────────────────────────

const ContentRenderer: React.FC<{ blocks: ContentBlock[]; isDark: boolean }> = ({ blocks, isDark }) => {
  const tc = {
    text:    isDark ? '#e8eaf6' : '#1a237e',
    sub:     isDark ? 'rgba(255,255,255,0.6)' : '#455a64',
    heading: isDark ? '#90caf9' : '#1565c0',
    tipBg:   isDark ? 'rgba(0,191,255,0.1)' : 'rgba(21,101,192,0.07)',
    tipBdr:  isDark ? '#00BFFF' : '#1565c0',
    warnBg:  isDark ? 'rgba(255,107,107,0.1)' : 'rgba(198,40,40,0.07)',
    warnBdr: '#c62828',
    bullet:  isDark ? '#90caf9' : '#1976d2',
  };

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <Text key={i} style={[s.para, { color: tc.sub }]}>{block.text}</Text>
            );
          case 'heading':
            return (
              <Text key={i} style={[s.heading, { color: tc.heading }]}>{block.text}</Text>
            );
          case 'tip':
            return (
              <View key={i} style={[s.callout, { backgroundColor: tc.tipBg, borderLeftColor: tc.tipBdr }]}>
                <Ionicons name="bulb-outline" size={15} color={tc.tipBdr} style={{ marginTop: 1 }} />
                <Text style={[s.calloutText, { color: isDark ? '#b3e5fc' : '#0d47a1' }]}>{block.text}</Text>
              </View>
            );
          case 'warning':
            return (
              <View key={i} style={[s.callout, { backgroundColor: tc.warnBg, borderLeftColor: tc.warnBdr }]}>
                <Ionicons name="warning-outline" size={15} color={tc.warnBdr} style={{ marginTop: 1 }} />
                <Text style={[s.calloutText, { color: isDark ? '#ffcdd2' : '#b71c1c' }]}>{block.text}</Text>
              </View>
            );
          case 'steps':
            return (
              <View key={i} style={s.listContainer}>
                {block.items.map((item, j) => (
                  <View key={j} style={s.stepRow}>
                    <View style={[s.stepNum, { backgroundColor: tc.bullet + '22', borderColor: tc.bullet }]}>
                      <Text style={[s.stepNumText, { color: tc.bullet }]}>{j + 1}</Text>
                    </View>
                    <Text style={[s.listText, { color: tc.sub }]}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          case 'list':
            return (
              <View key={i} style={s.listContainer}>
                {block.items.map((item, j) => (
                  <View key={j} style={s.bulletRow}>
                    <View style={[s.bullet, { backgroundColor: tc.bullet }]} />
                    <Text style={[s.listText, { color: tc.sub }]}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          default:
            return null;
        }
      })}
    </>
  );
};

// ─── Главный экран мануала ────────────────────────────────────────────────────

interface ManualScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ManualScreen: React.FC<ManualScreenProps> = ({ visible, onClose }) => {
  const { state } = useData();
  const isDark = state.theme === 'dark';
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const contentScrollRef = useRef<ScrollView>(null);
  const tocScrollRef = useRef<ScrollView>(null);

  const tc = {
    bg:      isDark ? '#0a1628' : '#f5f8ff',
    surface: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)',
    border:  isDark ? 'rgba(255,255,255,0.1)' : 'rgba(25,118,210,0.15)',
    text:    isDark ? '#e8eaf6' : '#1a237e',
    accent:  isDark ? '#90caf9' : '#1565c0',
    chipBg:  isDark ? 'rgba(144,202,249,0.15)' : 'rgba(21,101,192,0.1)',
    chipActive: isDark ? '#90caf9' : '#1565c0',
    chipActiveBg: isDark ? 'rgba(144,202,249,0.25)' : 'rgba(21,101,192,0.18)',
  };

  const current = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.container, { backgroundColor: tc.bg }]}>
        <Image
          source={GHOST_STARFISH_BG}
          style={[s.bgImage, { opacity: isDark ? 0.05 : 0.12, tintColor: isDark ? '#64b5f6' : '#2B7CC1' }]}
          resizeMode="cover"
        />

        {/* ── Header ── */}
        <View style={[s.header, { borderBottomColor: tc.border, backgroundColor: tc.bg }]}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={tc.accent} />
            <Text style={[s.backText, { color: tc.accent }]}>Settings</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: tc.text }]}>Manual</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* ── TOC chips ── */}
        <View style={[s.tocBar, { borderBottomColor: tc.border }]}>
          <ScrollView
            ref={tocScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tocContent}
          >
            {SECTIONS.map(sec => {
              const active = sec.id === activeSection;
              return (
                <TouchableOpacity
                  key={sec.id}
                  style={[
                    s.chip,
                    { borderColor: active ? tc.chipActive : tc.border,
                      backgroundColor: active ? tc.chipActiveBg : tc.chipBg },
                  ]}
                  onPress={() => handleSectionChange(sec.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={sec.icon as any}
                    size={13}
                    color={active ? tc.chipActive : (isDark ? 'rgba(255,255,255,0.5)' : '#546e7a')}
                  />
                  <Text style={[
                    s.chipText,
                    { color: active ? tc.chipActive : (isDark ? 'rgba(255,255,255,0.55)' : '#546e7a'),
                      fontWeight: active ? '700' : '500' },
                  ]}>
                    {sec.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Content ── */}
        <ScrollView
          ref={contentScrollRef}
          style={s.body}
          contentContainerStyle={s.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.sectionCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionIconBox, { backgroundColor: tc.chipActiveBg, borderColor: tc.chipActive }]}>
                <Ionicons name={current.icon as any} size={20} color={tc.chipActive} />
              </View>
              <Text style={[s.sectionTitle, { color: tc.text }]}>{current.title}</Text>
            </View>
            <ContentRenderer blocks={current.content} isDark={isDark} />
          </View>

          {/* Bottom pagination */}
          <View style={s.pagination}>
            {SECTIONS.findIndex(s => s.id === activeSection) > 0 && (
              <TouchableOpacity
                style={[s.pageBtn, { borderColor: tc.border, backgroundColor: tc.chipBg }]}
                onPress={() => {
                  const idx = SECTIONS.findIndex(s => s.id === activeSection);
                  handleSectionChange(SECTIONS[idx - 1].id);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color={tc.accent} />
                <Text style={[s.pageBtnText, { color: tc.accent }]}>
                  {SECTIONS[SECTIONS.findIndex(s => s.id === activeSection) - 1].title}
                </Text>
              </TouchableOpacity>
            )}
            {SECTIONS.findIndex(s => s.id === activeSection) < SECTIONS.length - 1 && (
              <TouchableOpacity
                style={[s.pageBtn, s.pageBtnRight, { borderColor: tc.border, backgroundColor: tc.chipBg }]}
                onPress={() => {
                  const idx = SECTIONS.findIndex(s => s.id === activeSection);
                  handleSectionChange(SECTIONS[idx + 1].id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.pageBtnText, { color: tc.accent }]}>
                  {SECTIONS[SECTIONS.findIndex(s => s.id === activeSection) + 1].title}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={tc.accent} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Стили ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1 },
  bgImage:      { position: 'absolute', width: '100%', height: '100%', zIndex: 0 },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, zIndex: 1 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, width: 80 },
  backText:     { fontSize: 16 },
  headerTitle:  { fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  tocBar:       { borderBottomWidth: 1, zIndex: 1 },
  tocContent:   { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:     { fontSize: 12 },

  body:         { flex: 1, zIndex: 1 },
  bodyContent:  { padding: 16, paddingTop: 12 },

  sectionCard:  { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIconBox:  { width: 40, height: 40, borderRadius: 10, borderWidth: 1,
                     alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700', flex: 1 },

  para:         { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  heading:      { fontSize: 13, fontWeight: '800', textTransform: 'uppercase',
                  letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },

  callout:      { flexDirection: 'row', gap: 8, borderLeftWidth: 3,
                  borderRadius: 8, padding: 12, marginBottom: 12, alignItems: 'flex-start' },
  calloutText:  { fontSize: 13, lineHeight: 20, flex: 1 },

  listContainer: { marginBottom: 12, gap: 8 },
  bulletRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet:       { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  stepRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum:      { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText:  { fontSize: 11, fontWeight: '800' },
  listText:     { fontSize: 14, lineHeight: 21, flex: 1 },

  pagination:   { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  pageBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flex: 1 },
  pageBtnRight: { justifyContent: 'flex-end' },
  pageBtnText:  { fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
