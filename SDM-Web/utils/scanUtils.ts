// Web version of scanUtils. Same public shape as the native module, but there is
// no filesystem or camera: attachments are uploaded files stored as Blobs in
// IndexedDB (see attachmentStore). AttachedFile.uri holds an "idb://<id>" ref.
import { jsPDF } from 'jspdf';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { putBlob, cloneBlob, getBlob } from './attachmentStore';

export interface AttachedFile {
  fileName: string;
  uri: string;      // "idb://<id>"
  size: number;
  uploadDate: string;
}

export interface ScanImage { base64: string; width: number; height: number; }

// Kept for signature compatibility; unused on web.
export type CropFn = (uri: string, width: number, height: number) => Promise<string | null>;

const pad = (n: number) => String(n).padStart(2, '0');

export const buildScanFileName = (prefix = 'SDM_scan'): string => {
  const d = new Date();
  return `${prefix}_${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.pdf`;
};

export const ensurePdfName = (name: string): string => {
  const clean = name.replace(/\.pdf$/i, '').replace(/[\/\\:*?"<>|]/g, '').trim();
  return `${clean || 'Document'}.pdf`;
};

// Camera capture is not available on laptops → everything is attached via upload.
export const captureScanImage = async (_crop?: CropFn): Promise<ScanImage | null> => {
  throw new Error('camera-not-supported');
};
export const captureScanToPdf = async (): Promise<AttachedFile | null> => {
  throw new Error('camera-not-supported');
};

// Read an uploaded image File/Blob into a ScanImage (base64 + natural size).
export const readImageFile = (file: Blob): Promise<ScanImage> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      const img = new Image();
      img.onload = () => resolve({ base64, width: img.naturalWidth || 1500, height: img.naturalHeight || 2000 });
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Build a PDF from images (single → page fit to image; multi → A4 pages, centered).
export const buildPdfFromImages = async (
  _destDir: string,
  images: ScanImage[],
  fileName?: string
): Promise<AttachedFile | null> => {
  if (!images.length) return null;
  const single = images.length === 1;
  let doc: jsPDF;

  if (single) {
    const w = 595;
    const h = Math.max(1, Math.round((w * images[0].height) / images[0].width));
    doc = new jsPDF({ unit: 'pt', format: [w, h] });
    doc.addImage(`data:image/jpeg;base64,${images[0].base64}`, 'JPEG', 0, 0, w, h);
  } else {
    doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    images.forEach((im, i) => {
      if (i > 0) doc.addPage();
      const scale = Math.min(pw / im.width, ph / im.height);
      const w = im.width * scale;
      const h = im.height * scale;
      doc.addImage(`data:image/jpeg;base64,${im.base64}`, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
    });
  }

  const blob = doc.output('blob');
  const uri = await putBlob(blob);
  const name = fileName ? ensurePdfName(fileName) : buildScanFileName();
  return { fileName: name, uri, size: blob.size, uploadDate: new Date().toISOString() };
};

// Store an uploaded file (any type) as an attachment.
export const storeUploadedFile = async (blob: Blob, fileName: string, size?: number): Promise<AttachedFile> => {
  const uri = await putBlob(blob);
  return { fileName, uri, size: size ?? blob.size, uploadDate: new Date().toISOString() };
};

// Standalone uploaded scans (the "attach from my files" pool).
export const loadStandaloneScans = async (): Promise<AttachedFile[]> => {
  try {
    const stored = await AsyncStorage.getItem('document_attachments');
    if (!stored) return [];
    const att = JSON.parse(stored);
    const list: AttachedFile[] = att['standalone_scans'] || [];
    const out: AttachedFile[] = [];
    for (const f of list) {
      if (await getBlob(f.uri)) out.push(f);
    }
    return out.reverse();
  } catch {
    return [];
  }
};

// Independent copy of a scan into a record (clone the blob so deleting one record
// doesn't affect the original).
export const copyScanInto = async (_destDir: string, src: AttachedFile, fileName?: string): Promise<AttachedFile> => {
  const uri = await cloneBlob(src.uri);
  return {
    fileName: fileName ? ensurePdfName(fileName) : src.fileName,
    uri,
    size: src.size || 0,
    uploadDate: new Date().toISOString(),
  };
};
