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

// Downscale/recompress limits for uploaded photos. Same numbers as the native
// app (captureScanImage), so a scan weighs roughly the same on both platforms:
// a 6 MB phone photo lands at ~150-300 KB while staying readable.
const MAX_SIDE = 1500;
const JPEG_QUALITY = 0.5;

// Read an uploaded image File/Blob into a ScanImage: downscaled to MAX_SIDE on
// the longest side and re-encoded as JPEG (the source may be a huge PNG/HEIC-
// converted photo, and embedding it as-is produces multi-megabyte PDFs).
export const readImageFile = (file: Blob): Promise<ScanImage> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const srcW = img.naturalWidth || 1500;
        const srcH = img.naturalHeight || 2000;
        const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
        const width = Math.max(1, Math.round(srcW * scale));
        const height = Math.max(1, Math.round(srcH * scale));
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no-2d-context');
          ctx.fillStyle = '#ffffff'; // transparent PNG/WebP pixels go black in JPEG otherwise
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const jpeg = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve({ base64: jpeg.split(',')[1] || '', width, height });
        } catch {
          // Canvas unavailable/tainted → fall back to the original bytes.
          resolve({ base64: dataUrl.split(',')[1] || '', width: srcW, height: srcH });
        }
      };
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
    doc = new jsPDF({ unit: 'pt', format: [w, h], compress: true });
    doc.addImage(`data:image/jpeg;base64,${images[0].base64}`, 'JPEG', 0, 0, w, h);
  } else {
    doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
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

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i;

export const isImageUpload = (fileName?: string, mimeType?: string): boolean =>
  (mimeType || '').startsWith('image/') || IMAGE_EXT.test(fileName || '');

// Attach an uploaded file to a record: images are downscaled and wrapped into a
// compact single-page PDF (so every attachment is a PDF, like on mobile);
// anything else (PDF, …) is stored untouched.
export const storeUploadedAttachment = async (
  blob: Blob,
  fileName: string,
  size?: number,
  mimeType?: string
): Promise<AttachedFile> => {
  if (isImageUpload(fileName, mimeType)) {
    const image = await readImageFile(blob);
    // photo.jpg → photo.pdf (not photo.jpg.pdf)
    const pdf = await buildPdfFromImages('', [image], ensurePdfName(fileName.replace(IMAGE_EXT, '')));
    if (pdf) return pdf;
  }
  return storeUploadedFile(blob, fileName, size);
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
