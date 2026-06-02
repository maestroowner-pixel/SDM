import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import { loadSavedLanguage, saveLanguage } from '../utils/i18n';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (languageCode: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const saved = await loadSavedLanguage();
      setCurrentLanguage(saved);
    };
    init();
  }, []);

  const changeLanguage = async (languageCode: string) => {
    await saveLanguage(languageCode);
    setCurrentLanguage(languageCode);
  };

  // Научный факт: чтобы жесты не пропадали, навигатор должен видеть View
  if (currentLanguage === null) {
    return <View style={{ flex: 1, backgroundColor: '#0a1628' }} />;
  }

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};