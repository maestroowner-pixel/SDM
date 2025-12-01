import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Document {
  id: string;
  category: string;
  name: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuePlace: string;
  notes: string;
}

export interface SeaService {
  id: string;
  vesselName: string;
  vesselType: string;
  flag: string;
  grossTonnage: string;
  engineType: string;
  enginePower: string;
  position: string;
  signOn: string;
  signOff: string;
  company: string;
  dpClass: string;
  dpSystem: string;
  comments: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  phone: string;
  email: string;
  whatsapp: string;
  telegram: string;
  meet: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  visaUSA: string;
  visaSchengen: string;
  visaAustralia: string;
  appliedPosition: string;
  vesselType: string;
  photo: string;
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
  notes: string;
  theme: 'light' | 'dark';
}

const defaultState: AppState = {
  documents: [],
  seaService: [],
  personal: {
    firstName: '',
    lastName: '',
    middleName: '',
    birthDate: '',
    birthPlace: '',
    nationality: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    visaUSA: '',
    visaSchengen: '',
    visaAustralia: '',
    appliedPosition: '',
    vesselType: '',
    photo: '',
  },
  biometrics: {
    height: '',
    weight: '',
    shoeSize: '',
    overallSize: '',
    eyeColor: '',
    hairColor: '',
    bloodType: '',
  },
  education: {
    institution: '',
    degree: '',
    specialization: '',
    graduationYear: '',
    additionalSkills: '',
    languages: '',
  },
  nextOfKin: {
    name: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
  },
  notes: '',
  theme: 'dark',
};

interface DataContextType {
  state: AppState;
  updateDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  updateSeaService: (services: SeaService[]) => void;
  addSeaService: (service: SeaService) => void;
  updateSeaServiceItem: (service: SeaService) => void;
  deleteSeaService: (id: string) => void;
  updatePersonal: (personal: PersonalInfo) => void;
  updateBiometrics: (bio: Biometrics) => void;
  updateEducation: (edu: Education) => void;
  updateNextOfKin: (kin: NextOfKin) => void;
  updateNotes: (notes: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  exportData: () => string;
  importData: (data: string) => boolean;
  clearAllData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveData();
    }
  }, [state, isLoaded]);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem('seafarer_data');
      if (data) {
        const parsed = JSON.parse(data);
        setState({ ...defaultState, ...parsed });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('seafarer_data', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const updateDocuments = (docs: Document[]) => setState(prev => ({ ...prev, documents: docs }));
  
  const addDocument = (doc: Document) => setState(prev => ({ ...prev, documents: [...prev.documents, doc] }));
  
  const updateDocument = (doc: Document) => setState(prev => ({
    ...prev,
    documents: prev.documents.map(d => d.id === doc.id ? doc : d)
  }));
  
  const deleteDocument = (id: string) => setState(prev => ({
    ...prev,
    documents: prev.documents.filter(d => d.id !== id)
  }));

  const updateSeaService = (services: SeaService[]) => setState(prev => ({ ...prev, seaService: services }));
  
  const addSeaService = (service: SeaService) => setState(prev => ({ ...prev, seaService: [...prev.seaService, service] }));
  
  const updateSeaServiceItem = (service: SeaService) => setState(prev => ({
    ...prev,
    seaService: prev.seaService.map(s => s.id === service.id ? service : s)
  }));
  
  const deleteSeaService = (id: string) => setState(prev => ({
    ...prev,
    seaService: prev.seaService.filter(s => s.id !== id)
  }));

  const updatePersonal = (personal: PersonalInfo) => setState(prev => ({ ...prev, personal }));
  const updateBiometrics = (bio: Biometrics) => setState(prev => ({ ...prev, biometrics: bio }));
  const updateEducation = (edu: Education) => setState(prev => ({ ...prev, education: edu }));
  const updateNextOfKin = (kin: NextOfKin) => setState(prev => ({ ...prev, nextOfKin: kin }));
  const updateNotes = (notes: string) => setState(prev => ({ ...prev, notes }));
  const setTheme = (theme: 'light' | 'dark') => setState(prev => ({ ...prev, theme }));

  const exportData = () => JSON.stringify(state);

  const importData = (data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      setState({ ...defaultState, ...parsed });
      return true;
    } catch {
      return false;
    }
  };

  const clearAllData = () => {
    setState(defaultState);
  };

  return (
    <DataContext.Provider value={{
      state,
      updateDocuments,
      addDocument,
      updateDocument,
      deleteDocument,
      updateSeaService,
      addSeaService,
      updateSeaServiceItem,
      deleteSeaService,
      updatePersonal,
      updateBiometrics,
      updateEducation,
      updateNextOfKin,
      updateNotes,
      setTheme,
      exportData,
      importData,
      clearAllData,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
