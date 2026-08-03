// Web replacement for expo-print + Sharing.
//
// Браузер: HTML рендерится в скрытом iframe и печатается через window.print() —
// пользователь сам выбирает «Сохранить как PDF» или принтер.
//
// Десктоп (Electron): тот же приём не работает. window.print() уходит в webContents
// верхнего фрейма, то есть печатается интерфейс приложения, а не документ в iframe.
// Поэтому там документ отдаётся главному процессу, и он рендерит его в отдельном
// скрытом окне — либо в PDF через диалог сохранения, либо в системный диалог печати.
import { alertMsg, chooseAsync } from './webAlert';
import { t } from './i18n';

interface DesktopPrinter {
  savePdf: (html: string, fileName?: string) => Promise<{ saved: boolean; path?: string }>;
  toPrinter: (html: string) => Promise<{ printed: boolean; reason?: string }>;
}

const desktopPrinter = (): DesktopPrinter | null =>
  (typeof window !== 'undefined' && (window as any).sdmDesktop?.printer) || null;

/**
 * Печать или сохранение документа. Имя файла передаётся БЕЗ расширения ".pdf" —
 * его добавляет получатель (браузер или диалог сохранения), как в мобильном
 * приложении: `CV_<lastName>_<YYYYMMDD>.pdf`.
 */
export const printHtml = (html: string, fileName?: string): void => {
  const printer = desktopPrinter();
  if (printer) {
    void printViaDesktop(printer, html, fileName);
    return;
  }
  printViaIframe(html, fileName);
};

// ── Десктоп ──────────────────────────────────────────────────────────────────

const printViaDesktop = async (
  printer: DesktopPrinter,
  html: string,
  fileName?: string
): Promise<void> => {
  const choice = await chooseAsync(t('print.title'), t('print.message'), [
    { text: t('common.cancel'), value: 'cancel', style: 'ghost' },
    { text: t('print.toPrinter'), value: 'printer' },
    { text: t('print.savePdf'), value: 'pdf', style: 'primary' },
  ]);

  try {
    if (choice === 'pdf') {
      const res = await printer.savePdf(html, fileName);
      if (res.saved && res.path) alertMsg(t('print.saved'), res.path);
    } else if (choice === 'printer') {
      const res = await printer.toPrinter(html);
      // Отмена в системном диалоге тоже приходит как printed:false — про неё молчим.
      if (!res.printed && res.reason && !/cancell?ed/i.test(res.reason)) {
        alertMsg(t('common.error'), res.reason);
      }
    }
  } catch (e) {
    console.error('print failed', e);
    alertMsg(t('common.error'), (e as Error)?.message || String(e));
  }
};

// ── Браузер ──────────────────────────────────────────────────────────────────

// Имя PDF по умолчанию браузер берёт из заголовка документа, но одни читают title
// самого iframe, другие — верхнего окна. Ставим оба, верхний потом возвращаем.
const printViaIframe = (html: string, fileName?: string): void => {
  if (typeof document === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  const titledHtml = fileName
    ? html.replace(/<head>/i, `<head><title>${fileName}</title>`)
    : html;

  doc.open();
  doc.write(titledHtml);
  doc.close();

  const originalTitle = document.title;
  if (fileName) document.title = fileName;

  const win = iframe.contentWindow as Window;
  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    if (fileName) document.title = originalTitle;
    setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 500);
  };
  win.onafterprint = cleanup;

  // Give images (photo, QR data-URLs) a moment to lay out before printing.
  setTimeout(() => {
    try { win.focus(); win.print(); } catch (e) { console.error('print failed', e); }
    // Fallback cleanup in case onafterprint never fires (some browsers).
    setTimeout(cleanup, 60000);
  }, 400);
};
