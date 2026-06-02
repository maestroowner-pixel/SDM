// database/seaServiceDb.ts
import * as SQLite from 'expo-sqlite';

export interface SeaService {
  id: number;
  vessel_name: string;
  vessel_type?: string;
  flag?: string;
  rank: string;
  sign_on_date: string;
  sign_off_date: string;
  grt?: number;
  power?: number;
  company?: string;
}

const db = SQLite.openDatabaseSync('seafarer.db');

// Инициализация таблицы
export const initSeaServiceTable = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sea_service (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_name TEXT NOT NULL,
      vessel_type TEXT,
      flag TEXT,
      rank TEXT NOT NULL,
      sign_on_date TEXT NOT NULL,
      sign_off_date TEXT NOT NULL,
      grt REAL,
      power REAL,
      company TEXT
    );
  `);
};

// Получить все записи
export const getSeaServices = (): SeaService[] => {
  const result = db.getAllSync<SeaService>(
    'SELECT * FROM sea_service ORDER BY sign_on_date DESC;'
  );
  return result;
};

// Добавить запись
export const addSeaService = (service: Omit<SeaService, 'id'>): void => {
  db.runSync(
    `INSERT INTO sea_service 
    (vessel_name, vessel_type, flag, rank, sign_on_date, sign_off_date, grt, power, company)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      service.vessel_name,
      service.vessel_type || null,
      service.flag || null,
      service.rank,
      service.sign_on_date,
      service.sign_off_date,
      service.grt || null,
      service.power || null,
      service.company || null,
    ]
  );
};

// Обновить запись
export const updateSeaService = (
  id: number,
  service: Partial<Omit<SeaService, 'id'>>
): void => {
  db.runSync(
    `UPDATE sea_service SET
    vessel_name = COALESCE(?, vessel_name),
    vessel_type = COALESCE(?, vessel_type),
    flag = COALESCE(?, flag),
    rank = COALESCE(?, rank),
    sign_on_date = COALESCE(?, sign_on_date),
    sign_off_date = COALESCE(?, sign_off_date),
    grt = COALESCE(?, grt),
    power = COALESCE(?, power),
    company = COALESCE(?, company)
    WHERE id = ?;`,
    [
      service.vessel_name || null,
      service.vessel_type || null,
      service.flag || null,
      service.rank || null,
      service.sign_on_date || null,
      service.sign_off_date || null,
      service.grt || null,
      service.power || null,
      service.company || null,
      id,
    ]
  );
};

// Удалить запись
export const deleteSeaService = (id: number): void => {
  db.runSync('DELETE FROM sea_service WHERE id = ?;', [id]);
};