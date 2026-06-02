import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface CustomCalendarProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate: Date;
  isDark: boolean;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  visible,
  onClose,
  onSelect,
  selectedDate,
  isDark,
}) => {
  const { t, i18n } = useTranslation();
  
  // Палитра Вашей светлости
  const THEME = {
    oxford: isDark ? '#1A3A5F' : '#002147', 
    coffee: isDark ? '#4A90C4' : '#6F4E37', 
    background: isDark ? '#121212' : '#FFFFFF',
    surface: isDark ? '#1E1E1E' : '#F0F7FF',
    text: isDark ? '#FFFFFF' : '#002147',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,33,71,0.5)',
  };

  // ✅ ИСПРАВЛЕНИЕ: Проверка на валидность даты
  const safeDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
    ? selectedDate 
    : new Date();

  const [currentMonth, setCurrentMonth] = useState(new Date(safeDate));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentMonth(new Date(safeDate));
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, safeDate]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSelect = (date: Date) => {
    onSelect(date);
    handleClose();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  // ✅ ИСПРАВЛЕНИЕ: Функции навигации по месяцам (immutable)
  const previousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  // ✅ ИСПРАВЛЕНИЕ: Функция выбора года (immutable)
  const selectYear = (year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
    setShowYearPicker(false);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <Animated.View 
          style={[
            styles.calendarContainer,
            { backgroundColor: THEME.background, opacity: fadeAnim }
          ]}
          onStartShouldSetResponder={() => true}
        >
          
          <View style={[styles.header, { backgroundColor: THEME.oxford }]}>
            <TouchableOpacity onPress={() => setShowYearPicker(true)}>
              <Text style={styles.yearText}>{currentMonth.getFullYear()}</Text>
            </TouchableOpacity>
            <Text style={styles.selectedDateText}>
              {safeDate.toLocaleDateString(i18n.language, {
                weekday: 'short', day: 'numeric', month: 'short'
              })}
            </Text>
          </View>

          <View style={styles.monthNavigation}>
            {/* ✅ ИСПРАВЛЕНО: Используем функции вместо inline мутаций */}
            <TouchableOpacity onPress={previousMonth}>
              <Ionicons name="chevron-back" size={22} color={THEME.text} />
            </TouchableOpacity>
            <Text style={[styles.monthYearText, { color: THEME.text }]}>
              {currentMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={22} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysRow}>
            {(i18n.language === 'ru' ? ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day, i) => (
              <View key={i} style={styles.weekDayCell}>
                <Text style={[styles.weekDayText, { color: THEME.textMuted }]}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {getDaysInMonth(currentMonth).map((day, i) => {
              const isSelected = day && day.toDateString() === safeDate.toDateString();
              const isToday = day && day.toDateString() === new Date().toDateString();
              
              return (
                <TouchableOpacity 
                  key={i} 
                  style={styles.dayCell} 
                  onPress={() => day && handleSelect(day)} 
                  disabled={!day}
                >
                  {day && (
                    <View style={[
                      styles.dayButton, 
                      isSelected && { backgroundColor: THEME.coffee },
                      isToday && !isSelected && { borderWidth: 2, borderColor: THEME.coffee }
                    ]}>
                      <Text style={[styles.dayText, { color: isSelected ? '#FFF' : THEME.text }]}>
                        {day.getDate()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={[styles.buttonText, { color: THEME.textMuted }]}>
                {t('common.cancel', 'ОТМЕНА')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSelect(safeDate)}>
              <Text style={[styles.buttonText, { color: THEME.coffee }]}>
                {t('common.ok', 'OK')}
              </Text>
            </TouchableOpacity>
          </View>

          {showYearPicker && (
            <View style={styles.yearPickerOverlay}>
              <View style={[styles.yearPickerContainer, { backgroundColor: THEME.surface }]}>
                <View style={styles.yearPickerHeader}>
                  <Text style={[styles.yearPickerTitle, { color: THEME.text }]}>
                    {t('common.selectYear', 'Выберите год')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                    <Ionicons name="close" size={24} color={THEME.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
                  {Array.from({length: 100}, (_, i) => new Date().getFullYear() - 80 + i).map(year => (
                    <TouchableOpacity 
                      key={year} 
                      style={[
                        styles.yearItem,
                        year === currentMonth.getFullYear() && { backgroundColor: 'rgba(111, 78, 55, 0.1)' }
                      ]} 
                      onPress={() => selectYear(year)}
                    >
                      <Text style={[
                        styles.yearItemText, 
                        { color: year === currentMonth.getFullYear() ? THEME.coffee : THEME.text }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  calendarContainer: { 
    width: '85%', 
    borderRadius: 28, 
    overflow: 'hidden', 
    elevation: 20 
  },
  header: { 
    padding: 25 
  },
  yearText: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.6)', 
    fontWeight: '600' 
  },
  selectedDateText: { 
    fontSize: 28, 
    color: '#fff', 
    fontWeight: 'bold', 
    marginTop: 8 
  },
  monthNavigation: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20 
  },
  monthYearText: { 
    fontSize: 18, 
    fontWeight: '700', 
    textTransform: 'capitalize' 
  },
  weekDaysRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 15 
  },
  weekDayCell: { 
    flex: 1, 
    alignItems: 'center',
    paddingVertical: 8
  },
  weekDayText: { 
    fontSize: 13, 
    fontWeight: '700' 
  },
  daysGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    padding: 15 
  },
  dayCell: { 
    width: '14.28%', 
    aspectRatio: 1, 
    padding: 4 
  },
  dayButton: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 20 
  },
  dayText: { 
    fontSize: 15, 
    fontWeight: '500' 
  },
  actionButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    padding: 20, 
    gap: 30 
  },
  buttonText: { 
    fontSize: 15, 
    fontWeight: '800' 
  },
  yearPickerOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  yearPickerContainer: { 
    width: '70%', 
    maxHeight: '60%', 
    borderRadius: 20,
    overflow: 'hidden'
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  yearItem: { 
    padding: 15, 
    alignItems: 'center' 
  },
  yearItemText: { 
    fontSize: 18, 
    fontWeight: '600' 
  }
});