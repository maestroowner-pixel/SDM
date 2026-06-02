// src/screens/TestingScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '../contexts/DataContext';
import { useSubscription } from '../hooks/useSubscription';
import { useTablet } from '../hooks/useTablet'; // ← ДОБАВЛЕНО
import { SubscriptionService } from '../services/subscriptionService';

const GHOST_STARFISH_BG = require('../assets/images/ghost-starfish.png');

export const TestingScreen: React.FC = () => {
  const { state } = useData();
  // Убрали refreshStatus, чтобы не было ошибки undefined
  const { isPremium, subscriptionType, expirationDate } = useSubscription() as any;
  const isDark = state.theme === 'dark';
  const isTablet = useTablet(); // ← ДОБАВЛЕНО
  
  const [storageStatus, setStorageStatus] = useState({
    premium_status: '',
    premium_type: '',
    premium_expires: '',
  });

  useEffect(() => {
    loadStorageStatus();
  }, []);

  const loadStorageStatus = async () => {
    const status = await AsyncStorage.getItem('premium_status');
    const type = await AsyncStorage.getItem('premium_type');
    const expires = await AsyncStorage.getItem('premium_expires');
    
    setStorageStatus({
      premium_status: status || 'not set',
      premium_type: type || 'not set',
      premium_expires: expires || 'not set',
    });
  };

  // ФУНКЦИЯ ЛОКАЛЬНОЙ АКТИВАЦИИ (БЕЗ API КЛЮЧЕЙ)
  const forceActivate = async (type: string) => {
    try {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const expireStr = futureDate.toISOString();

      await AsyncStorage.setItem('premium_status', 'active');
      await AsyncStorage.setItem('premium_type', type);
      await AsyncStorage.setItem('premium_expires', expireStr);

      // Принудительно обновляем сервис, чтобы он подхватил кеш
      await (SubscriptionService as any).forceRefresh?.();
      
      await loadStorageStatus();
      Alert.alert("Ваша светлость!", `Премиум (${type}) активирован локально.`);
    } catch (e) {
      Alert.alert("Ошибка", "Система сопротивляется активации.");
    }
  };

  const resetToFree = async () => {
    await AsyncStorage.removeItem('premium_status');
    await AsyncStorage.removeItem('premium_type');
    await AsyncStorage.removeItem('premium_expires');
    await (SubscriptionService as any).forceRefresh?.();
    await loadStorageStatus();
    Alert.alert("Статус сброшен", "Вы снова обычный моряк.");
  };

  const checkStatus = async () => {
    await (SubscriptionService as any).forceRefresh?.();
    await loadStorageStatus();
    console.log('=== SUBSCRIPTION CHECK ===');
    console.log('Is Premium:', isPremium);
    console.log('Type:', subscriptionType);
    console.log('==========================');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Image source={GHOST_STARFISH_BG} style={styles.backgroundIcon} />
        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}>
          <View style={isTablet ? styles.centeredContent : undefined}>
          
          {/* СЕКЦИЯ СТАТУСА */}
          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Current Status</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, isDark ? styles.textMuted : styles.textMutedLight]}>Hook isPremium:</Text>
              <Text style={[styles.statusValue, { color: isPremium ? '#4CAF50' : '#F44336' }]}>
                {isPremium ? 'YES' : 'NO'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, isDark ? styles.textMuted : styles.textMutedLight]}>Storage Status:</Text>
              <Text style={[styles.statusValue, isDark ? styles.textLight : styles.textDark]}>{storageStatus.premium_status}</Text>
            </View>
          </View>

          {/* СЕКЦИЯ ТЕСТОВЫХ ПОКУПОК */}
          <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
            <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Local Bypass (No Keys)</Text>
            
            <TouchableOpacity style={styles.testButton} onPress={() => forceActivate('monthly')}>
              <View style={[styles.testButtonIcon, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="calendar" size={20} color="#fff" />
              </View>
              <Text style={[styles.testButtonText, isDark ? styles.textLight : styles.textDark]}>Activate Monthly</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={() => forceActivate('yearly')}>
              <View style={[styles.testButtonIcon, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="star" size={20} color="#fff" />
              </View>
              <Text style={[styles.testButtonText, isDark ? styles.textLight : styles.textDark]}>Activate Yearly</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={resetToFree}>
              <View style={[styles.testButtonIcon, { backgroundColor: '#F44336' }]}>
                <Ionicons name="trash" size={20} color="#fff" />
              </View>
              <Text style={[styles.testButtonText, isDark ? styles.textLight : styles.textDark]}>Reset All (Free Mode)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={checkStatus}>
            <Text style={styles.refreshButtonText}>Refresh & Log Status</Text>
          </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundIcon: { position: 'absolute', top: '20%', right: '-10%', width: 300, height: 300, opacity: 0.05, tintColor: '#2B7CC1' },
  scrollContent: { padding: 16, paddingTop: 20 },
  // ↓ НОВЫЕ СТИЛИ iPad
  scrollContentTablet: { alignItems: 'center' },
  centeredContent: { width: '100%', maxWidth: 560 },
  // ↑ КОНЕЦ НОВЫХ СТИЛЕЙ
  section: { borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionDark: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  sectionLight: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusLabel: { fontSize: 14 },
  statusValue: { fontSize: 14, fontWeight: '700' },
  testButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(150,150,150,0.2)' },
  testButtonIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  testButtonText: { fontSize: 15, fontWeight: '500' },
  refreshButton: { backgroundColor: '#1565C0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  refreshButtonText: { color: '#fff', fontWeight: '700' },
  textLight: { color: '#fff' },
  textDark: { color: '#1A3A5C' },
  textMuted: { color: 'rgba(255,255,255,0.6)' },
  textMutedLight: { color: 'rgba(0,0,0,0.5)' },
});