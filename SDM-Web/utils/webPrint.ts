// Web replacement for expo-print + Sharing.
//
// HTML рендерится в скрытом iframe и печатается через window.print() —
// пользователь сам выбирает «Сохранить как PDF» или принтер.

/**
 * Печать или сохранение документа. Имя файла передаётся БЕЗ расширения ".pdf" —
 * его добавляет получатель (браузер или диалог сохранения), как в мобильном
 * приложении: `CV_<lastName>_<YYYYMMDD>.pdf`.
 */
export const printHtml = (html: string, fileName?: string): void => {
  printViaIframe(html, fileName);
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
