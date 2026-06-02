// Общие утилиты для прикрепления PDF: съёмка камерой → компактный PDF,
// список уже созданных сканов и копирование их в папку записи.
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AttachedFile {
  fileName: string;
  uri: string;
  size: number;
  uploadDate: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const buildScanFileName = (prefix = 'SDM_scan'): string => {
  const d = new Date();
  return `${prefix}_${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.pdf`;
};

// Привести произвольное имя к безопасному имени PDF-файла.
export const ensurePdfName = (name: string): string => {
  const clean = name.replace(/\.pdf$/i, '').replace(/[\/\\:*?"<>|]/g, '').trim();
  return `${clean || 'Document'}.pdf`;
};

// Выбрать уникальный путь в destDir (если занят — префикс с таймстампом).
const uniqueDest = async (destDir: string, fileName: string): Promise<string> => {
  let dest = `${destDir}${fileName}`;
  if ((await FileSystem.getInfoAsync(dest)).exists) dest = `${destDir}${Date.now()}_${fileName}`;
  return dest;
};

export interface ScanImage { base64: string; width: number; height: number; }

// Снять один кадр камерой → кроп → сжатие. Возвращает данные изображения или null (отмена).
// Бросает 'camera-permission-denied', если нет доступа.
export const captureScanImage = async (): Promise<ScanImage | null> => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('camera-permission-denied');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.length) return null;

  const c = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { base64: c.base64 as string, width: c.width || 1500, height: c.height || 2000 };
};

// Собрать PDF из массива изображений и сохранить в destDir.
// 1 изображение → страница ровно по пропорциям фото (без пустой страницы).
// 2+ → A4-страницы, каждое фото по центру (вписано), последняя без page-break (нет хвостовой пустой).
export const buildPdfFromImages = async (
  destDir: string,
  images: ScanImage[],
  fileName?: string
): Promise<AttachedFile | null> => {
  if (!images.length) return null;

  let pageW: number, pageH: number, html: string;
  if (images.length === 1) {
    const im = images[0];
    pageW = 595;
    pageH = Math.max(1, Math.round((pageW * im.height) / im.width));
    // фиксированная .page + height:100% + overflow:hidden → перелива нет, ровно 1 страница
    html = `<html><head><meta charset="utf-8"/><style>@page{size:${pageW}pt ${pageH}pt;margin:0}html,body{margin:0;padding:0}.p{width:${pageW}pt;height:${pageH}pt;overflow:hidden}img{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><div class="p"><img src="data:image/jpeg;base64,${im.base64}"/></div></body></html>`;
  } else {
    pageW = 595; pageH = 842; // A4
    const pages = images
      .map((im, i) => `<div class="p" style="page-break-after:${i === images.length - 1 ? 'auto' : 'always'}"><img src="data:image/jpeg;base64,${im.base64}"/></div>`)
      .join('');
    html = `<html><head><meta charset="utf-8"/><style>@page{size:${pageW}pt ${pageH}pt;margin:0}html,body{margin:0;padding:0}.p{width:${pageW}pt;height:${pageH}pt;display:flex;align-items:center;justify-content:center;overflow:hidden}img{max-width:100%;max-height:100%;display:block}</style></head><body>${pages}</body></html>`;
  }

  const { uri: tmp } = await Print.printToFileAsync({ html, width: pageW, height: pageH, base64: false });

  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
  const name = fileName ? ensurePdfName(fileName) : buildScanFileName();
  const dest = await uniqueDest(destDir, name);
  await FileSystem.moveAsync({ from: tmp, to: dest });

  const info = await FileSystem.getInfoAsync(dest);
  return { fileName: dest.split('/').pop() as string, uri: dest, size: (info as any).size || 0, uploadDate: new Date().toISOString() };
};

// Снять один кадр и сразу сохранить одностраничным PDF (для прикрепления к записи).
export const captureScanToPdf = async (destDir: string, fileName?: string): Promise<AttachedFile | null> => {
  const img = await captureScanImage();
  if (!img) return null;
  return buildPdfFromImages(destDir, [img], fileName);
};

// Список уже созданных камерой сканов (корзина standalone_scans), только реально существующие файлы.
export const loadStandaloneScans = async (): Promise<AttachedFile[]> => {
  try {
    const stored = await AsyncStorage.getItem('document_attachments');
    if (!stored) return [];
    const att = JSON.parse(stored);
    const list: AttachedFile[] = att['standalone_scans'] || [];
    const out: AttachedFile[] = [];
    for (const f of list) {
      try {
        const info = await FileSystem.getInfoAsync(f.uri);
        if (info.exists) out.push(f);
      } catch {}
    }
    return out.reverse(); // новые сверху
  } catch {
    return [];
  }
};

// Скопировать существующий скан в папку записи (независимая копия, чтобы удаление записи не трогало оригинал).
// fileName — желаемое имя под запись; если не задано — сохраняется исходное имя скана.
export const copyScanInto = async (destDir: string, src: AttachedFile, fileName?: string): Promise<AttachedFile> => {
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
  const name = fileName ? ensurePdfName(fileName) : src.fileName;
  const dest = await uniqueDest(destDir, name);
  await FileSystem.copyAsync({ from: src.uri, to: dest });
  const info = await FileSystem.getInfoAsync(dest);
  return {
    fileName: dest.split('/').pop() as string,
    uri: dest,
    size: (info as any).size || src.size || 0,
    uploadDate: new Date().toISOString(),
  };
};
