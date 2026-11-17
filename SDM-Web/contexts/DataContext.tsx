import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSampleData } from '../utils/sampleData';

// Ленивый импорт NotificationService - загружается только когда нужен
let NotificationServiceModule: any = null;

const getNotificationService = async () => {
  if (!NotificationServiceModule) {
    try {
      const module = await import('../utils/NotificationService');
      
      // ИСПРАВЛЕНИЕ: Проверяем все возможные варианты экспорта
      // module.NotificationService - если именованный экспорт
      // module.default - если export default
      // module - если экспортировано через module.exports
      const service: any = module.NotificationService || (module as any).default || module;

      // .bind(service) critical: static methods use `this` internally
      NotificationServiceModule = {
        scheduleNotificationsForAllDocuments: service.scheduleNotificationsForAllDocuments?.bind(service) ?? (async () => {}),
        scheduleNotificationsForDocument: service.scheduleNotificationsForDocument?.bind(service) ?? (async () => {}),
        cancelAllNotifications: service.cancelAllNotifications?.bind(service) ?? (async () => {}),
        getScheduledNotifications: service.getScheduledNotifications?.bind(service) ?? (async () => []),
      };
    } catch (error) {
      console.log('NotificationService not available, using fallback:', error);
      NotificationServiceModule = {
        scheduleNotificationsForAllDocuments: async () => {},
        scheduleNotificationsForDocument: async () => {},
        cancelAllNotifications: async () => {},
        getScheduledNotifications: async () => [],
      };
    }
  }
  return NotificationServiceModule;
};

// ... интерфейсы остаются без изменений (Document, SeaService, PersonalInfo, и т.д.)
export interface Document {
  id: string;
  category: string;
  name: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  noExpiryDate: boolean;
  issuePlace: string;
  notes: string;
}

export interface SeaService {
  id: string;
  vesselName: string;
  vesselType: string;
  customVesselType?: string;
  flag: string;
  grossTonnage: string;
  engineType: string;
  enginePower: string;
  // Optional: records saved before these fields existed simply lack them.
  propulsionType?: string;
  sailingArea?: string;
  reeferPower?: string;
  teu?: string;
  // Crane operators: make/model, type (knuckle boom, AHC…) and SWL.
  craneMake?: string;
  craneType?: string;
  craneSwl?: string;
  position: string;
  customPosition?: string;
  signOn: string;
  signOff: string;
  company: string;
  dpClass: string;
  dpSystem: string;
  comments: string;
  countForRevalidation?: boolean;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  phone: string;
  // Extra mobile numbers; optional so older records/backups stay valid.
  mobilePhone2?: string;
  mobilePhone3?: string;
  email: string;
  whatsapp: string;
  telegram: string;
  teams: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  visaUSA: string;
  visaSchengen: string;
  visaAustralia: string;
  appliedPosition: string;
  customPosition: string;
  vesselType: string;
  customVesselType?: string;
  minDayRate: string;         
  minDayRateCurrency: string; 
  isRateNegotiable: boolean;  
  photo: string;
  nearestAirport: string;        
  availabilityDate: string;      
  lastCVGeneratedDate: string; 
}

export interface Biometrics {
  height: string;
  weight: string;
  shoeSize: string;
  overallSize: string;
  eyeColor: string;
  hairColor: string;
  bloodType: string;
}

export interface Education {
  institution: string;
  degree: string;
  specialization: string;
  graduationYear: string;
  additionalSkills: string;
  languages: string;
  englishLevel: string;
}

export interface NextOfKin {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

export interface AppState {
  documents: Document[];
  seaService: SeaService[];
  personal: PersonalInfo;
  biometrics: Biometrics;
  education: Education;
  nextOfKin: NextOfKin;
  includeNotesInCV: boolean;
  notes: string;
  theme: 'light' | 'dark';
  showDPScreen: boolean;
  showMPCScreen: boolean;
  dpInfo: DPScreenInfo;
  dpDays: DPDayRecord[];
  showCraneScreen: boolean;
  craneInfo: CraneLogInfo;
  craneDays: DPDayRecord[];  // same day grid as DP; slot 1 = crane operation
  // True while the records are still the example set seeded on first launch;
  // the first user edit clears it. Sync lets cloud data replace such records silently.
  sampleData?: boolean;
  // True from the first-launch seed until the user removes the example via the banner;
  // once false the example and the banner never come back.
  sampleSeeded?: boolean;
  // Optional sign-in invitation (SyncPrompt): armed when the example is removed,
  // due after the user's first own save, done once shown.
  syncPrompt?: 'afterFirstSave' | 'due' | 'done';
}

// ─── DP типы ─────────────────────────────────────────────────────────────────

export type DPSlotValue = 0 | 1 | 2; // 0=empty, 1=Active, 2=Passive

export interface DPDayRecord {
  id: string;   // = date yyyy-mm-dd
  date: string; // yyyy-mm-dd
  slots: DPSlotValue[]; // 48 элементов (каждые 30 мин)
}

export interface DPScreenInfo {
  company: string;
  fullName: string;
  dob: string;
  rank: string;
  vesselName: string;
  grt: string;
  imo: string;
  dpClass: string;
  contractStart: string;
  contractEnd: string;
  signatoryName: string;
  signatoryRank: string;
  companyContacts: string;
}

// Crane operator hours log: header of the log printed for the company to sign.
export interface CraneLogInfo {
  company: string;
  vesselName: string;
  imo: string;
  craneMake: string;
  craneType: string;
  craneSwl: string;
  contractStart: string;
  contractEnd: string;
  signatoryName: string;
  signatoryRank: string;
  companyContacts: string;
}

const defaultState: AppState = {
  documents: [],
  seaService: [],
  personal: {
    firstName: '', lastName: '', middleName: '', birthDate: '', birthPlace: '', nationality: '',
    phone: '', mobilePhone2: '', mobilePhone3: '', email: '', whatsapp: '', telegram: '', teams: '', address: '', city: '',
    country: '', postalCode: '', visaUSA: '', visaSchengen: '', visaAustralia: '',
    appliedPosition: '', customPosition: '', vesselType: '', customVesselType: '',
    minDayRate: '', minDayRateCurrency: '$', isRateNegotiable: false, photo: '',
    nearestAirport: '', availabilityDate: '', lastCVGeneratedDate: '',
  },
  biometrics: { height: '', weight: '', shoeSize: '', overallSize: '', eyeColor: '', hairColor: '', bloodType: '' },
  education: { institution: '', degree: '', specialization: '', graduationYear: '', additionalSkills: '', languages: '', englishLevel: '' },
  nextOfKin: { name: '', relationship: '', phone: '', email: '', address: '' },
  notes: '',
  includeNotesInCV: false,
  theme: 'dark',
  showDPScreen: false,
  showMPCScreen: false,
  dpDays: [],
  dpInfo: {
    company: '', fullName: '', dob: '', rank: '', vesselName: '', grt: '', imo: '', dpClass: '',
    contractStart: '', contractEnd: '',
    signatoryName: '', signatoryRank: '', companyContacts: '',
  },
  showCraneScreen: false,
  craneDays: [],
  craneInfo: {
    company: '', vesselName: '', imo: '', craneMake: '', craneType: '', craneSwl: '',
    contractStart: '', contractEnd: '', signatoryName: '', signatoryRank: '', companyContacts: '',
  },
};

interface DataContextType {
  state: AppState;
  updateDocuments: (docs: Document[]) => Promise<void>;
  addDocument: (doc: Document) => Promise<void>;
  updateDocument: (doc: Document) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateSeaService: (services: SeaService[]) => void;
  addSeaService: (service: SeaService) => void;
  updateSeaServiceItem: (service: SeaService) => void;
  deleteSeaService: (id: string) => void;
  updatePersonal: (personal: PersonalInfo) => void;
  updateBiometrics: (bio: Biometrics) => void;
  updateEducation: (edu: Education) => void;
  updateNextOfKin: (kin: NextOfKin) => void;
  updateNotes: (notes: string) => void;
  toggleIncludeNotesInCV: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleDPScreen: () => void;
  toggleMPCScreen: () => void;
  updateDPInfo: (info: DPScreenInfo) => void;
  updateDPDays: (days: DPDayRecord[]) => void;
  toggleCraneScreen: () => void;
  updateCraneInfo: (info: CraneLogInfo) => void;
  updateCraneDays: (days: DPDayRecord[]) => void;
  exportData: () => string;
  importData: (data: string) => Promise<boolean>;
  clearAllData: () => Promise<void>;
  removeSampleData: () => Promise<void>;
  dismissSyncPrompt: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (isLoaded) saveData(state); }, [state, isLoaded]);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem('seafarer_data');
      if (data) {
        const parsed = JSON.parse(data);
        setState({
          ...defaultState,
          ...parsed,
          personal: { ...defaultState.personal, ...parsed.personal },
          dpInfo:   { ...defaultState.dpInfo,   ...parsed.dpInfo },
          craneInfo: { ...defaultState.craneInfo, ...parsed.craneInfo },
          seaService: Array.isArray(parsed.seaService) ? parsed.seaService : [],
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        });
      } else {
        // First launch: start with an editable example instead of empty screens.
        setState({ ...defaultState, ...buildSampleData(), sampleData: true, sampleSeeded: true });
      }
    } catch (error) { console.error('Error loading data:', error); } finally { setIsLoaded(true); }
  };

  // FIX: принимаем currentState явно, чтобы не захватывать устаревшее замыкание
  const saveData = async (currentState: AppState) => {
    try { await AsyncStorage.setItem('seafarer_data', JSON.stringify(currentState)); } catch (error) { console.error('Error saving data:', error); }
  };

  // Any user edit turns the seeded example into the user's own data.
  const edit = (fn: (prev: AppState) => AppState) => setState(prev => {
    const next = fn(prev);
    return { ...next, sampleData: false, syncPrompt: prev.syncPrompt === 'afterFirstSave' ? 'due' : next.syncPrompt };
  });
  const dismissSyncPrompt = () => setState(prev => ({ ...prev, syncPrompt: 'done' }));

  const updateDocuments = async (docs: Document[]) => {
    edit(prev => ({ ...prev, documents: docs }));
    const service = await getNotificationService();
    await service.scheduleNotificationsForAllDocuments(docs);
  };
  
  const addDocument = async (doc: Document) => {
    const newDocs = [...state.documents, doc];
    edit(prev => ({ ...prev, documents: newDocs }));
    const service = await getNotificationService();
    await service.scheduleNotificationsForDocument(doc);
  };
  
  const updateDocument = async (doc: Document) => {
    const updatedDocs = state.documents.map(d => d.id === doc.id ? doc : d);
    edit(prev => ({ ...prev, documents: updatedDocs }));
    const service = await getNotificationService();
    await service.scheduleNotificationsForAllDocuments(updatedDocs);
  };
  
  const deleteDocument = async (id: string) => {
    const remainingDocs = state.documents.filter(d => d.id !== id);
    edit(prev => ({ ...prev, documents: remainingDocs }));
    const service = await getNotificationService();
    await service.scheduleNotificationsForAllDocuments(remainingDocs);
  };

  const updateSeaService = (services: SeaService[]) => edit(prev => ({ ...prev, seaService: services }));
  const addSeaService = (service: SeaService) => edit(prev => ({ ...prev, seaService: [...prev.seaService, service] }));
  const updateSeaServiceItem = (service: SeaService) => edit(prev => ({
    ...prev, seaService: prev.seaService.map(s => s.id === service.id ? service : s)
  }));
  const deleteSeaService = (id: string) => edit(prev => ({
    ...prev, seaService: prev.seaService.filter(s => s.id !== id)
  }));

  const updatePersonal = (personal: PersonalInfo) => edit(prev => ({ ...prev, personal }));
  const updateBiometrics = (bio: Biometrics) => edit(prev => ({ ...prev, biometrics: bio }));
  const updateEducation = (edu: Education) => edit(prev => ({ ...prev, education: edu }));
  const updateNextOfKin = (kin: NextOfKin) => edit(prev => ({ ...prev, nextOfKin: kin }));
  const updateNotes = (notes: string) => edit(prev => ({ ...prev, notes }));
  const toggleIncludeNotesInCV = () => edit(prev => ({ ...prev, includeNotesInCV: !prev.includeNotesInCV }));
  const setTheme = (theme: 'light' | 'dark') => setState(prev => ({ ...prev, theme }));
  const toggleDPScreen = () => edit(prev => ({ ...prev, showDPScreen: !prev.showDPScreen }));
  const toggleMPCScreen = () => edit(prev => ({ ...prev, showMPCScreen: !prev.showMPCScreen }));
  const updateDPInfo = (dpInfo: DPScreenInfo) => edit(prev => ({ ...prev, dpInfo }));
  const updateDPDays = (dpDays: DPDayRecord[]) => edit(prev => ({ ...prev, dpDays }));
  const toggleCraneScreen = () => edit(prev => ({ ...prev, showCraneScreen: !prev.showCraneScreen }));
  const updateCraneInfo = (craneInfo: CraneLogInfo) => edit(prev => ({ ...prev, craneInfo }));
  const updateCraneDays = (craneDays: DPDayRecord[]) => edit(prev => ({ ...prev, craneDays }));

  const exportData = () => JSON.stringify(state);

  const importData = async (data: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(data);
      setState({
        ...defaultState,
        ...parsed,
        personal: { ...defaultState.personal, ...parsed.personal },
        dpInfo:   { ...defaultState.dpInfo,   ...parsed.dpInfo },
          craneInfo: { ...defaultState.craneInfo, ...parsed.craneInfo },
      });
      if (parsed.documents && Array.isArray(parsed.documents)) {
        try {
          const service = await getNotificationService();
          await service.scheduleNotificationsForAllDocuments(parsed.documents);
        } catch (notifError) {
          console.warn('Notification scheduling failed during import:', notifError);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  };

  // Ends the first-launch example for good: records emptied, settings kept, banner gone.
  const removeSampleData = async () => {
    setState(prev => ({ ...defaultState, theme: prev.theme, showDPScreen: prev.showDPScreen, showCraneScreen: prev.showCraneScreen, showMPCScreen: prev.showMPCScreen, sampleSeeded: false, syncPrompt: 'afterFirstSave' }));
    await AsyncStorage.removeItem('cv_versions').catch(() => {});
    const service = await getNotificationService();
    await service.cancelAllNotifications();
  };

  const clearAllData = async () => {
    setState(defaultState);
    await AsyncStorage.multiRemove(['cv_versions', 'cv_design_config']).catch(() => {});
    const service = await getNotificationService();
    await service.cancelAllNotifications();
  };

  return (
    <DataContext.Provider value={{
      state, updateDocuments, addDocument, updateDocument, deleteDocument,
      updateSeaService, addSeaService, updateSeaServiceItem, deleteSeaService,
      updatePersonal, updateBiometrics, updateEducation, updateNextOfKin,
      updateNotes, toggleIncludeNotesInCV, setTheme,
      toggleDPScreen, updateDPInfo, updateDPDays,
      toggleCraneScreen, updateCraneInfo, updateCraneDays, toggleMPCScreen,
      exportData, importData, clearAllData, removeSampleData, dismissSyncPrompt,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};