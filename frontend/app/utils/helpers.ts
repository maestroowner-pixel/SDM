export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  if (!expiryDate) return 999;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getExpiryStatus = (days: number): 'valid' | 'expiring' | 'expired' | 'critical' => {
  if (days < 0) return 'expired';
  if (days <= 30) return 'critical';
  if (days <= 90) return 'expiring';
  return 'valid';
};

export const getStatusColor = (status: 'valid' | 'expiring' | 'expired' | 'critical'): string => {
  switch (status) {
    case 'valid': return '#4CAF50';
    case 'expiring': return '#FFEB3B';
    case 'critical': return '#F44336';
    case 'expired': return '#9E9E9E';
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateForFilename = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

export const documentCategories = [
  { id: 'passport', name: 'Passports' },
  { id: 'seaman', name: "Seaman's Books" },
  { id: 'medical', name: 'Medical Certificates' },
  { id: 'stcw', name: 'STCW Certificates' },
  { id: 'offshore', name: 'Offshore Certificates' },
  { id: 'diploma', name: 'Diplomas & Licenses' },
];

export const vesselTypes = [
  'Bulk Carrier', 'Container Ship', 'Tanker', 'LNG Carrier', 'LPG Carrier',
  'Chemical Tanker', 'General Cargo', 'Ro-Ro', 'Passenger Ship', 'Cruise Ship',
  'Offshore Support Vessel', 'AHTS', 'PSV', 'DSV', 'Drill Ship', 'FPSO', 'Yacht'
];

export const positions = [
  'Master', 'Chief Officer', '2nd Officer', '3rd Officer', 'Deck Cadet',
  'Chief Engineer', '2nd Engineer', '3rd Engineer', '4th Engineer', 'Engine Cadet',
  'Electrician', 'ETO', 'Bosun', 'AB', 'OS', 'Motorman', 'Oiler', 'Wiper',
  'Chief Cook', 'Cook', 'Steward', 'Messman',
  'CO SDPO', 'SDPO', 'MASTER SDPO', '2O SDPO', '2O DPO'
];
