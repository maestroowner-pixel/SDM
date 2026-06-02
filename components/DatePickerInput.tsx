import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';

interface Props {
  label: string;
  value: string;
  onChange: (date: string) => void;
  isDark: boolean;
}

const SimpleDatePicker: React.FC<Props> = ({ label, value, onChange, isDark }) => {
  const [visible, setVisible] = useState(false);
  
  // Для внутренней навигации календаря
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const [decadeStart, setDecadeStart] = useState(Math.floor(initialDate.getFullYear() / 10) * 10);

  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

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
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = newDate.toISOString().split('T')[0];
    onChange(formatted);
    setVisible(false); // Закрываем окно после выбора
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark ? {color: '#94a3b8'} : {color: '#666'}]}>{label}</Text>
      
      {/* Поле, на которое нажимает Ваша светлость */}
      <TouchableOpacity 
        style={[styles.inputTrigger, isDark ? styles.inputDark : styles.inputLight]}
        onPress={() => setVisible(true)}
      >
        <Text style={{color: isDark ? '#fff' : '#333', fontSize: 16}}>
          {value ? new Date(value).toLocaleDateString() : ''}
        </Text>
      </TouchableOpacity>

      {/* Само всплывающее окно */}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setVisible(false)}
        >
          <View style={[styles.pickerBox, isDark ? styles.bgDark : styles.bgLight]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setDecadeStart(d => d - 10)} style={styles.navBtn}>
                <Text style={styles.navText}>&lt;</Text>
              </TouchableOpacity>
              <Text style={styles.decadeTitle}>{decadeStart} — {decadeStart + 9}</Text>
              <TouchableOpacity onPress={() => setDecadeStart(d => d + 10)} style={styles.navBtn}>
                <Text style={styles.navText}>&gt;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.yearsGrid}>
              {Array.from({ length: 10 }).map((_, i) => {
                const year = decadeStart + i;
                return (
                  <TouchableOpacity 
                    key={year} 
                    onPress={() => setViewDate(new Date(viewDate.setFullYear(year)))}
                    style={[styles.yearItem, viewDate.getFullYear() === year && styles.activeBtn]}
                  >
                    <Text style={styles.itemText}>{year}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.monthsGrid}>
              {months.map((m, i) => (
                <TouchableOpacity 
                  key={m} 
                  onPress={() => setViewDate(new Date(viewDate.setMonth(i)))}
                  style={[styles.monthItem, viewDate.getMonth() === i && styles.activeBtn]}
                >
                  <Text style={styles.itemText}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((d, i) => (
                <TouchableOpacity 
                  key={i} 
                  disabled={d === null}
                  onPress={() => d && handleSelectDay(d)}
                  style={[styles.dayItem, d && value === new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toISOString().split('T')[0] && styles.activeBtn]}
                >
                  <Text style={{color: d ? '#fff' : 'transparent'}}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 15 },
  label: { fontSize: 13, marginBottom: 8 },
  inputTrigger: { borderRadius: 12, padding: 14, borderWidth: 1, height: 60, justifyContent: 'center' },
  inputDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  inputLight: { backgroundColor: '#f9f9f9', borderColor: 'rgba(0,0,0,0.1)' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { width: Dimensions.get('window').width - 40, borderRadius: 20, padding: 20, elevation: 5 },
  bgDark: { backgroundColor: '#242c48' },
  bgLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  decadeTitle: { color: '#3498db', fontWeight: 'bold', fontSize: 18 },
  navBtn: { backgroundColor: '#3e4868', paddingHorizontal: 12, borderRadius: 5 },
  navText: { color: 'white', fontSize: 20 },
  
  yearsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  yearItem: { width: '18%', paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#3e4868', paddingVertical: 10, marginBottom: 10 },
  monthItem: { width: '23%', paddingVertical: 8, alignItems: 'center' },
  
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayItem: { width: `${100 / 7}%`, paddingVertical: 8, alignItems: 'center', borderRadius: 5 },
  activeBtn: { backgroundColor: '#3498db' },
  itemText: { color: '#fff', fontSize: 12 }
});

export default SimpleDatePicker;