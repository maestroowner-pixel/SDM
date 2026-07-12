// Web replacement for expo-print + Sharing: render HTML in a hidden iframe and
// invoke the browser's print dialog (user can "Save as PDF").
//
// The suggested PDF filename comes from the document title. Browsers differ on
// whether they read the iframe's title or the top window's title when printing
// an iframe, so we set BOTH: the iframe <title> and (temporarily) the top-level
// document.title, restoring the latter afterwards. Pass fileName WITHOUT the
// ".pdf" extension — the browser appends it (matches the mobile app's
// `CV_<lastName>_<YYYYMMDD>.pdf`).
export const printHtml = (html: string, fileName?: string): void => {
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

  // Temporarily rename the top-level document so the print dialog suggests our
  // filename regardless of which title the browser uses.
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
