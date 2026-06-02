import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Dimensions, 
  TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../utils/i18n';

interface Props {
  label: string;
  value: string;
  onChange: (date: string) => void;
  isDark: boolean;
  defaultYear?: number;
  disabled?: boolean;
}

const SimpleDatePicker: React.FC<Props> = ({ label, value, onChange, isDark, defaultYear, disabled }) => {
  const [visible, setVisible] = useState(false);

  // Правильное создание даты из ISO строки (без timezone проблем)
  const parseISODate = (isoString: string): Date => {
    const [year, month, day] = isoString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const initialDate = value ? parseISODate(value) : new Date();
  const startYear = value ? initialDate.getFullYear() : (defaultYear ?? initialDate.getFullYear());
  const [viewDate, setViewDate] = useState(value ? initialDate : new Date(startYear, 0, 1));
  const [decadeStart, setDecadeStart] = useState(Math.floor(startYear / 10) * 10);

  // Получаем локализованные названия месяцев
  const months = useMemo(() => {
    try {
      const translation = i18n.translations[i18n.locale];
      if (translation && Array.isArray(translation.months)) {
        return translation.months;
      }
    } catch (e) {
      console.log('Failed to load months translation:', e);
    }
    // Fallback на английский
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [i18n.locale]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const res = [];
    for (let i = 0; i < offset; i++) res.push(null);
    for (let d = 1; d <= daysInMonth; d++) res.push(d);
    return res;
  }, [viewDate]);

  const handleSelectDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // Форматируем дату в ISO формат без timezone проблем
    const yearStr = year.toString();
    const monthStr = (month + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const isoDate = `${yearStr}-${monthStr}-${dayStr}`;
    
    onChange(isoDate);
    setVisible(false);
  };

  // Форматируем отображаемую дату
  const formatDisplayDate = (isoString: string): string => {
    if (!isoString) return ' ';
    const date = parseISODate(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  return (
    <>
      <Text style={[styles.label, isDark ? styles.textMuted : styles.textMutedLight]}>{label}</Text>
      
      <TouchableOpacity 
        style={[styles.inputTrigger, isDark ? styles.inputDark : styles.inputLight]}
        disabled={disabled}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, isDark ? styles.textLight : styles.textDark]}>
          {formatDisplayDate(value)}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerBox, isDark ? styles.bgDark : styles.bgLight]}>
                
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => setDecadeStart(d => d - 10)} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>{decadeStart} — {decadeStart + 9}</Text>
                  <TouchableOpacity onPress={() => setDecadeStart(d => d + 10)} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.yearsGrid}>
                  {Array.from({ length: 10 }).map((_, i) => {
                    const year = decadeStart + i;
                    const isActive = viewDate.getFullYear() === year;
                    return (
                      <TouchableOpacity 
                        key={year} 
                        onPress={() => {
                          const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
                          newDate.setFullYear(year);
                          setViewDate(newDate);
                        }}
                        style={[styles.yearItem, isActive && styles.activeBtn]}
                      >
                        <Text style={[styles.itemText, isActive && styles.activeText]}>{year}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.monthsGrid}>
                  {months.map((m: string, i: number) => {
                    const isActive = viewDate.getMonth() === i;
                    return (
                      <TouchableOpacity 
                        key={m} 
                        onPress={() => {
                          const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
                          newDate.setMonth(i);
                          setViewDate(newDate);
                        }}
                        style={[styles.monthItem, isActive && styles.activeBtn]}
                      >
                        <Text style={[styles.itemText, isActive && styles.activeText]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.daysGrid}>
                  {days.map((d, i) => {
                    const isSelected = d && value && (() => {
                      const selectedDate = parseISODate(value);
                      return selectedDate.getFullYear() === viewDate.getFullYear() &&
                             selectedDate.getMonth() === viewDate.getMonth() &&
                             selectedDate.getDate() === d;
                    })();
                    
                    return (
                      <TouchableOpacity 
                        key={i} 
                        disabled={d === null}
                        onPress={() => d && handleSelectDay(d)}
                        style={[styles.dayItem, isSelected && styles.activeBtn] as any}
                      >
                        <Text style={[styles.dayText, { color: d ? (isDark ? '#fff' : '#333') : 'transparent' }, isSelected && styles.activeText] as any}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 6, marginTop: 6 },
  textMuted: { color: 'rgba(255, 255, 255, 0.6)' },
  textMutedLight: { color: 'rgba(0, 0, 0, 0.5)' },
  textLight: { color: '#fff' },
  textDark: { color: '#333' },

  inputTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderRadius: 12, 
    padding: 14, 
    borderWidth: 1,
    minHeight: 52,
  },
  inputDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  inputLight: { backgroundColor: '#f9f9f9', borderColor: 'rgba(0,0,0,0.1)' },
  triggerText: { fontSize: 16 },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  pickerBox: { 
    width: Dimensions.get('window').width - 40, 
    borderRadius: 24, 
    padding: 20, 
    backgroundColor: '#242c48',
  },
  bgDark: { backgroundColor: '#1a2a4a' },
  bgLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#3498db', fontWeight: 'bold', fontSize: 20 },
  navBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 10 },
  
  yearsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  yearItem: { width: '18%', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  
  monthsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    borderTopWidth: 1, 
    borderBottomWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    paddingVertical: 15, 
    marginBottom: 15 
  },
  monthItem: { width: '23%', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayItem: { width: `${100 / 7}%`, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  dayText: { fontSize: 15 },
  
  itemText: { color: '#64b5f6', fontSize: 14 },
  activeBtn: { backgroundColor: '#3498db' },
  activeText: { color: '#fff', fontWeight: 'bold' },
});

export default SimpleDatePicker;