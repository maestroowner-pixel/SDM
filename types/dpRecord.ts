// types/dpRecord.ts
export interface DPTimeSlot {
  hour: number; // 0-23
  minutes: number; // 0 или 30
  checked: boolean;
}

export interface DPDayRecord {
  id: string;
  date: string; // ISO date string
  timeSlots: DPTimeSlot[];
  totalHours: number;
}

export interface DPLicenceInfo {
  licenceNumber: string;
  contractStartDate: string; // ISO date string
  contractEndDate: string; // ISO date string
}

export interface DPState {
  licenceInfo: DPLicenceInfo;
  dayRecords: DPDayRecord[];
}

// Функция для создания пустой записи дня
export const createEmptyDPDay = (date: string): DPDayRecord => {
  const timeSlots: DPTimeSlot[] = [];
  
  // Создаем 48 слотов (24 часа по 2 слота = полчаса)
  for (let hour = 0; hour < 24; hour++) {
    timeSlots.push({ hour, minutes: 0, checked: false });
    timeSlots.push({ hour, minutes: 30, checked: false });
  }
  
  return {
    id: Date.now().toString(),
    date,
    timeSlots,
    totalHours: 0,
  };
};

// Функция для подсчета часов в записи дня
export const calculateDayHours = (timeSlots: DPTimeSlot[]): number => {
  const checkedSlots = timeSlots.filter(slot => slot.checked).length;
  return checkedSlots * 0.5; // каждый слот = 30 минут = 0.5 часа
};

// Функция проверки валидности дня (минимум 2 часа)
export const isDayValid = (totalHours: number): boolean => {
  return totalHours >= 2;
};